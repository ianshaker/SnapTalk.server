import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const sb = createClient(supabaseUrl, supabaseKey);

async function debugClientMismatch() {
  try {
    console.log('🔍 Отладка несоответствия client_id...');
    
    // Проверяем запись в client_topics
    const { data: topicsData, error: topicsError } = await sb
      .from('client_topics')
      .select('*')
      .eq('visitor_id', 'Jeho6pNLDG9JXqUtFU0r');
    
    if (topicsError) {
      console.error('❌ Ошибка запроса client_topics:', topicsError);
      return;
    }
    
    console.log('📋 Запись в client_topics:');
    console.log(topicsData[0]);
    
    // Проверяем последние события в page_events
    const { data: eventsData, error: eventsError } = await sb
      .from('page_events')
      .select('*')
      .eq('visitor_id', 'Jeho6pNLDG9JXqUtFU0r')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (eventsError) {
      console.error('❌ Ошибка запроса page_events:', eventsError);
      return;
    }
    
    console.log('\n📋 Последние события в page_events:');
    eventsData.forEach((event, index) => {
      console.log(`\n${index + 1}. Event:`);
      console.log(`   ID: ${event.id}`);
      console.log(`   Client ID: ${event.client_id}`);
      console.log(`   Visitor ID: ${event.visitor_id}`);
      console.log(`   Event Type: ${event.event_type}`);
      console.log(`   Session End: ${event.is_session_end}`);
      console.log(`   Created: ${event.created_at}`);
    });
    
    // Проверяем клиентов
    const clientIds = [...new Set([topicsData[0]?.client_id, ...eventsData.map(e => e.client_id)])].filter(Boolean);
    
    console.log('\n🏢 Информация о клиентах:');
    for (const clientId of clientIds) {
      const { data: clientData, error: clientError } = await sb
        .from('clients')
        .select('id, site_name, site_url, site_key')
        .eq('id', clientId);
      
      if (!clientError && clientData[0]) {
        console.log(`\n   Client ${clientId}:`);
        console.log(`   - Site Name: ${clientData[0].site_name}`);
        console.log(`   - Site URL: ${clientData[0].site_url}`);
        console.log(`   - Site Key: ${clientData[0].site_key}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

debugClientMismatch();