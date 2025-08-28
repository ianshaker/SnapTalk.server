import { sb } from './src/config/env.js';

(async () => {
  try {
    console.log('Checking new visitor status...');
    
    const { data, error } = await sb
      .from('client_topics')
      .select('visitor_id, last_session_status, created_at, updated_at')
      .eq('visitor_id', '0ZeXtJQoRFCNVpTPJ9H3')
      .single();
    
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('New visitor status:', data);
    }
  } catch (error) {
    console.error('Script error:', error);
  }
})();