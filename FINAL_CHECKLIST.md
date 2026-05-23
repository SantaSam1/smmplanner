# Финальный Чек-лист Настройки OAuth

## ✅ Твоя текущая конфигурация

В `.env` файле у тебя есть:
```
VITE_INSTAGRAM_APP_ID=1499867205138766
VITE_FACEBOOK_APP_ID=2096136224298442
```

Это хорошо! Но для работы OAuth нужно ещё несколько шагов.

---

## 🔑 Обязательные шаги

### Шаг 1: Перейди в Supabase Dashboard

1. Открой https://app.supabase.com/
2. Выбери свой проект (fppylocizmnpdipiuxfz)
3. В левом меню найди **Functions** → Нажми на **oauth-callback**

### Шаг 2: Добавь Secrets

1. В окне функции найди вкладку **Secrets** (или кнопка рядом с функцией)
2. Кликни **Add new secret** 
3. Заполни значения:

```
Name: META_APP_ID
Value: 1499867205138766

Name: META_APP_SECRET
Value: [ТВой App Secret из Meta Dashboard - см. ниже]

Name: CALLBACK_URL
Value: http://localhost:5173
```

### Шаг 3: Получи App Secret из Meta

1. Перейди на https://developers.facebook.com/
2. Выбери свое приложение где App ID = `1499867205138766`
3. Settings → Basic
4. Найди **App Secret** (может быть скрыт, нужно нажать "Show")
5. Скопируй его в поле `META_APP_SECRET` в Supabase

### Шаг 4: Проверь Redirect URI в Meta

1. В Meta Developer Dashboard твоего приложения:
   - Products → Instagram Graph API
   - Settings → OAuth Redirect URIs
2. Должен быть добавлен: `http://localhost:5173/functions/v1/oauth-callback`
3. Если нет - добавь и сохрани

---

## 🧪 Тестирование

После добавления Secrets:

```bash
# 1. Перезагрузи dev сервер (если запущен)
# Ctrl+C чтобы остановить
# npm run dev чтобы запустить заново

# 2. Открой браузер
# http://localhost:5173

# 3. Зарегистрируйся
# Кликни Sign Up, введи email и пароль

# 4. Перейди на страницу "Accounts" (в левой сайдбаре)

# 5. Кликни "Connect" на Instagram
```

Если всё работает:
- Перенаправит на страничку авторизации Meta
- После авторизации вернёшься в приложение
- Аккаунт появится в списке

---

## ❌ Если не работает

### "OAuth is not configured"
- Перезагрузи браузер (Ctrl+Shift+R)
- Убедись что перезагрузил dev сервер после изменения `.env`

### "Redirect URI mismatch"
- Проверь в Meta Dashboard что редирект URI = `http://localhost:5173/functions/v1/oauth-callback`
- Убедись что CALLBACK_URL в Supabase Secrets = `http://localhost:5173`

### "Failed to get access token"
- Проверь что META_APP_SECRET правильно скопирован (полностью, без пробелов)
- Убедись что это App Secret, а не App ID

### После авторизации вернулся, но аккаунта нет
- Проверь браузер console (F12 → Console) - есть ли ошибки?
- Посмотри Supabase Logs: Functions → oauth-callback → Logs вкладка

---

## 📋 Быстрый чек-лист перед началом

- [ ] App ID и App Secret получены из Meta Dashboard
- [ ] `META_APP_ID` добавлен в Supabase Secrets
- [ ] `META_APP_SECRET` добавлен в Supabase Secrets  
- [ ] `CALLBACK_URL=http://localhost:5173` добавлен в Supabase Secrets
- [ ] Редирект URI в Meta = `http://localhost:5173/functions/v1/oauth-callback`
- [ ] Dev сервер перезагружен (npm run dev)
- [ ] Браузер обновлён (Ctrl+Shift+R)
- [ ] Instagram аккаунт - это бизнес-аккаунт (не личный)

---

## 🚀 После успешного теста

Когда всё работает локально, можешь:
1. Добавлять другие социальные сети (Twitter, LinkedIn, TikTok, YouTube)
2. Развертывать на продакшн сервер
3. Добавлять новые функции

Для этого см. [OAUTH_SETUP.md](./OAUTH_SETUP.md) и [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## 💡 Совет

Если застрял на 30+ минут:
1. Проверь что использовал БИЗНЕС-аккаунт Instagram (не личный)
2. Убедись что App Secret правильный (не App ID!)
3. Посмотри Supabase Function Logs - там часто видна точная ошибка

Удачи! 🎉
