import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const sb = createClient(supabaseUrl, supabaseKey);

async function checkVisitorStatus() {
  try {
    console.log('🔍 Проверяем статус посетителя Jeho6pNL...');
    
    // Ищем записи для посетителя Jeho6pNL
    const { data, error } = await sb
      .from('client_topics')
      .select('client_id, visitor_id, last_session_status, updated_at, created_at')
      .ilike('visitor_id', 'Jeho6pNL%')
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('❌ Ошибка запроса:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('❌ Записи для посетителя Jeho6pNL не найдены');
      return;
    }
    
    console.log(`✅ Найдено ${data.length} записей:`);
    data.forEach((record, index) => {
      console.log(`\n${index + 1}. Запись:`);
      console.log(`   Client ID: ${record.client_id}`);
      console.log(`   Visitor ID: ${record.visitor_id}`);
      console.log(`   Last Session Status: ${record.last_session_status || 'NULL'}`);
      console.log(`   Created: ${record.created_at}`);
      console.log(`   Updated: ${record.updated_at}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

checkVisitorStatus();