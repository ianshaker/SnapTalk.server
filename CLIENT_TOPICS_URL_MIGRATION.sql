-- ===== Миграция для добавления URL и meta данных в client_topics =====

-- Добавляем поля для сохранения данных о визитах в client_topics
ALTER TABLE client_topics 
ADD COLUMN IF NOT EXISTS page_url TEXT,
ADD COLUMN IF NOT EXISTS page_title TEXT,
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

-- Создаем индексы для аналитики
CREATE INDEX IF NOT EXISTS idx_client_topics_page_url ON client_topics(page_url);
CREATE INDEX IF NOT EXISTS idx_client_topics_utm_source ON client_topics(utm_source) WHERE utm_source IS NOT NULL;

-- Комментарии к новым полям
COMMENT ON COLUMN client_topics.page_url IS 'URL страницы откуда пришел первый визит';
COMMENT ON COLUMN client_topics.page_title IS 'Заголовок страницы первого визита';
COMMENT ON COLUMN client_topics.referrer IS 'Откуда пришел пользователь (referrer)';
COMMENT ON COLUMN client_topics.utm_source IS 'UTM source первого визита';
COMMENT ON COLUMN client_topics.utm_medium IS 'UTM medium первого визита';
COMMENT ON COLUMN client_topics.utm_campaign IS 'UTM campaign первого визита';

-- Примеры запросов:

-- Посмотреть все темы с URL
-- SELECT client_id, topic_id, page_url, page_title, utm_source 
-- FROM client_topics 
-- WHERE page_url IS NOT NULL;

-- Статистика по UTM источникам
-- SELECT utm_source, utm_medium, COUNT(*) as topics_count
-- FROM client_topics 
-- WHERE utm_source IS NOT NULL 
-- GROUP BY utm_source, utm_medium 
-- ORDER BY topics_count DESC;
