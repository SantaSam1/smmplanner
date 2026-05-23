# OAuth Flow Диаграмма

## Как работает подключение Instagram аккаунта

```
┌─────────────────┐
│  SMMPlanner App │
│  (Браузер)      │
└────────┬────────┘
         │
         │ 1. Нажимаешь "Connect"
         │
         ▼
┌─────────────────────────────────┐
│  Создаётся состояние (state):   │
│  {                              │
│    userId: "твой-id",           │
│    redirectUrl: "...",          │
│    platform: "instagram"        │
│  }                              │
└────────┬────────────────────────┘
         │
         │ 2. Отправляем на Instagram
         │    с App ID и state
         │
         ▼
    [META SERVERS]
    Instagram Authorization
    "Разрешить SMMPlanner доступ?"
         │
         │ 3. Ты подтверждаешь
         │
         ▼
┌──────────────────────────────────┐
│  Meta возвращает код (code)      │
│  Редирект на:                    │
│  .../functions/v1/oauth-callback │
│  ?code=...&state=...             │
└────────┬─────────────────────────┘
         │
         │ 4. Браузер идёт на функцию
         │
         ▼
┌──────────────────────────┐
│  Edge Function:          │
│  oauth-callback          │
│                          │
│  - Берёт code            │
│  - Берёт Meta secrets    │
│    из Supabase Secrets   │
└────────┬─────────────────┘
         │
         │ 5. Запрашивает access token
         │    у Meta с App Secret
         │
         ▼
    [META SERVERS]
    Выдают access_token
         │
         │ 6. Берём username и ID
         │    аккаунта
         │
         ▼
┌──────────────────────────┐
│  Сохраняем в БД:         │
│  - account_name          │
│  - account_handle        │
│  - access_token (!!!)    │
│  - user_id (твой)        │
│  - platform              │
└────────┬─────────────────┘
         │
         │ 7. Редирект назад в
         │    приложение
         │
         ▼
┌─────────────────┐
│  Аккаунт        │
│  подключен!     │
└─────────────────┘
```

---

## Когда ты публикуешь пост

```
┌──────────────────────┐
│  Compose page        │
│  Нажимаешь           │
│  "Publish Now"       │
└─────────┬────────────┘
          │
          │ Отправляем на Edge Function
          │ publish-post с:
          │ - content (текст)
          │ - accountId (который выбрал)
          │ - media URLs
          │
          ▼
┌───────────────────────┐
│  publish-post         │
│  Edge Function        │
│                       │
│  1. Берёт токен       │
│     из БД             │
│  2. Проверяет что     │
│     он не истёк       │
│  3. Отправляет на     │
│     Instagram API     │
└─────────┬─────────────┘
          │
          │ Отправляем пост
          │ в Instagram с
          │ access_token
          │
          ▼
    [INSTAGRAM SERVERS]
    Пост опубликован!
          │
          │ Возвращают результат
          │
          ▼
┌───────────────────────┐
│  Обновляем пост в БД: │
│  status = "published" │
│  published_at = now() │
└───────────────────────┘
          │
          ▼
┌──────────────────┐
│  Показываем      │
│  "Published!" ✓  │
└──────────────────┘
```

---

## Где хранятся credentials

```
┌─────────────────────────┐
│  .env (локальный)       │
│                         │
│  VITE_INSTAGRAM_APP_ID  │
│  Не секрет, видно на    │
│  фронте в браузере      │
└─────────────────────────┘

┌─────────────────────────┐
│  Supabase Secrets       │ ← ЗАЩИЩЕНО
│  (Edge Functions)       │
│                         │
│  META_APP_ID            │
│  META_APP_SECRET ⚠️      │ Никто не видит
│  CALLBACK_URL           │
└─────────────────────────┘

┌─────────────────────────┐
│  Supabase Database      │
│  (social_accounts)      │
│                         │
│  access_token ⚠️ ⚠️ ⚠️    │ Зашифрован
│  user_id                │ RLS политика
│  account_id             │
└─────────────────────────┘
```

---

## Что может пойти не так

### 1. VITE_INSTAGRAM_APP_ID не установлен

```
Browser
  │
  └─→ "OAuth is not configured"
       (потому что VITE_INSTAGRAM_APP_ID = undefined)
```

**Решение:** Добавь в `.env` и перезагрузи сервер

---

### 2. Redirect URI не совпадает

```
Browser
  │
  └─→ Meta Authorization
       │
       └─→ "Redirect URI mismatch"
            (ожидал X, получил Y)
```

**Решение:** В Meta Dashboard убедись что редирект URI точный

---

### 3. Meta App Secret неправильный

```
Edge Function (oauth-callback)
  │
  └─→ fetch("meta token endpoint")
       │
       └─→ "Client authentication failed"
            (потому что secret неправильный)
```

**Решение:** Проверь что скопировал полный App Secret без пробелов

---

### 4. Токен истёк

```
Compose page
  │
  └─→ publish-post function
       │
       └─→ "Invalid access token"
            (токен старый, больше не валиден)
```

**Решение:** Нужна функция refresh tokens (скоро добавим)

---

## Безопасность

```
⚠️  НЕ КОММИТИE App Secret в Git!
    Это как пароль от всего приложения.

✅  App Secret должен быть ТОЛЬКО в Supabase Secrets
    или локальной переменной окружения.

✅  Access tokens шифруются в БД автоматически

✅  RLS политики запрещают видеть чужие токены

✅  Edge Functions работают на сервере,
    браузер не видит App Secret
```

---

## Примеры запросов (для отладки)

### Запрос на авторизацию (что делает браузер)

```
GET https://api.instagram.com/oauth/authorize?
  client_id=1499867205138766&
  redirect_uri=http://localhost:5173/functions/v1/oauth-callback&
  scope=instagram_basic,instagram_graph_user_media&
  response_type=code&
  state=base64_encoded_json
```

### Запрос за токеном (что делает Edge Function)

```
POST https://graph.instagram.com/v19.0/oauth/access_token

Body:
  client_id=1499867205138766
  client_secret=твой_app_secret
  grant_type=authorization_code
  redirect_uri=http://localhost:5173/functions/v1/oauth-callback
  code=полученный_код
```

### Запрос на информацию юзера

```
GET https://graph.instagram.com/v19.0/me?
  fields=id,username&
  access_token=полученный_токен
```

### Запрос на публикацию

```
POST https://graph.instagram.com/v19.0/{account_id}/media_publish

Body:
  creation_id=id_контейнера_с_постом
  access_token=токен_аккаунта
```

---

## Дальнейшие улучшения

- [ ] Refresh tokens (автоматическое обновление токенов)
- [ ] Проверка срока действия токена перед публикацией
- [ ] Поддержка других платформ (Twitter, LinkedIn, etc)
- [ ] Синхронизация статистики с Instagram Insights
- [ ] Retry логика при ошибке публикации
- [ ] Webhook для получения уведомлений о комментариях
