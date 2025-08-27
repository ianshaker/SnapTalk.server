-- ===== ИСПРАВЛЕННАЯ Миграция для корректной уникальности topic_id =====
-- ПРОБЛЕМА: topic_id уникален только в рамках одного chat_id (бота/форума)
-- РЕШЕНИЕ: Добавляем chat_id и создаем составной уникальный ключ

-- ❌ СТАРАЯ ПРОБЛЕМА: topic_id считался глобально уникальным
-- ✅ НОВОЕ РЕШЕНИЕ: уникальность (topic_id + chat_id)

-- 1️⃣ Добавляем колонку chat_id в таблицу client_topics
ALTER TABLE client_topics 
ADD COLUMN IF NOT EXISTS chat_id BIGINT;

-- 2️⃣ Обновляем существующие записи значением по умолчанию (текущий SUPERGROUP_ID)
-- Это безопасно, так как сейчас используется только один бот
UPDATE client_topics 
SET chat_id = CAST(COALESCE(NULLIF(current_setting('app.supergroup_id', true), ''), '0') AS BIGINT)
WHERE chat_id IS NULL;

-- Если переменная не установлена, используем значение из env (нужно заменить вручную)
-- UPDATE client_topics SET chat_id = -1001234567890 WHERE chat_id IS NULL;

-- 3️⃣ Удаляем старый некорректный индекс (если существует)
DROP INDEX IF EXISTS idx_client_topics_unique_topic_id;

-- 4️⃣ Создаем КОРРЕКТНЫЙ составной уникальный индекс
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_topics_unique_topic_chat 
ON client_topics (topic_id, chat_id) 
WHERE topic_id IS NOT NULL AND chat_id IS NOT NULL;

-- 5️⃣ Добавляем комментарий для документации
COMMENT ON INDEX idx_client_topics_unique_topic_chat 
IS 'Обеспечивает уникальность (topic_id + chat_id) - один топик может существовать в разных чатах';

-- 6️⃣ Создаем функцию для проверки уникальности при вставке
CREATE OR REPLACE FUNCTION check_topic_chat_uniqueness()
RETURNS TRIGGER AS $$
BEGIN
    -- Проверяем только если topic_id и chat_id не NULL
    IF NEW.topic_id IS NOT NULL AND NEW.chat_id IS NOT NULL THEN
        -- Проверяем существование комбинации (topic_id + chat_id) у другого клиента
        IF EXISTS (
            SELECT 1 FROM client_topics 
            WHERE topic_id = NEW.topic_id 
            AND chat_id = NEW.chat_id
            AND client_id != NEW.client_id
            AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        ) THEN
            RAISE EXCEPTION 'Комбинация topic_id=% и chat_id=% уже используется другим клиентом. В одном чате топик может принадлежать только одному клиенту.', NEW.topic_id, NEW.chat_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7️⃣ Создаем триггер для проверки при INSERT и UPDATE
DROP TRIGGER IF EXISTS trigger_check_topic_id_uniqueness ON client_topics;
DROP TRIGGER IF EXISTS trigger_check_topic_chat_uniqueness ON client_topics;
CREATE TRIGGER trigger_check_topic_chat_uniqueness
    BEFORE INSERT OR UPDATE ON client_topics
    FOR EACH ROW
    EXECUTE FUNCTION check_topic_chat_uniqueness();

-- 8️⃣ Добавляем индекс для быстрого поиска по (topic_id + chat_id)
CREATE INDEX IF NOT EXISTS idx_client_topics_lookup_topic_chat 
ON client_topics (topic_id, chat_id) 
WHERE topic_id IS NOT NULL AND chat_id IS NOT NULL;

-- ✅ РЕЗУЛЬТАТ:
-- - Один topic_id может существовать в разных chat_id (разных ботах/форумах)
-- - В рамках одного chat_id каждый topic_id уникален для одного client_id
-- - Корректная маршрутизация сообщений от разных Telegram ботов
-- - Автоматическая проверка при вставке/обновлении записей

-- 📝 ПРИМЕЧАНИЯ:
-- - NULL значения topic_id и chat_id разрешены
-- - Ограничение применяется только к НЕ-NULL значениям
-- - Триггер предоставляет детальные сообщения об ошибках
-- - Поддержка множественных ботов с одинаковыми topic_id