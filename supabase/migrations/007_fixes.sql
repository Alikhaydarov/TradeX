-- 1. profiles jadvaliga yetishmayotgan ustunlarni qo'shish
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. posts jadvaliga yetishmayotgan ustunlarni qo'shish
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT null;

-- 3. posts uchun user_id indeksi
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON public.posts(user_id, created_at DESC);

-- 4. post-images storage bucket'ini yaratish
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-images',
  'post-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- avatars storage bucket'ini yaratish
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS siyosatlarini o'chirish (avval mavjud bo'lishi mumkinligi uchun)
DROP POLICY IF EXISTS "Post images are public" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own post images" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own post images" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are public" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatars" ON storage.objects;

-- Storage RLS siyosatlarini yaratish
CREATE POLICY "Post images are public" ON storage.objects FOR SELECT USING (bucket_id = 'post-images');
CREATE POLICY "Users upload own post images" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own post images" ON storage.objects FOR DELETE TO authenticated 
  USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatars are public" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatars" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own avatars" ON storage.objects FOR DELETE TO authenticated 
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. RPC Funksiyalarini yaratish
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN,
  is_admin BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- faqat adminlar bajara olishi uchun
  IF NOT COALESCE((SELECT profiles.is_admin FROM public.profiles WHERE profiles.id = auth.uid()), false) THEN
    RAISE EXCEPTION 'Ruxsat berilmagan';
  END IF;

  RETURN QUERY
  SELECT p.id, p.username, p.full_name, p.avatar_url, p.is_verified, p.is_admin, p.created_at
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_verification(target_user_id UUID, next_value BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT COALESCE((SELECT profiles.is_admin FROM public.profiles WHERE profiles.id = auth.uid()), false) THEN
    RAISE EXCEPTION 'Ruxsat berilmagan';
  END IF;

  UPDATE public.profiles
  SET is_verified = next_value
  WHERE id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_post_view(target_post_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.posts
  SET views_count = views_count + 1
  WHERE id = target_post_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_post(target_post_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  post_owner_id UUID;
  caller_is_admin BOOLEAN;
BEGIN
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = target_post_id;
  SELECT is_admin INTO caller_is_admin FROM public.profiles WHERE id = auth.uid();

  IF auth.uid() = post_owner_id OR caller_is_admin THEN
    UPDATE public.posts
    SET is_archived = true
    WHERE id = target_post_id;
  ELSE
    RAISE EXCEPTION 'Postni arxivlashga ruxsat yo''q';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_chat(target_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- guruh a'zoligini tekshirish
  IF EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = target_group_id AND user_id = auth.uid()
  ) THEN
    -- Chat guruhini faqat joriy a'zo uchun o'chirish (a'zolikdan o'chish orqali chat ro'yxatidan yashiriladi)
    DELETE FROM public.group_members
    WHERE group_id = target_group_id AND user_id = auth.uid();
  END IF;
END;
$$;
