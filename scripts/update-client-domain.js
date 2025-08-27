import { supabaseDB } from '../src/config/supabase.js';

async function updateClientDomain() {
  try {
    // Обновляем website_url на localhost для тестирования
    const { data, error } = await supabaseDB
      .from('clients')
      .update({ website_url: 'http://localhost:3000' })
      .eq('api_key', 'snaptalk_cwj09fmbtzo_1756137141423')
      .select();

    if (error) {
      console.error('Error updating client:', error);
      return;
    }

    console.log('✅ Client domain updated successfully:', data);
    console.log('🔄 Please restart the server to reload the cache');
    
  } catch (error) {
    console.error('Script error:', error);
  }
  
  process.exit(0);
}

updateClientDomain();