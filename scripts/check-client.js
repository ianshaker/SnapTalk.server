import { supabaseDB } from '../src/config/supabase.js';

async function checkClient() {
  try {
    const { data: client, error } = await supabaseDB
      .from('clients')
      .select('client_name, website_url, api_key, integration_status')
      .eq('api_key', 'snaptalk_cwj09fmbtzo_1756137141423')
      .single();

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Client data:', client);
    
    if (client.website_url) {
      try {
        const domain = new URL(client.website_url).hostname;
        console.log('Extracted domain:', domain);
      } catch (urlError) {
        console.log('Invalid URL, domain will be set to *');
      }
    } else {
      console.log('No website_url set, domain will be set to *');
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
  
  process.exit(0);
}

checkClient();