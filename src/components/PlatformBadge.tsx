import { Platform } from '../types';

export const platformConfig: Record<Platform, { label: string; color: string; bg: string }> = {
  instagram: { label: 'Instagram',      color: 'text-pink-600',   bg: 'bg-pink-100' },
  facebook:  { label: 'Facebook',       color: 'text-blue-600',   bg: 'bg-blue-100' },
  twitter:   { label: 'Twitter/X',      color: 'text-sky-600',    bg: 'bg-sky-100' },
  linkedin:  { label: 'LinkedIn',       color: 'text-blue-700',   bg: 'bg-blue-100' },
  tiktok:    { label: 'TikTok',         color: 'text-gray-900',   bg: 'bg-gray-100' },
  youtube:   { label: 'YouTube',        color: 'text-red-600',    bg: 'bg-red-100' },
  telegram:  { label: 'Telegram',       color: 'text-sky-700',    bg: 'bg-sky-100' },
  vk:        { label: 'ВКонтакте',      color: 'text-blue-700',   bg: 'bg-blue-100' },
  ok:        { label: 'Одноклассники',  color: 'text-orange-600', bg: 'bg-orange-100' },
};

export default function PlatformBadge({ platform }: { platform: Platform }) {
  const cfg = platformConfig[platform] || { label: platform, color: 'text-gray-600', bg: 'bg-gray-100' };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}
