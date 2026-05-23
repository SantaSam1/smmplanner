/*
  # Fix social_accounts: add credentials column + support TG/VK/OK platforms

  1. Добавляет колонку credentials (jsonb) для хранения токенов Telegram/VK/OK
  2. Обновляет CHECK constraint — добавляет telegram, vk, ok
  3. Безопасно — не ломает существующие данные
*/

-- 1. Добавить колонку credentials если её нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_accounts' AND column_name = 'credentials'
  ) THEN
    ALTER TABLE social_accounts ADD COLUMN credentials jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 2. Убрать старый CHECK constraint на platform и добавить новый с TG/VK/OK
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Найти имя constraint
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  WHERE tc.table_name = 'social_accounts'
    AND tc.constraint_type = 'CHECK'
    AND tc.constraint_name LIKE '%platform%';

  -- Удалить если найден
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE social_accounts DROP CONSTRAINT ' || constraint_name;
  END IF;

  -- Добавить новый constraint со всеми платформами
  ALTER TABLE social_accounts
    ADD CONSTRAINT social_accounts_platform_check
    CHECK (platform IN (
      'instagram', 'facebook', 'twitter', 'linkedin',
      'tiktok', 'youtube', 'telegram', 'vk', 'ok'
    ));
END $$;

-- 3. Добавить account_id если нет (используется OAuth)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_accounts' AND column_name = 'account_id'
  ) THEN
    ALTER TABLE social_accounts ADD COLUMN account_id text DEFAULT '';
  END IF;
END $$;

-- 4. Добавить access_token / refresh_token / token_expires_at если нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_accounts' AND column_name = 'access_token'
  ) THEN
    ALTER TABLE social_accounts ADD COLUMN access_token text DEFAULT '';
    ALTER TABLE social_accounts ADD COLUMN refresh_token text DEFAULT '';
    ALTER TABLE social_accounts ADD COLUMN token_expires_at timestamptz;
  END IF;
END $$;
