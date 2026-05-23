/*
  # SMM Planner Schema

  ## New Tables
  - `profiles` - Extended user profile data linked to auth.users
  - `social_accounts` - Connected social media accounts per user
  - `posts` - Scheduled and published posts with metadata
  - `media_library` - Uploaded media files (images/videos)
  - `tags` - Hashtag/label management
  - `post_tags` - Many-to-many posts to tags

  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text DEFAULT '',
  avatar_url text DEFAULT '',
  plan text DEFAULT 'beginner',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Social accounts table
CREATE TABLE IF NOT EXISTS social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube')),
  account_name text NOT NULL DEFAULT '',
  account_handle text NOT NULL DEFAULT '',
  avatar_url text DEFAULT '',
  followers_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  connected_at timestamptz DEFAULT now()
);

ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own social accounts"
  ON social_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own social accounts"
  ON social_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own social accounts"
  ON social_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own social accounts"
  ON social_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Media library table
CREATE TABLE IF NOT EXISTS media_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  file_type text NOT NULL DEFAULT 'image' CHECK (file_type IN ('image', 'video')),
  file_size integer DEFAULT 0,
  width integer DEFAULT 0,
  height integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media"
  ON media_library FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own media"
  ON media_library FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own media"
  ON media_library FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text DEFAULT '',
  content text NOT NULL DEFAULT '',
  media_urls text[] DEFAULT ARRAY[]::text[],
  platforms text[] NOT NULL DEFAULT ARRAY[]::text[],
  account_ids uuid[] DEFAULT ARRAY[]::uuid[],
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  scheduled_at timestamptz,
  published_at timestamptz,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  reach_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own posts"
  ON posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts(user_id);
CREATE INDEX IF NOT EXISTS posts_status_idx ON posts(status);
CREATE INDEX IF NOT EXISTS posts_scheduled_at_idx ON posts(scheduled_at);
CREATE INDEX IF NOT EXISTS social_accounts_user_id_idx ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS media_library_user_id_idx ON media_library(user_id);
