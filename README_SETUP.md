# SMMPlanner - Настройка и Запуск

Полнофункциональное приложение для планирования и публикации постов в социальные сети.

## Быстрая Настройка (5 минут)

### Шаг 1: Подготовка учётных данных Meta (Instagram/Facebook)

1. Перейди на https://developers.facebook.com/
2. Создай новое приложение (если нет):
   - Type: Consumer
   - Name: SMMPlanner (или любое имя)
3. После создания:
   - Settings → Basic
   - Скопируй **App ID** и **App Secret**

### Шаг 2: Настройка Redirect URI в Meta

1. В твоём приложении на Meta:
   - Products → Instagram Graph API
   - Settings → OAuth Redirect URIs
   - Добавь: `http://localhost:5173/functions/v1/oauth-callback`
   - Save

### Шаг 3: Добавь учётные данные в проект

```bash
# Отредактируй .env файл
nano .env  # или открой в редакторе

# И установи:
VITE_INSTAGRAM_APP_ID=твой-app-id-из-meta
VITE_FACEBOOK_APP_ID=твой-app-id-из-meta
```

### Шаг 4: Добавь Secrets в Supabase

1. Перейди в Supabase Dashboard → Functions → oauth-callback
2. Нажми на функцию oauth-callback
3. Вкладка **Secrets** → Add secret
4. Добавь три переменные:

| Name | Value |
|------|-------|
| `META_APP_ID` | твой App ID из Meta |
| `META_APP_SECRET` | твой App Secret из Meta |
| `CALLBACK_URL` | `http://localhost:5173` |

### Шаг 5: Запусти приложение

```bash
npm run dev
```

Откроется браузер на http://localhost:5173

### Шаг 6: Протестируй OAuth

1. Создай аккаунт на странице регистрации
2. Перейди на страницу "Accounts"
3. Кликни "Connect" на Instagram
4. Авторизуйся на страничке Meta
5. Вернёшься в приложение - готово!

---

## Полная Настройка для Продакшена

Для развёртывания на реальном сервере см. [OAUTH_SETUP.md](./OAUTH_SETUP.md)

---

## Структура Проекта

```
src/
├── pages/           # Основные страницы приложения
│   ├── Dashboard.tsx       # Главная страница с статистикой
│   ├── Calendar.tsx        # Календарь постов
│   ├── Compose.tsx         # Редактор постов
│   ├── Posts.tsx           # Список всех постов
│   ├── Analytics.tsx       # Аналитика и статистика
│   ├── Accounts.tsx        # Управление аккаунтами
│   ├── Media.tsx           # Медиа-библиотека
│   └── AuthPage.tsx        # Вход и регистрация
├── components/      # Переиспользуемые компоненты
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── PlatformBadge.tsx
├── contexts/        # React Context для глобального состояния
│   └── AuthContext.tsx      # Управление авторизацией
├── lib/            # Утилиты
│   └── supabase.ts         # Инициализация Supabase клиента
└── types/          # TypeScript типы

supabase/
├── functions/       # Edge Functions
│   ├── oauth-callback/     # Обработка OAuth редирект
│   └── publish-post/       # Публикация постов в соцсети
└── migrations/      # Миграции базы данных
```

---

## Возможности

✅ **Аутентификация** - Email/password с Supabase Auth
✅ **OAuth интеграция** - Подключение Instagram/Facebook аккаунтов
✅ **Планирование постов** - Отложенная публикация
✅ **Прямая публикация** - Публикация постов сразу в соцсети
✅ **Календарь** - Визуальный календарь запланированных постов
✅ **Аналитика** - Статистика по лайкам, комментариям, охвату
✅ **Медиа-библиотека** - Хранение изображений для постов
✅ **Управление аккаунтами** - Подключение/отключение аккаунтов
✅ **Мобильный дизайн** - Адаптивный интерфейс

---

## Технологический стек

- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions)
- **API интеграции:** Meta Graph API (Instagram/Facebook)
- **Хостинг:** Vercel / Netlify / любой Node.js хостинг

---

## Команды

```bash
# Разработка
npm run dev          # Запуск dev сервера на localhost:5173

# Production
npm run build        # Сборка для production
npm run preview      # Предпросмотр production сборки

# Качество кода
npm run lint         # ESLint проверка
npm run typecheck    # TypeScript проверка типов
```

---

## Структура БД

### Таблицы

1. **auth.users** (встроенная в Supabase)
   - Хранит данные пользователей
   - Управляется автоматически Supabase

2. **profiles**
   - user_id → Ссылка на auth.users
   - full_name, avatar_url
   - plan (beginner, pro, business)

3. **social_accounts**
   - user_id → Ссылка на auth.users
   - platform (instagram, facebook, twitter, linkedin, tiktok, youtube)
   - account_name, account_handle
   - access_token, refresh_token (для OAuth)
   - is_active, followers_count

4. **posts**
   - user_id → Ссылка на auth.users
   - content (текст поста)
   - platforms[] (массив платформ)
   - account_ids[] (массив аккаунтов для публикации)
   - status (draft, scheduled, published, failed)
   - scheduled_at, published_at
   - media_urls[] (ссылки на изображения)
   - Метрики: likes_count, comments_count, shares_count, reach_count

5. **media_library**
   - user_id → Ссылка на auth.users
   - file_url, file_name, file_type (image, video)
   - width, height, file_size

---

## Безопасность

- **RLS (Row Level Security)** - Пользователи видят только свои данные
- **JWT токены** - Безопасная аутентификация
- **Environment переменные** - Credentials не коммитятся в Git
- **Edge Functions** - Обработка чувствительных операций на сервере
- **Encrypted secrets** - Пароли хранятся в зашифрованных Secrets

---

## Решение проблем

Если что-то не работает, проверь:

1. **Является ли Instagram аккаунт бизнес-аккаунтом?** 
   - Личные аккаунты не работают с Graph API

2. **Правильны ли App ID и App Secret?**
   - Проверь в Meta Developer Dashboard

3. **Совпадает ли Redirect URI?**
   - Meta требует точного совпадения: `http://localhost:5173/functions/v1/oauth-callback`

4. **Есть ли Secrets в Supabase?**
   - Без них Edge Function не сможет обработать OAuth

Подробнее см. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## Дальнейшее развитие

Планы по добавлению:
- ✨ Полная поддержка Twitter/X, LinkedIn, TikTok, YouTube
- ✨ AI-генерация постов и заголовков
- ✨ Автоматическая оптимизация по времени публикации
- ✨ A/B тестирование постов
- ✨ Командная работа и одобрение постов
- ✨ Интеграция с Canva для дизайна
- ✨ Массовая загрузка постов из CSV
- ✨ Шаблоны постов

---

## Лицензия

MIT - свободно используй и модифицируй

---

## Поддержка

Если возникли вопросы:
1. Проверь [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Посмотри [OAUTH_SETUP.md](./OAUTH_SETUP.md) для остальных платформ
3. Проверь консоль браузера (F12) на ошибки
4. Посмотри Supabase Logs для Edge Functions
