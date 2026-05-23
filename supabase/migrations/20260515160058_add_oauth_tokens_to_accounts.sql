/*
  # Add OAuth tokens to social accounts

  1. Modified Tables
    - `social_accounts` - Add columns for storing OAuth access tokens and refresh tokens
      - `access_token` - OAuth access token from social platform
      - `refresh_token` - OAuth refresh token (if available)
      - `token_expires_at` - Token expiration timestamp
      - `account_id` - Platform-specific account ID
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_accounts' AND column_name = 'access_token'
  ) THEN
    ALTER TABLE social_accounts ADD COLUMN access_token text DEFAULT '';
    ALTER TABLE social_accounts ADD COLUMN refresh_token text DEFAULT '';
    ALTER TABLE social_accounts ADD COLUMN token_expires_at timestamptz;
    ALTER TABLE social_accounts ADD COLUMN account_id text DEFAULT '';
  END IF;
END $$;
