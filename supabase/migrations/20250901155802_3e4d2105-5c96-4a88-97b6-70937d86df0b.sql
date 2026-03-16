-- Add missing RLS policies for tables without policies

-- RLS Policies for payments table
CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = payments.booking_id 
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage payments" ON public.payments
  FOR ALL USING (true);

-- RLS Policies for event_groups table
CREATE POLICY "Event groups are viewable by event participants" ON public.event_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.event_id = event_groups.event_id 
      AND b.user_id = auth.uid()
      AND b.status = 'confirmed'
    ) OR
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = event_groups.event_id 
      AND events.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can manage event groups" ON public.event_groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = event_groups.event_id 
      AND events.organizer_id = auth.uid()
    )
  );

-- RLS Policies for service_requests table
CREATE POLICY "Service requests viewable by involved parties" ON public.service_requests
  FOR SELECT USING (
    auth.uid() = organizer_id OR auth.uid() = provider_id
  );

CREATE POLICY "Organizers can create service requests" ON public.service_requests
  FOR INSERT WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Providers can update service requests" ON public.service_requests
  FOR UPDATE USING (auth.uid() = provider_id);

-- RLS Policies for refunds table
CREATE POLICY "Users can view their own refunds" ON public.refunds
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create refund requests" ON public.refunds
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix function search paths
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'attendee');
  
  -- Create user wallet
  INSERT INTO public.user_wallets (user_id)
  VALUES (new.id);
  
  -- Create notification preferences
  INSERT INTO public.notification_preferences (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;