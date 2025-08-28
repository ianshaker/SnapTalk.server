import { supabaseDB } from '../src/config/supabase.js';

async function findApiKey() {
  try {
    const { data: client, error } = await supabaseDB
      .from('clients')
      .select('id, client_name, api_key, integration_status')
      .eq('id', '455ec955-98b4-4139-9dec-c2abb72c916b')
      .single();

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    if (client) {
      console.log('✅ Client found:');
      console.log(`   ID: ${client.id}`);
      console.log(`   Name: ${client.client_name}`);
      console.log(`   API Key: ${client.api_key}`);
      console.log(`   Status: ${client.integration_status}`);
    } else {
      console.log('❌ Client not found');
    }
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

findApiKey();