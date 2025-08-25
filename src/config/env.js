import { createClient } from '@supabase/supabase-js';

// Environment variables
export const PORT = process.env.PORT || 3000;
export const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const SUPERGROUP_ID = process.env.TELEGRAM_SUPERGROUP_ID && Number(process.env.TELEGRAM_SUPERGROUP_ID);
export const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'dev-secret';

export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// CORS настройки
export const allowedOrigins = [
  'https://savov.lovable.app',
  'https://snaptalk.lovable.app',
  'http://localhost:5173' // для разработки
];

// Supabase clients
export const sb = (SUPABASE_URL && SUPABASE_SERVICE_ROLE)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
  : null;

export const sbAuth = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
