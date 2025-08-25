# 🔧 Настройка переменных окружения в Render

## Суpabase интеграция для SnapTalk

### 📋 **Переменные для добавления в Render Dashboard:**

Перейди в Render Dashboard → Твой сервис → Environment

**Добавь следующие переменные:**

```bash
# Supabase Configuration для аутентификации
SUPABASE_URL=https://mdzsswlwebxrxprxrnam.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kenNzd2x3ZWJ4cnhwcnhybmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjIzNjAsImV4cCI6MjA3MTY5ODM2MH0.6y-WjM4MukQ8adqDOC0MR37iV2MuYinHKbnrN5YFuuw

# Frontend URL для CORS (опционально)
FRONTEND_URL=https://snaptalk.lovable.app
```

### 🚀 **Как добавить в Render:**

1. Открой [Render Dashboard](https://dashboard.render.com)
2. Найди сервис `snaptalk-server` 
3. Перейди в **Environment** в левом меню
4. Нажми **Add Environment Variable**
5. Добавь каждую переменную отдельно:
   - **Key:** `SUPABASE_URL`
   - **Value:** `https://mdzsswlwebxrxprxrnam.supabase.co`
6. Нажми **Save Changes**
7. Сервис автоматически перезапустится

### ✅ **После добавления переменных:**

Сервер должен показать в логах:
```
🎯 SnapTalk Frontend integration: ENABLED
```

Вместо:
```
🎯 SnapTalk Frontend integration: DISABLED
```

### 🧪 **Проверка работы:**

```bash
curl -H "Authorization: Bearer VALID_JWT_TOKEN" \
     https://sunray-livechat-new.onrender.com/api/snaptalk/clients
```

Должен вернуть список клиентов или пустой массив, а не ошибку аутентификации.

---

## 📝 **Примечания:**

- **SUPABASE_URL** - публичный URL твоего Supabase проекта
- **SUPABASE_ANON_KEY** - публичный anon ключ (безопасно для клиентской стороны)
- **SUPABASE_SERVICE_ROLE** - не добавляем, используется только для внутренних операций
- После добавления переменных сервис перезапустится автоматически (~2-3 минуты)

**После настройки фронтенд сможет успешно создавать и управлять клиентами!** 🎉
