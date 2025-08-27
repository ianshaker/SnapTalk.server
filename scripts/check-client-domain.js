import { config } from 'dotenv';
import { supabaseDB } from '../src/config/supabase.js';

config();

async function checkClientDomain() {
  try {
    console.log('🔧 Supabase config:', {
      url: process.env.SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      keyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...'
    });

    const clientId = '455ec955-98b4-4139-9dec-c2abb72c916b';
    const apiKey = 'snaptalk_cwj09fmbtzo_1756137141423';

    // Получаем полную информацию о клиенте
    const { data: client, error } = await supabaseDB
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error) {
      console.error('❌ Error fetching client:', error);
      return;
    }

    if (!client) {
      console.log('❌ Client not found');
      return;
    }

    console.log('✅ Client details:');
    console.log('   ID:', client.id);
    console.log('   Name:', client.client_name);
    console.log('   API Key:', client.api_key);
    console.log('   Domain:', client.domain || 'NOT SET');
    console.log('   Status:', client.integration_status);
    console.log('   Created:', client.created_at);
    console.log('   Updated:', client.updated_at);
    
    // Проверяем, есть ли поле domain
    if (!client.domain) {
      console.log('\n⚠️  Domain field is empty or null!');
      console.log('   This causes 403 Forbidden errors when loading widget');
      console.log('   Need to set domain to "*" or "localhost" for testing');
    } else {
      console.log('\n✅ Domain is set to:', client.domain);
      if (client.domain !== '*' && !client.domain.includes('localhost')) {
        console.log('   ⚠️  This domain may block localhost requests');
      }
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

checkClientDomain();