import { sb } from './src/config/env.js';

async function checkSiteVisitsSchema() {
  try {
    console.log('🔍 Checking site_visits table schema...');
    
    // Попробуем вставить запись только с обязательными полями
    const testData = {
      client_id: 'test-client',
      visitor_id: 'test-visitor',
      page_url: 'https://test.com'
    };
    
    const { error: insertError } = await sb
      .from('site_visits')
      .insert(testData);
    
    if (insertError) {
      console.log('❌ Insert error with minimal data:', insertError.message);
    } else {
      console.log('✅ Minimal insert successful');
      
      // Удаляем тестовую запись
      await sb
        .from('site_visits')
        .delete()
        .eq('client_id', 'test-client')
        .eq('visitor_id', 'test-visitor');
    }
    
    // Теперь попробуем с session_duration и updated_at
    const testDataWithSession = {
      client_id: 'test-client-2',
      visitor_id: 'test-visitor-2',
      page_url: 'https://test.com',
      session_duration: '5000',
      updated_at: new Date().toISOString()
    };
    
    const { error: sessionError } = await sb
      .from('site_visits')
      .insert(testDataWithSession);
    
    if (sessionError) {
      console.log('❌ Insert error with session fields:', sessionError.message);
    } else {
      console.log('✅ Insert with session fields successful');
      
      // Удаляем тестовую запись
      await sb
        .from('site_visits')
        .delete()
        .eq('client_id', 'test-client-2')
        .eq('visitor_id', 'test-visitor-2');
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

checkSiteVisitsSchema();