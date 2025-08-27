import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of this file and find .env in project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

// Load environment variables from .env file in project root
dotenv.config({ path: join(projectRoot, '.env') });

// Environment variables
export const PORT = process.env.PORT || 3000;
export const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const SUPERGROUP_ID = process.env.TELEGRAM_SUPERGROUP_ID && Number(process.env.TELEGRAM_SUPERGROUP_ID);
export const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'dev-secret';

export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mdzsswlwebxrxprxrnam.supabase.co';
export const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kenNzd2x3ZWJ4cnhwcnhybmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjIzNjAsImV4cCI6MjA3MTY5ODM2MH0.6y-WjM4MukQ8adqDOC0MR37iV2MuYinHKbnrN5YFuuw';

// CORS настройки
export const allowedOrigins = [
  'https://savov.lovable.app',
  'https://snaptalk.lovable.app',
  'http://localhost:5173', // для разработки
  'http://localhost:3000', // для тестовой страницы
  // Lovable sandbox домены
  'https://61b20835-88ce-4d70-ae0d-161637c5d5b4.sandbox.lovable.dev'
];

// Регекс для всех Lovable sandbox доменов
export const lovableSandboxRegex = /^https:\/\/[a-z0-9-]+\.sandbox\.lovable\.dev$/;

// Supabase clients
export const sb = (SUPABASE_URL && SUPABASE_SERVICE_ROLE)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
  : null;

export const sbAuth = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
