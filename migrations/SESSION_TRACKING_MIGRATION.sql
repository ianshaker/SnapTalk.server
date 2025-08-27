-- SESSION_TRACKING_MIGRATION.sql
-- Миграция для добавления полей session tracking в таблицу page_events

-- Добавление новых столбцов для отслеживания сессий
ALTER TABLE page_events 
ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) NOT NULL DEFAULT 'page_view',
ADD COLUMN IF NOT EXISTS session_duration INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_session_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS is_session_start BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_session_end BOOLEAN NOT NULL DEFAULT false;

-- Добавление комментариев к новым столбцам
COMMENT ON COLUMN page_events.event_type IS 'Тип события: page_view, session_start, session_end, tab_switch';
COMMENT ON COLUMN page_events.session_duration IS 'Длительность сессии в секундах (только для session_end)';
COMMENT ON COLUMN page_events.is_session_active IS 'Активна ли сессия в данный момент';
COMMENT ON COLUMN page_events.is_session_start IS 'Является ли событие началом сессии';
COMMENT ON COLUMN page_events.is_session_end IS 'Является ли событие завершением сессии';

-- Создание индексов для оптимизации запросов по новым полям

-- Индекс по типу события для быстрой фильтрации
CREATE INDEX IF NOT EXISTS idx_page_events_event_type 
ON page_events(event_type);

-- Составной индекс по client_id и event_type для аналитики
CREATE INDEX IF NOT EXISTS idx_page_events_client_event_type 
ON page_events(client_id, event_type);

-- Индекс по активным сессиям для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_page_events_session_active 
ON page_events(is_session_active) WHERE is_session_active = true;

-- Составной индекс для поиска активных сессий посетителя
CREATE INDEX IF NOT EXISTS idx_page_events_visitor_session_active 
ON page_events(visitor_id, is_session_active) WHERE is_session_active = true;

-- Составной индекс для поиска событий начала сессии
CREATE INDEX IF NOT EXISTS idx_page_events_session_start 
ON page_events(client_id, visitor_id, is_session_start, event_timestamp DESC) 
WHERE is_session_start = true;

-- Составной индекс для поиска событий завершения сессии
CREATE INDEX IF NOT EXISTS idx_page_events_session_end 
ON page_events(client_id, visitor_id, is_session_end, event_timestamp DESC) 
WHERE is_session_end = true;

-- Индекс по длительности сессии для аналитики
CREATE INDEX IF NOT EXISTS idx_page_events_session_duration 
ON page_events(session_duration) WHERE session_duration IS NOT NULL;

-- Составной индекс для session tracking оптимизации
CREATE INDEX IF NOT EXISTS idx_page_events_session_tracking 
ON page_events(client_id, visitor_id, event_type, event_timestamp DESC);

-- Добавление ограничений для валидации данных

-- Проверка допустимых значений event_type
ALTER TABLE page_events 
ADD CONSTRAINT chk_page_events_event_type 
CHECK (event_type IN ('page_view', 'session_start', 'session_end', 'tab_switch'));

-- Проверка что session_duration положительное число
ALTER TABLE page_events 
ADD CONSTRAINT chk_page_events_session_duration 
CHECK (session_duration IS NULL OR session_duration >= 0);

-- Проверка логической целостности session flags
-- Событие не может быть одновременно началом и концом сессии
ALTER TABLE page_events 
ADD CONSTRAINT chk_page_events_session_flags 
CHECK (NOT (is_session_start = true AND is_session_end = true));

-- Проверка что session_duration заполнено только для session_end
ALTER TABLE page_events 
ADD CONSTRAINT chk_page_events_session_duration_logic 
CHECK (
  (event_type = 'session_end' AND session_duration IS NOT NULL) OR 
  (event_type != 'session_end' AND session_duration IS NULL)
);

-- Завершение миграции
SELECT 'SESSION_TRACKING_MIGRATION completed successfully' AS status;

-- Примеры использования новых полей:

-- Поиск всех активных сессий
-- SELECT * FROM page_events WHERE is_session_active = true;

-- Поиск событий начала сессии за последний день
-- SELECT * FROM page_events 
-- WHERE is_session_start = true 
-- AND event_timestamp >= NOW() - INTERVAL '1 day';

-- Средняя длительность сессий
-- SELECT AVG(session_duration) as avg_session_duration 
-- FROM page_events 
-- WHERE event_type = 'session_end' AND session_duration IS NOT NULL;

-- Количество событий по типам
-- SELECT event_type, COUNT(*) as count 
-- FROM page_events 
-- GROUP BY event_type;