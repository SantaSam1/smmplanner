# Настройка секретов в Supabase

Для работы OAuth интеграции нужно добавить секреты в Supabase Edge Functions.

## Инструкция

### 1. Перейди в Supabase Dashboard
- https://app.supabase.com/
- Выбери свой проект

### 2. Найди Edge Functions
- В левом меню → Functions → oauth-callback

### 3. Добавь секреты

Кликни на функцию `oauth-callback` и перейди на вкладку **Secrets**.

Добавь следующие переменные:

| Ключ | Значение | Описание |
|------|----------|---------|
| `META_APP_ID` | `1499867205138766` | ID твоего Meta приложения |
| `META_APP_SECRET` | твой секрет | Secret Key твоего Meta приложения |
| `CALLBACK_URL` | `https://yourdomain.com` | URL твоего приложения (для локального тестирования: `http://localhost:5173`) |

### 4. Для локального тестирования

```bash
# Убедись что в .env установлен правильный CALLBACK_URL
CALLBACK_URL=http://localhost:5173

# И запусти сервер
npm run dev
```

### 5. Для продакшена

Измени все значения на твой реальный домен:
```
CALLBACK_URL=https://yourdomain.com
```

## Проверка

После добавления секретов:
1. Пройди регистрацию на странице авторизации
2. Перейди на страницу "Accounts"
3. Кликни "Connect" на Instagram/Facebook
4. Если всё правильно, перенаправит на страницу авторизации Meta
5. После авторизации вернёшься в приложение

## Troubleshooting

### "OAuth is not configured"
- Проверь что `VITE_INSTAGRAM_APP_ID` установлен в `.env`
- Перезагрузи страницу после изменения `.env`

### "Redirect URI mismatch"
- В Meta Dashboard проверь что редирект URI совпадает точно с `CALLBACK_URL`
- Для локалки должно быть: `http://localhost:5173/functions/v1/oauth-callback`
- Для продакшена: `https://yourdomain.com/functions/v1/oauth-callback`

### "Failed to get access token"
- Проверь что `META_APP_SECRET` правильно установлен в Supabase Secrets
- Убедись что APP ID и SECRET совпадают

### "Database error"
- Проверь что таблица `social_accounts` существует в БД
- Запусти миграцию: миграция добавлена автоматически при развёртывании

## Для других платформ

Данная инструкция для Instagram/Facebook (Meta). Для других платформ (Twitter, LinkedIn, TikTok, YouTube) нужна похожая настройка, но каждая платформа требует своих учётных данных.

Скоро добавим поддержку других платформ!
