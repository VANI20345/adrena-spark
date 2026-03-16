-- Add interests_visibility field to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS interests_visibility text DEFAULT 'private' CHECK (interests_visibility IN ('private', 'public'));