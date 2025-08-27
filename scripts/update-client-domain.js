import { supabaseDB } from '../src/config/supabase.js';

async function updateClientDomain() {
  try {
    // Обновляем domain на "*" для разрешения всех доменов
    const { data, error } = await supabaseDB
      .from('clients')
      .update({ website_url: '*' })
      .eq('api_key', 'snaptalk_cwj09fmbtzo_1756137141423')
      .select();

    if (error) {
      console.error('Error updating client website_url:', error);
      return;
    }

    console.log('✅ Client website_url updated successfully to "*":', data);
    console.log('🔄 Please restart the server to reload the cache');
    
  } catch (error) {
    console.error('Script error:', error);
  }
  
  process.exit(0);
}

updateClientDomain();