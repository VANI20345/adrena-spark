
-- Enum لحالات الحجز
DO $$ BEGIN
  CREATE TYPE public.payment_hold_status AS ENUM ('held', 'released', 'refunded', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enum لمصدر الدفع
DO $$ BEGIN
  CREATE TYPE public.payment_hold_source AS ENUM ('event_booking', 'service_booking', 'subscription', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- جدول حجوزات الأموال (Escrow)
CREATE TABLE IF NOT EXISTS public.payment_holds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- مرجع متعدد الأنواع
  source_type public.payment_hold_source NOT NULL,
  source_id UUID NOT NULL,
  
  -- أطراف المعاملة
  provider_id UUID NOT NULL,
  payer_id UUID NOT NULL,
  
  -- التفاصيل المالية
  gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SAR',
  
  -- حالة الحجز
  status public.payment_hold_status NOT NULL DEFAULT 'held',
  
  -- التواريخ
  event_end_at TIMESTAMP WITH TIME ZONE,
  hold_until TIMESTAMP WITH TIME ZONE NOT NULL,
  released_at TIMESTAMP WITH TIME ZONE,
  released_by UUID,
  
  -- إدارة الشكاوى
  complaint_extension BOOLEAN NOT NULL DEFAULT false,
  complaint_reason TEXT,
  
  -- ملاحظات
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(source_type, source_id)
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_payment_holds_status ON public.payment_holds(status);
CREATE INDEX IF NOT EXISTS idx_payment_holds_provider ON public.payment_holds(provider_id);
CREATE INDEX IF NOT EXISTS idx_payment_holds_hold_until ON public.payment_holds(hold_until);
CREATE INDEX IF NOT EXISTS idx_payment_holds_source ON public.payment_holds(source_type, source_id);

-- Trigger لتحديث updated_at
DROP TRIGGER IF EXISTS update_payment_holds_updated_at ON public.payment_holds;
CREATE TRIGGER update_payment_holds_updated_at
  BEFORE UPDATE ON public.payment_holds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- تفعيل RLS
ALTER TABLE public.payment_holds ENABLE ROW LEVEL SECURITY;

-- السياسات
DROP POLICY IF EXISTS "Super admins can view all payment holds" ON public.payment_holds;
CREATE POLICY "Super admins can view all payment holds"
ON public.payment_holds FOR SELECT
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can insert payment holds" ON public.payment_holds;
CREATE POLICY "Super admins can insert payment holds"
ON public.payment_holds FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can update payment holds" ON public.payment_holds;
CREATE POLICY "Super admins can update payment holds"
ON public.payment_holds FOR UPDATE
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Providers can view their own holds" ON public.payment_holds;
CREATE POLICY "Providers can view their own holds"
ON public.payment_holds FOR SELECT
USING (auth.uid() = provider_id);

-- دالة الإحصائيات الشاملة
CREATE OR REPLACE FUNCTION public.get_payment_holds_summary()
RETURNS TABLE(
  total_held NUMERIC,
  total_released NUMERIC,
  total_refunded NUMERIC,
  count_held BIGINT,
  count_released BIGINT,
  count_with_complaints BIGINT,
  count_ready_to_release BIGINT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(net_amount) FILTER (WHERE status = 'held'), 0) AS total_held,
    COALESCE(SUM(net_amount) FILTER (WHERE status = 'released'), 0) AS total_released,
    COALESCE(SUM(net_amount) FILTER (WHERE status = 'refunded'), 0) AS total_refunded,
    COUNT(*) FILTER (WHERE status = 'held') AS count_held,
    COUNT(*) FILTER (WHERE status = 'released') AS count_released,
    COUNT(*) FILTER (WHERE status = 'held' AND complaint_extension = true) AS count_with_complaints,
    COUNT(*) FILTER (WHERE status = 'held' AND complaint_extension = false AND hold_until <= now()) AS count_ready_to_release
  FROM public.payment_holds
  WHERE public.is_super_admin(auth.uid());
$$;

-- دالة الإفراج اليدوي
CREATE OR REPLACE FUNCTION public.release_payment_hold(
  p_hold_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold RECORD;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_hold FROM public.payment_holds WHERE id = p_hold_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_hold.status <> 'held' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status', 'current_status', v_hold.status);
  END IF;

  UPDATE public.payment_holds
  SET status = 'released',
      released_at = now(),
      released_by = auth.uid(),
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE id = p_hold_id;

  RETURN jsonb_build_object('ok', true, 'hold_id', p_hold_id, 'released_at', now());
END;
$$;

-- دالة وضع علامة شكوى (لتمديد الحجز)
CREATE OR REPLACE FUNCTION public.flag_payment_hold_complaint(
  p_hold_id UUID,
  p_reason TEXT,
  p_extend_until TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  UPDATE public.payment_holds
  SET complaint_extension = true,
      complaint_reason = p_reason,
      hold_until = COALESCE(p_extend_until, hold_until + INTERVAL '7 days'),
      updated_at = now()
  WHERE id = p_hold_id AND status = 'held';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'hold_not_found_or_not_held');
  END IF;

  RETURN jsonb_build_object('ok', true, 'hold_id', p_hold_id);
END;
$$;
