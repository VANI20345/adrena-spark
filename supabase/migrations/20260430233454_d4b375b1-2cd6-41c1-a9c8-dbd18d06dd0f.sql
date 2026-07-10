
ALTER TYPE public.payment_hold_status ADD VALUE IF NOT EXISTS 'ready_for_release';
ALTER TYPE public.payment_hold_status ADD VALUE IF NOT EXISTS 'dispute_hold';
