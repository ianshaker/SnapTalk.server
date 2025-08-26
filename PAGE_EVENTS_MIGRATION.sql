-- PAGE_EVENTS_MIGRATION.sql
-- Миграция для создания таблицы page_events для трекинга переходов по страницам

-- Создание таблицы page_events
CREATE TABLE IF NOT EXISTS page_events (
    id BIGSERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL,
    visitor_id VARCHAR(255) NOT NULL,
    request_id VARCHAR(255),
    page_url TEXT NOT NULL,
    page_path VARCHAR(500) NOT NULL,
    page_title VARCHAR(500),
    referrer TEXT,
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_term VARCHAR(255),
    utm_content VARCHAR(255),
    user_agent TEXT,
    ip_address INET,
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Добавление внешнего ключа для связи с таблицей clients
ALTER TABLE page_events 
ADD CONSTRAINT fk_page_events_client_id 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Создание индексов для оптимизации запросов

-- Основной индекс по client_id для быстрого поиска событий клиента
CREATE INDEX IF NOT EXISTS idx_page_events_client_id 
ON page_events(client_id);

-- Индекс по visitor_id для трекинга конкретного посетителя
CREATE INDEX IF NOT EXISTS idx_page_events_visitor_id 
ON page_events(visitor_id);

-- Составной индекс по client_id и visitor_id для быстрого поиска событий посетителя у клиента
CREATE INDEX IF NOT EXISTS idx_page_events_client_visitor 
ON page_events(client_id, visitor_id);

-- Индекс по времени события для временных запросов
CREATE INDEX IF NOT EXISTS idx_page_events_event_timestamp 
ON page_events(event_timestamp DESC);

-- Составной индекс по client_id и времени для аналитики клиента
CREATE INDEX IF NOT EXISTS idx_page_events_client_timestamp 
ON page_events(client_id, event_timestamp DESC);

-- Индекс по page_path для анализа популярных страниц
CREATE INDEX IF NOT EXISTS idx_page_events_page_path 
ON page_events(page_path);

-- Составной индекс по client_id и page_path для анализа страниц клиента
CREATE INDEX IF NOT EXISTS idx_page_events_client_path 
ON page_events(client_id, page_path);

-- Индекс по UTM источникам для маркетинговой аналитики
CREATE INDEX IF NOT EXISTS idx_page_events_utm_source 
ON page_events(utm_source) WHERE utm_source IS NOT NULL;

-- Составной индекс для антиспам-фильтра (client_id, visitor_id, page_path, event_timestamp)
CREATE INDEX IF NOT EXISTS idx_page_events_antispam 
ON page_events(client_id, visitor_id, page_path, event_timestamp DESC);

-- Добавление комментариев к таблице и столбцам
COMMENT ON TABLE page_events IS 'Таблица для трекинга переходов по страницам сайтов клиентов';
COMMENT ON COLUMN page_events.id IS 'Уникальный идентификатор события';
COMMENT ON COLUMN page_events.client_id IS 'ID клиента из таблицы clients';
COMMENT ON COLUMN page_events.visitor_id IS 'Уникальный идентификатор посетителя';
COMMENT ON COLUMN page_events.request_id IS 'ID запроса для связи с другими событиями';
COMMENT ON COLUMN page_events.page_url IS 'Полный URL страницы';
COMMENT ON COLUMN page_events.page_path IS 'Путь страницы без домена и параметров';
COMMENT ON COLUMN page_events.page_title IS 'Заголовок страницы';
COMMENT ON COLUMN page_events.referrer IS 'URL страницы-источника перехода';
COMMENT ON COLUMN page_events.utm_source IS 'UTM источник трафика';
COMMENT ON COLUMN page_events.utm_medium IS 'UTM канал трафика';
COMMENT ON COLUMN page_events.utm_campaign IS 'UTM кампания';
COMMENT ON COLUMN page_events.utm_term IS 'UTM ключевое слово';
COMMENT ON COLUMN page_events.utm_content IS 'UTM контент';
COMMENT ON COLUMN page_events.user_agent IS 'User-Agent браузера посетителя';
COMMENT ON COLUMN page_events.ip_address IS 'IP-адрес посетителя';
COMMENT ON COLUMN page_events.event_timestamp IS 'Время события на клиенте';
COMMENT ON COLUMN page_events.created_at IS 'Время создания записи в базе данных';

-- Настройка RLS (Row Level Security) если необходимо
-- ALTER TABLE page_events ENABLE ROW LEVEL SECURITY;

-- Создание политики RLS для доступа только к данным своего клиента
-- CREATE POLICY page_events_client_policy ON page_events
--     FOR ALL USING (client_id = current_setting('app.current_client_id')::INTEGER);

-- Предоставление прав доступа
GRANT SELECT, INSERT, UPDATE, DELETE ON page_events TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE page_events_id_seq TO authenticated;

-- Завершение миграции
SELECT 'PAGE_EVENTS_MIGRATION completed successfully' AS status;