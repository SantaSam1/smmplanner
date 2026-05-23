# SMMPlanner — Деплой на Beget

## Быстрый старт

### 1. Локальный запуск
```bash
npm install
npm run dev         # http://localhost:5173
```

### 2. Настройка .env
Файл `.env` уже содержит рабочие ключи Supabase.
Заполните `VITE_OK_APP_KEY` если нужны Одноклассники.

### 3. Подключение Telegram/VK/OK
Заходите в раздел «Аккаунты» → кнопка «Добавить аккаунт» → выбираете платформу → вводите токены прямо в UI.

**Telegram:** создайте бота у @BotFather → добавьте в канал как администратора
**VK:** Группа → Управление → Работа с API → создайте ключ с доступом к Стене
**OK:** нажмите кнопку «Авторизовать OK.ru» в форме добавления аккаунта

### 4. Публикация через Flask бэкенд (опционально)
```bash
cd backend
python -m venv venv && venv\Scripts\activate   # Windows
pip install -r requirements.txt
python api.py      # http://localhost:5001
```

### 5. Сборка для Beget
```bash
# Изменить в .env:
VITE_API_URL=https://ваш-домен.ru

npm run build      # создаст папку dist/
```

### 6. Загрузка на Beget
- Содержимое `dist/` → `public_html/`
- Файл `.htaccess` → `public_html/.htaccess`
- Включить SSL: Beget → Домены → SSL → Let's Encrypt

### Nginx прокси для бэкенда (если используете Flask API)
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:5001/api/;
    proxy_set_header Host $host;
}
```
