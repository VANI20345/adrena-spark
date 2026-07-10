-- system_alerts table
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL DEFAULT 'error' CHECK (severity IN ('info','warning','error','critical')),
  component text NOT NULL,
  message text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  reference_type text,
  reference_id uuid,
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_alerts_unack ON public.system_alerts (acknowledged, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_component ON public.system_alerts (component, created_at DESC);

ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admins_manage_alerts" ON public.system_alerts;
CREATE POLICY "super_admins_manage_alerts" ON public.system_alerts
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "admins_view_alerts" ON public.system_alerts;
CREATE POLICY "admins_view_alerts" ON public.system_alerts
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

-- raise_financial_alert RPC
CREATE OR REPLACE FUNCTION public.raise_financial_alert(
  p_component text,
  p_message text,
  p_context jsonb DEFAULT '{}'::jsonb,
  p_severity text DEFAULT 'error',
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_amount numeric DEFAULT NULL,
  p_payer_id uuid DEFAULT NULL,
  p_receiver_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert_id uuid;
BEGIN
  INSERT INTO public.system_alerts (severity, component, message, context, reference_type, reference_id)
  VALUES (COALESCE(p_severity,'error'), p_component, p_message, COALESCE(p_context,'{}'::jsonb), p_reference_type, p_reference_id)
  RETURNING id INTO v_alert_id;

  INSERT INTO public.system_logs (level, message, details)
  VALUES (COALESCE(p_severity,'error'), '[' || p_component || '] ' || p_message,
          jsonb_build_object('alert_id', v_alert_id, 'context', p_context,
                             'reference_type', p_reference_type, 'reference_id', p_reference_id));

  IF p_reference_id IS NOT NULL AND p_reference_type IS NOT NULL THEN
    BEGIN
      INSERT INTO public.financial_transaction_logs
        (transaction_type, amount, status, reference_type, reference_id, payer_id, receiver_id, metadata)
      VALUES ('rpc_failure', COALESCE(p_amount,0), 'failed', p_reference_type, p_reference_id,
              p_payer_id, p_receiver_id,
              jsonb_build_object('alert_id', v_alert_id, 'component', p_component, 'error', p_message, 'context', p_context));
    EXCEPTION WHEN OTHERS THEN
      NULL; -- never let logging itself fail the alert
    END;
  END IF;

  RETURN v_alert_id;
END;
$$;

-- Allow super admins to view system_logs (admins already have access)
DROP POLICY IF EXISTS "Super admins view system logs" ON public.system_logs;
CREATE POLICY "Super admins view system logs" ON public.system_logs
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));