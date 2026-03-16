-- Add INSERT policy for notifications table to allow users to send notifications
CREATE POLICY "Users can create notifications for others" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);