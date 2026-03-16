-- إضافة علاقة خارجية بين group_members و profiles
ALTER TABLE public.group_members
DROP CONSTRAINT IF EXISTS group_members_user_id_fkey;

ALTER TABLE public.group_members
ADD CONSTRAINT group_members_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(user_id)
ON DELETE CASCADE;