-- Add RLS policies for pending events - only creator and admins can view
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;

CREATE POLICY "Public can view approved events"
ON events
FOR SELECT
USING (status = 'approved' OR status = 'active');

CREATE POLICY "Creators can view their own pending events"
ON events
FOR SELECT  
USING (auth.uid() = organizer_id);

CREATE POLICY "Admins can view all events"
ON events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add RLS policies for pending services - only creator and admins can view
CREATE POLICY "Public can view approved services"
ON services
FOR SELECT
USING (status = 'approved');

CREATE POLICY "Providers can view their own pending services"
ON services
FOR SELECT
USING (auth.uid() = provider_id);

CREATE POLICY "Admins can view all services"
ON services
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);