# Troubleshooting Guide - SMMPlanner OAuth

## Проблемы с авторизацией

### 1. "OAuth is not configured" при нажатии на Connect

**Причина:** Переменная среды `VITE_INSTAGRAM_APP_ID` не установлена или некорректна

**Решение:**
```bash
# 1. Проверь .env файл содержит:
VITE_INSTAGRAM_APP_ID=1499867205138766

# 2. Перезагрузи страницу (Ctrl+Shift+R для очистки кеша)

# 3. Если используешь npm run dev, перезагрузи сервер:
# Ctrl+C чтобы остановить
# npm run dev чтобы запустить заново
```

---

### 2. "Redirect URI mismatch" при авторизации на Meta

**Причина:** Redirect URI в Meta Dashboard не совпадает с тем, что отправляет приложение

**Решение:**

**Для локального тестирования:**
1. В `.env` установи:
   ```
   VITE_SUPABASE_URL=https://fppylocizmnpdipiuxfz.supabase.co
   ```

2. В Supabase Dashboard → Functions → oauth-callback → Secrets установи:
   ```
   META_APP_ID=1499867205138766
   META_APP_SECRET=твой-app-secret
   CALLBACK_URL=http://localhost:5173
   ```

3. В Meta Developer Dashboard (https://developers.facebook.com/):
   - Выбери свое приложение
   - Settings → Basic → Скопируй App ID и App Secret
   - Products → Instagram Graph API
   - Settings → OAuth Redirect URIs
   - Добавь: `http://localhost:5173/functions/v1/oauth-callback`
   - Сохрани

**Для продакшена (когда развернул на хостинг):**
```
CALLBACK_URL=https://yourdomain.com
```

И обнови редирект URI в Meta Dashboard на:
```
https://yourdomain.com/functions/v1/oauth-callback
```

---

### 3. "Failed to get access token" ошибка

**Причина:** Неправильный App Secret в Supabase Secrets

**Решение:**
1. Перейди в Supabase Dashboard
2. Выбери свой проект
3. Functions → oauth-callback
4. Нажми на функцию
5. Вкладка "Secrets"
6. Проверь что:
   - `META_APP_ID` совпадает с ID из Meta Dashboard
   - `META_APP_SECRET` совпадает с Secret из Meta Dashboard (это НЕ app-scoped secret!)
   - `CALLBACK_URL` совпадает с тем, что в `.env`

**Как получить правильные значения:**
1. Перейди на https://developers.facebook.com/
2. Мой профиль → Мои приложения
3. Выбери свое приложение
4. Settings → Basic
5. Скопируй:
   - App ID → в `META_APP_ID`
   - App Secret → в `META_APP_SECRET`

---

### 4. Перенаправляет на Meta, но потом вернулся на пустую страницу

**Причина:** Redirect URI на Meta мизерный или сессия истекла

**Решение:**
1. Закрой браузер полностью
2. Открой инкогнито окно
3. Попробуй заново подключить аккаунт

Если не помогло:
- Проверь консоль браузера (F12 → Console) на ошибки
- Посмотри Network вкладку - какой был последний редирект?

---

### 5. "Database error" при подключении

**Причина:** Ошибка при сохранении в БД Supabase

**Решение:**
1. Перейди в Supabase Dashboard
2. SQL Editor
3. Выполни запрос чтобы проверить таблицу:
   ```sql
   SELECT * FROM social_accounts LIMIT 5;
   ```

4. Если таблица не существует, выполни миграцию:
   ```sql
   CREATE TABLE IF NOT EXISTS social_accounts (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     platform text NOT NULL,
     account_name text DEFAULT '',
     account_handle text DEFAULT '',
     avatar_url text DEFAULT '',
     followers_count integer DEFAULT 0,
     is_active boolean DEFAULT true,
     access_token text DEFAULT '',
     refresh_token text DEFAULT '',
     token_expires_at timestamptz,
     account_id text DEFAULT '',
     connected_at timestamptz DEFAULT now()
   );
   
   ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Users can view own accounts" ON social_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
   CREATE POLICY "Users can insert own accounts" ON social_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
   CREATE POLICY "Users can update own accounts" ON social_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
   CREATE POLICY "Users can delete own accounts" ON social_accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);
   ```

---

### 6. Подключился, но аккаунт не появился

**Причина:** RLS политика блокирует доступ или была ошибка при сохранении

**Решение:**
1. В Supabase Dashboard → SQL Editor выполни:
   ```sql
   -- Найди свои аккаунты
   SELECT * FROM social_accounts 
   WHERE user_id = auth.uid();
   ```

2. Если пусто, но ошибок не было, проверь RLS политики:
   ```sql
   SELECT * FROM social_accounts;
   ```
   Если видишь аккаунты других юзеров - RLS настроена неправильно

3. Пересоздай RLS политики (см. решение #5)

---

## Общие советы по отладке

### Проверь браузер console (F12)
```javascript
// В console можно выполнить
console.log(import.meta.env.VITE_INSTAGRAM_APP_ID)
// Должно вывести твой App ID, а не undefined
```

### Проверь Network вкладку
1. F12 → Network
2. Кликни на Connect на Instagram
3. Посмотри какие запросы идут
4. На редирект к graph.instagram.com посмотри Response - там может быть ошибка

### Логи Supabase Function
1. Supabase Dashboard → Functions → oauth-callback
2. Нажми на функцию
3. Вкладка "Logs"
4. Там будут ошибки если что-то пошло не так

---

## Быстрая проверка список

- [ ] Скопировал App ID и App Secret из Meta Dashboard
- [ ] Добавил `VITE_INSTAGRAM_APP_ID=...` в `.env`
- [ ] Добавил `META_APP_ID` и `META_APP_SECRET` в Supabase Secrets
- [ ] Добавил `CALLBACK_URL` в Supabase Secrets
- [ ] В Meta Dashboard добавил редирект URI: `http://localhost:5173/functions/v1/oauth-callback` (для локалки)
- [ ] Перезагрузил dev сервер (Ctrl+C и npm run dev)
- [ ] Перезагрузил браузер (Ctrl+Shift+R)
- [ ] Проверил что социальный аккаунт не приватный
- [ ] Закрыл браузер полностью и открыл заново

---

## Нужна дополнительная помощь?

Когда создаешь OAuth приложение на Meta, убедись что:
1. Выбрал правильный тип приложения (Consumer)
2. Добавил Instagram Graph API в Products
3. В Settings указал редирект URI точно

Если всё равно не работает - проверь что используешь Instagram бизнес аккаунт (не личный) и что аккаунт не заблокирован.
