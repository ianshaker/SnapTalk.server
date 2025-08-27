# Инструкция по применению миграции SESSION_TRACKING_MIGRATION.sql

## Проблема
Прямое подключение к Supabase через Node.js клиент не работает (возможно, из-за сетевых ограничений или настроек безопасности).

## Решение: Ручное применение через Supabase Dashboard

### Шаги:

1. **Откройте Supabase Dashboard**
   - Перейдите на https://supabase.com/dashboard
   - Войдите в свой аккаунт
   - Выберите проект `sunray-livechat`

2. **Откройте SQL Editor**
   - В левом меню выберите "SQL Editor"
   - Нажмите "New query"

3. **Скопируйте и выполните миграцию**
   - Откройте файл `migrations/SESSION_TRACKING_MIGRATION.sql`
   - Скопируйте весь содержимое файла
   - Вставьте в SQL Editor
   - Нажмите "Run" (или Ctrl/Cmd + Enter)

4. **Проверьте результат**
   - Убедитесь, что все команды выполнились без ошибок
   - Проверьте структуру таблицы `page_events`

## Что добавляет миграция:

### Новые поля в таблице `page_events`:
- `event_type` VARCHAR(50) - тип события (page_view, session_start, session_end, tab_switch)
- `session_duration` INTEGER - длительность сессии в секундах
- `is_session_active` BOOLEAN - активна ли сессия
- `is_session_start` BOOLEAN - начало сессии
- `is_session_end` BOOLEAN - завершение сессии

### Индексы для оптимизации:
- `idx_page_events_event_type` - по типу события
- `idx_page_events_client_event_type` - по клиенту и типу события
- `idx_page_events_session_active` - по активным сессиям
- `idx_page_events_visitor_session_active` - по активным сессиям посетителя
- `idx_page_events_session_start` - по событиям начала сессии
- `idx_page_events_session_end` - по событиям завершения сессии
- `idx_page_events_session_duration` - по длительности сессии
- `idx_page_events_session_tracking` - составной индекс для session tracking

### Ограничения (constraints):
- Проверка допустимых значений `event_type`
- Проверка положительности `session_duration`
- Логическая проверка session flags
- Проверка заполнения `session_duration` только для `session_end`

## Проверка успешного применения:

Выполните в SQL Editor:

```sql
-- Проверка структуры таблицы
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'page_events' 
AND column_name IN ('event_type', 'session_duration', 'is_session_active', 'is_session_start', 'is_session_end')
ORDER BY ordinal_position;

-- Проверка индексов
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'page_events' 
AND indexname LIKE '%session%';

-- Проверка ограничений
SELECT conname, contype, consrc 
FROM pg_constraint 
WHERE conrelid = 'page_events'::regclass 
AND conname LIKE '%session%' OR conname LIKE '%event_type%';
```

## После применения миграции:

1. ✅ Новые поля будут доступны в таблице `page_events`
2. ✅ API endpoints `/api/track/page` и `/api/track/session` будут работать корректно
3. ✅ Session tracking будет полностью функционален
4. ✅ Можно переходить к тестированию и обновлению frontend виджета

## Альтернативные способы:

### Через psql (если установлен PostgreSQL клиент):
```bash
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" -f migrations/SESSION_TRACKING_MIGRATION.sql
```

### Через Supabase CLI (если установлен):
```bash
supabase db reset
# или
supabase db push
```

---

**Важно:** После применения миграции обязательно протестируйте API endpoints для убеждения в корректной работе session tracking функциональности.