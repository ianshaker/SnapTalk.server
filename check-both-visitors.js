import { sb } from './src/config/env.js';

async function checkBothVisitors() {
  const visitorIds = ['0ZeXtJQoRFCNVpTPJ9H3', 'Jeho6pNLDG9JXqUtFU0r'];
  
  console.log('=== ПРОВЕРКА ОБОИХ VISITOR_ID ===\n');
  
  for (const visitorId of visitorIds) {
    console.log(`\n--- VISITOR_ID: ${visitorId} ---`);
    
    // Проверяем client_topics
    const { data: clientTopics, error: topicsError } = await sb
      .from('client_topics')
      .select('*')
      .eq('visitor_id', visitorId);
    
    if (topicsError) {
      console.error('Ошибка при запросе client_topics:', topicsError);
    } else {
      console.log('CLIENT_TOPICS:');
      if (clientTopics.length === 0) {
        console.log('  Записей не найдено');
      } else {
        clientTopics.forEach((record, index) => {
          console.log(`  Запись ${index + 1}:`);
          console.log(`    client_id: ${record.client_id}`);
          console.log(`    topic_id: ${record.topic_id}`);
          console.log(`    last_session_status: ${record.last_session_status}`);
          console.log(`    created_at: ${record.created_at}`);
          console.log(`    updated_at: ${record.updated_at}`);
          console.log(`    page_url: ${record.page_url}`);
        });
      }
    }
    
    // Проверяем page_events
    const { data: pageEvents, error: eventsError } = await sb
      .from('page_events')
      .select('*')
      .eq('visitor_id', visitorId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (eventsError) {
      console.error('Ошибка при запросе page_events:', eventsError);
    } else {
      console.log('PAGE_EVENTS (последние 5):');
      if (pageEvents.length === 0) {
        console.log('  Записей не найдено');
      } else {
        pageEvents.forEach((event, index) => {
          console.log(`  Событие ${index + 1}:`);
          console.log(`    client_id: ${event.client_id}`);
          console.log(`    event_type: ${event.event_type}`);
          console.log(`    created_at: ${event.created_at}`);
          console.log(`    page_url: ${event.page_url}`);
        });
      }
    }
    
    // Проверяем clients
    const { data: clients, error: clientsError } = await sb
      .from('clients')
      .select('*')
      .in('id', clientTopics?.map(ct => ct.client_id) || []);
    
    if (clientsError) {
      console.error('Ошибка при запросе clients:', clientsError);
    } else {
      console.log('CLIENTS:');
      if (clients.length === 0) {
        console.log('  Записей не найдено');
      } else {
        clients.forEach((client, index) => {
          console.log(`  Клиент ${index + 1}:`);
          console.log(`    id: ${client.id}`);
          console.log(`    domain: ${client.domain}`);
          console.log(`    name: ${client.name}`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(50));
  }
}

checkBothVisitors().catch(console.error);