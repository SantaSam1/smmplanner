# OAuth Setup Guide for SMMPlanner

This guide explains how to set up OAuth authentication for connecting social media accounts.

## Overview

SMMPlanner uses OAuth 2.0 to securely connect to social media platforms. Users authorize the app to publish posts on their behalf without sharing their passwords.

## Setup Instructions

### 1. Meta (Instagram & Facebook)

#### Create Meta App
1. Go to [Meta Developers](https://developers.facebook.com/)
2. Click "Create App" → Select "Consumer"
3. Fill in app details
4. Go to Settings → Basic and copy your **App ID** and **App Secret**

#### Configure Redirect URI
1. In your Meta app, go to Products → Instagram Graph API
2. Settings → OAuth Redirect URIs
3. Add: `https://yourdomain.com/functions/v1/oauth-callback`

#### Add to .env
```
VITE_INSTAGRAM_APP_ID=your-app-id
VITE_FACEBOOK_APP_ID=your-app-id
```

#### Add to Supabase Secrets
In Supabase Dashboard → Edge Functions → Secrets:
```
META_APP_ID=your-app-id
META_APP_SECRET=your-app-secret
CALLBACK_URL=https://yourdomain.com
```

---

### 2. Twitter / X

#### Create Twitter App
1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new project and app
3. Go to App Settings → Keys and Tokens
4. Generate API Key (Client ID) and API Secret Key

#### Configure OAuth 2.0
1. In your Twitter app settings, enable OAuth 2.0
2. Set Redirect URIs:
   - `https://yourdomain.com/functions/v1/oauth-callback`
3. Select read and write scopes: `tweet.write`, `tweet.read`, `users.read`

#### Add to .env
```
VITE_TWITTER_API_KEY=your-api-key
```

---

### 3. LinkedIn

#### Create LinkedIn App
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Create app → Fill required information
3. Go to Auth tab and copy **Client ID** and **Client Secret**

#### Configure Redirect URI
1. Under Auth → Authorized redirect URLs
2. Add: `https://yourdomain.com/functions/v1/oauth-callback`
3. Request access to `Share on LinkedIn` product

#### Add to .env
```
VITE_LINKEDIN_APP_ID=your-client-id
```

---

### 4. TikTok

#### Create TikTok App
1. Go to [TikTok Developer Console](https://developers.tiktok.com/)
2. Create new app
3. Copy **Client Key** and **Client Secret**

#### Configure Redirect URI
1. Under Redirect URLs
2. Add: `https://yourdomain.com/functions/v1/oauth-callback`
3. Request access to video upload API

#### Add to .env
```
VITE_TIKTOK_CLIENT_KEY=your-client-key
```

---

### 5. YouTube

#### Create Google OAuth App
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project
3. Enable YouTube Data API v3
4. Create OAuth 2.0 Client ID (Web application)
5. Copy **Client ID**

#### Configure Redirect URI
1. Authorized redirect URIs
2. Add: `https://yourdomain.com/functions/v1/oauth-callback`
3. Scopes: `https://www.googleapis.com/auth/youtube.upload`

#### Add to .env
```
VITE_YOUTUBE_CLIENT_ID=your-client-id
```

---

## Supabase Edge Functions Setup

The app uses Supabase Edge Functions to handle OAuth callbacks and publish posts.

### Deploy Functions

Functions are auto-deployed:
- `oauth-callback` - Handles OAuth redirects
- `publish-post` - Publishes posts to platforms

### Set Environment Variables

In Supabase Dashboard:
1. Go to Edge Functions
2. Click on a function → Edit
3. Add secrets:

```
META_APP_ID=your-app-id
META_APP_SECRET=your-app-secret
CALLBACK_URL=https://yourdomain.com
```

The other platforms' tokens are stored in the database per-account.

---

## Testing

### Local Testing
1. Update `.env` with your app credentials
2. Set `CALLBACK_URL=http://localhost:5173`
3. Run `npm run dev`
4. Go to Accounts page
5. Click "Connect" on any platform

### Production
1. Deploy to your domain
2. Update all `CALLBACK_URL` values to your production URL
3. Update Redirect URIs in all platforms' dashboards

---

## Troubleshooting

### "OAuth is not configured"
- Check that `VITE_*_APP_ID` env var is set
- Run `npm run dev` after changing .env

### "Invalid Redirect URI"
- Make sure redirect URI exactly matches platform settings
- Format: `https://domain.com/functions/v1/oauth-callback`
- Include protocol (https://)

### Token Expires
- Access tokens automatically refresh when publishing
- If manual refresh needed, user must reconnect account

---

## Security Notes

- Never commit `.env` with real credentials
- Use `.env.local` for development
- Secrets in Supabase are encrypted
- Always use HTTPS in production
- Store refresh tokens securely (done by default in Supabase)

---

## API Limits

- **Instagram**: 200 posts/day per account
- **Facebook**: No hard limit, rate limits apply
- **Twitter**: 300 posts/3 hours (API v2 tier dependent)
- **LinkedIn**: 100 posts/month per account
- **TikTok**: 100 videos/day per account
- **YouTube**: Unlimited, quota-based

See platform documentation for latest limits.
