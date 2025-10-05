-- ===== Добавление столбцов для отслеживания сессий в таблицу site_visits =====

-- Добавляем столбец session_duration для хранения длительности сессии
ALTER TABLE site_visits 
ADD COLUMN IF NOT EXISTS session_duration TEXT DEFAULT NULL;

-- Добавляем столбец updated_at для отслеживания времени обновления записи
ALTER TABLE site_visits 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Комментарии к новым столбцам
COMMENT ON COLUMN site_visits.session_duration IS 'Длительность сессии в миллисекундах (заполняется при завершении сессии)';
COMMENT ON COLUMN site_visits.updated_at IS 'Время последнего обновления записи';

-- Создаем функцию для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_site_visits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS site_visits_updated_at ON site_visits;
CREATE TRIGGER site_visits_updated_at
    BEFORE UPDATE ON site_visits
    FOR EACH ROW
    EXECUTE FUNCTION update_site_visits_updated_at();

-- Индекс для session_duration
CREATE INDEX IF NOT EXISTS idx_site_visits_session_duration
ON site_visits(session_duration) WHERE session_duration IS NOT NULL;

-- Индекс для updated_at
CREATE INDEX IF NOT EXISTS idx_site_visits_updated_at
ON site_visits(updated_at DESC);