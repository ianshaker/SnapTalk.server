-- ===== Миграция для уникального ключа client_topics =====
-- Исправляет проблему дублирующихся топиков для одного посетителя

-- ❌ ПРОБЛЕМА: Один visitor_id создает несколько топиков для одного клиента
-- ✅ РЕШЕНИЕ: Уникальный ключ на комбинацию (client_id, visitor_id)

-- 1️⃣ Удаляем дублирующиеся записи (оставляем самые новые)
WITH ranked_topics AS (
  SELECT 
    *,
    ROW_NUMBER() OVER (
      PARTITION BY client_id, visitor_id 
      ORDER BY created_at DESC
    ) as rn
  FROM client_topics 
  WHERE visitor_id IS NOT NULL
)
DELETE FROM client_topics 
WHERE id IN (
  SELECT id FROM ranked_topics WHERE rn > 1
);

-- 2️⃣ Создаем уникальный индекс для предотвращения дублей
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_topics_unique_visitor 
ON client_topics (client_id, visitor_id) 
WHERE visitor_id IS NOT NULL;

-- 3️⃣ Комментарий для понимания
COMMENT ON INDEX idx_client_topics_unique_visitor 
IS 'Предотвращает создание нескольких топиков для одного посетителя у одного клиента';

-- ✅ РЕЗУЛЬТАТ: 
-- - Один visitor_id = один топик у одного клиента
-- - Повторные визиты используют существующий топик
-- - Новые посетители получают новые топики
