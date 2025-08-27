-- Создание таблицы для связи clientId с Telegram темами
CREATE TABLE IF NOT EXISTS public.client_topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id TEXT NOT NULL UNIQUE,
    topic_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для быстрого поиска по client_id
CREATE INDEX IF NOT EXISTS idx_client_topics_client_id ON public.client_topics(client_id);

-- RLS политики (Row Level Security)
ALTER TABLE public.client_topics ENABLE ROW LEVEL SECURITY;

-- Политика: все могут читать и писать (можно ограничить позже)
CREATE POLICY IF NOT EXISTS "client_topics_policy" 
ON public.client_topics 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Комментарии для документации
COMMENT ON TABLE public.client_topics IS 'Связь между clientId виджета и topicId в Telegram форуме';
COMMENT ON COLUMN public.client_topics.client_id IS 'Уникальный ID клиента из виджета';
COMMENT ON COLUMN public.client_topics.topic_id IS 'ID темы в Telegram форуме';
