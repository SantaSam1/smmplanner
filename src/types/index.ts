export type Platform = 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'telegram' | 'vk' | 'ok';
export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';
export type MediaType = 'image' | 'video';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  plan: string;
  created_at: string;
  updated_at: string;
}

export interface SocialAccount {
  id: string;
  user_id: string;
  platform: Platform;
  account_name: string;
  account_handle: string;
  avatar_url: string;
  followers_count: number;
  is_active: boolean;
  connected_at: string;
  credentials?: Record<string, string>;
}

export interface MediaItem {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_type: MediaType;
  file_size: number;
  width: number;
  height: number;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  media_urls: string[];
  platforms: Platform[];
  account_ids: string[];
  status: PostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  reach_count: number;
  created_at: string;
  updated_at: string;
}

export type Page = 'dashboard' | 'calendar' | 'compose' | 'posts' | 'analytics' | 'accounts' | 'media';
export type Language = 'en' | 'ru';
