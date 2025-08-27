-- ===== Миграция для системы автоматического трекинга визитов =====

-- Создаем таблицу для отслеживания визитов на сайты клиентов
CREATE TABLE IF NOT EXISTS site_visits (
    id BIGSERIAL PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    visitor_id TEXT NOT NULL, -- FingerprintJS visitor ID
    request_id TEXT, -- FingerprintJS request ID  
    page_url TEXT NOT NULL, -- Полный URL страницы
    page_title TEXT DEFAULT '', -- Заголовок страницы
    referrer TEXT DEFAULT '', -- Откуда пришел пользователь
    user_agent TEXT DEFAULT '', -- User-Agent браузера
    utm_source TEXT, -- UTM метки
    utm_medium TEXT,
    utm_campaign TEXT,
    visited_at TIMESTAMPTZ DEFAULT NOW(), -- Время визита
    meta_data JSONB DEFAULT '{}', -- Дополнительные метаданные
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_site_visits_client_id ON site_visits(client_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_visitor_id ON site_visits(visitor_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_visited_at ON site_visits(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_visits_page_url ON site_visits(page_url);

-- Комбинированный индекс для проверки дублей (клиент + посетитель + URL + время)
CREATE INDEX IF NOT EXISTS idx_site_visits_duplicate_check 
ON site_visits(client_id, visitor_id, page_url, visited_at);

-- Индекс для UTM аналитики
CREATE INDEX IF NOT EXISTS idx_site_visits_utm 
ON site_visits(utm_source, utm_medium, utm_campaign) 
WHERE utm_source IS NOT NULL;

-- Индекс для поиска по домену
CREATE INDEX IF NOT EXISTS idx_site_visits_domain 
ON site_visits USING GIN (to_tsvector('english', page_url));

-- Комментарии к полям
COMMENT ON TABLE site_visits IS 'Автоматический трекинг визитов пользователей на сайты клиентов';
COMMENT ON COLUMN site_visits.visitor_id IS 'Уникальный ID посетителя из FingerprintJS';
COMMENT ON COLUMN site_visits.request_id IS 'ID запроса FingerprintJS для этого визита';
COMMENT ON COLUMN site_visits.page_url IS 'Полный URL посещенной страницы';
COMMENT ON COLUMN site_visits.meta_data IS 'JSON с дополнительными данными (браузер, разрешение, etc)';

-- Настройка автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_site_visits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER site_visits_updated_at
    BEFORE UPDATE ON site_visits
    FOR EACH ROW
    EXECUTE FUNCTION update_site_visits_updated_at();

-- Примеры запросов для аналитики:

-- Уникальные посетители по клиентам за последние 30 дней
-- SELECT client_id, COUNT(DISTINCT visitor_id) as unique_visitors 
-- FROM site_visits 
-- WHERE visited_at >= NOW() - INTERVAL '30 days' 
-- GROUP BY client_id;

-- Самые популярные страницы
-- SELECT page_url, COUNT(*) as visits 
-- FROM site_visits 
-- WHERE visited_at >= NOW() - INTERVAL '7 days' 
-- GROUP BY page_url 
-- ORDER BY visits DESC;

-- UTM эффективность
-- SELECT utm_source, utm_medium, utm_campaign, COUNT(*) as visits
-- FROM site_visits 
-- WHERE utm_source IS NOT NULL 
-- GROUP BY utm_source, utm_medium, utm_campaign 
-- ORDER BY visits DESC;
