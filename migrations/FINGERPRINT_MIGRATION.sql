-- ===== Миграция для интеграции FingerprintJS =====
-- Добавляем поля для идентификации пользователей

-- Добавляем новые столбцы в client_topics
ALTER TABLE client_topics 
ADD COLUMN IF NOT EXISTS visitor_id TEXT,
ADD COLUMN IF NOT EXISTS request_id TEXT, 
ADD COLUMN IF NOT EXISTS fingerprint_data JSONB;

-- Создаем индекс для быстрого поиска по visitor_id
CREATE INDEX IF NOT EXISTS idx_client_topics_visitor_id 
ON client_topics(visitor_id);

-- Создаем индекс для поиска по времени создания записи
CREATE INDEX IF NOT EXISTS idx_client_topics_fingerprint_timestamp 
ON client_topics USING GIN ((fingerprint_data->'timestamp'));

-- Комментарии к новым полям
COMMENT ON COLUMN client_topics.visitor_id IS 'FingerprintJS visitor ID для идентификации пользователя';
COMMENT ON COLUMN client_topics.request_id IS 'FingerprintJS request ID для конкретного запроса';
COMMENT ON COLUMN client_topics.fingerprint_data IS 'JSON с дополнительными данными FingerprintJS';

-- Пример данных которые будут храниться в fingerprint_data:
-- {
--   "visitorId": "abc123def456...",
--   "requestId": "xyz789uvw012...",
--   "timestamp": "2025-01-15T10:30:00.000Z"
-- }
