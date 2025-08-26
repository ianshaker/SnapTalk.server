/**
 * 🔧 ADMIN ROUTES
 * 
 * Административные эндпоинты для управления сервером:
 * - Управление кэшем клиентов
 * - Отладочные эндпоинты 
 * - Диагностика системы
 * - Управление базой данных
 * 
 * Вынесено из server.js для упрощения основного файла (129 строк → отдельный модуль)
 */

import { Router } from 'express';
import { apiKeys, loadActiveClientsToApiKeys, updateClientInApiKeys } from './snapTalkClients.js';
import { supabaseDB } from '../config/supabase.js';
import { sb, SUPABASE_URL, SUPABASE_SERVICE_ROLE } from '../config/env.js';

const router = Router();

// ===== УПРАВЛЕНИЕ КЭШЕМ КЛИЕНТОВ =====

// Перезагрузка активных клиентов в кэш
router.get('/admin/reload-clients', async (req, res) => {
  try {
    await loadActiveClientsToApiKeys();
    res.json({
      success: true,
      message: 'Active clients reloaded',
      apiKeysCount: apiKeys.size
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Синхронизация конкретного клиента в кэше
router.post('/admin/sync-client/:apiKey', async (req, res) => {
  try {
    const { apiKey } = req.params;
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key required'
      });
    }

    const updated = await updateClientInApiKeys(apiKey);
    
    res.json({
      success: true,
      updated,
      message: updated 
        ? `Client ${apiKey} cache updated successfully`
        : `Client ${apiKey} not found or inactive`,
      apiKeysCount: apiKeys.size
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Просмотр загруженных API ключей
router.get('/admin/api-keys', (req, res) => {
  const keys = Array.from(apiKeys.keys());
  res.json({ 
    success: true, 
    apiKeys: keys,
    total: keys.length 
  });
});

// ===== УПРАВЛЕНИЕ БАЗОЙ ДАННЫХ =====

// Создание таблицы client_topics через простую проверку
router.post('/admin/create-topics-table', async (req, res) => {
  try {
    if (!sb) {
      return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }

    console.log('🔧 Creating client_topics table...');

    // Пробуем создать запись для проверки существования таблицы
    const { error: testError } = await sb
      .from('client_topics')
      .select('id')
      .limit(1);

    if (testError && testError.code === 'PGRST205') {
      // Таблица не существует - нужно создать вручную в Supabase Dashboard
      console.log('❌ Table client_topics does not exist. Please create it manually in Supabase Dashboard.');
      return res.json({ 
        success: false, 
        error: 'Table does not exist',
        instructions: 'Please create table client_topics manually in Supabase Dashboard with SQL migration'
      });
    }

    console.log('✅ client_topics table exists');
    res.json({ success: true, message: 'client_topics table exists' });

  } catch (error) {
    console.error('❌ Create table error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ОТЛАДОЧНЫЕ ЭНДПОИНТЫ =====

// Отладка клиентов в Supabase
router.get('/admin/debug-clients', async (req, res) => {
  try {
    console.log('🔍 Debug clients request - checking Supabase connection...');
    
    const { data: allClients, error } = await supabaseDB
      .from('clients')
      .select('id, client_name, api_key, integration_status, telegram_bot_token, telegram_group_id')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Supabase query error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    console.log(`✅ Found ${allClients?.length || 0} clients in Supabase`);

    res.json({ 
      success: true, 
      clients: allClients || [],
      total: allClients?.length || 0,
      supabaseUrl: SUPABASE_URL,
      hasServiceKey: !!SUPABASE_SERVICE_ROLE
    });
  } catch (error) {
    console.error('❌ Debug clients error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Отладка маршрутов виджетов
router.get('/debug/widget-routes', (req, res) => {
  res.json({
    message: 'Widget routes are handled by /src/routes/widgets.js',
    expectedEndpoint: '/api/widget.js',
    demoTest: '/api/widget.js?key=demo-snaptalk-2025',
    status: 'working'
  });
});

// ===== СИСТЕМНАЯ ИНФОРМАЦИЯ =====

// Главная страница с информацией о сервере  
router.get('/', (req, res) => {
  res.json({
    service: 'SnapTalk Server',
    version: '2.0.0',
    status: 'running',
    description: 'Live chat service with Telegram integration',
    frontend: 'https://snaptalk.lovable.app',
    endpoints: {
      widget: '/api/widget.js?key=YOUR_API_KEY',
      chat: '/api/chat/send',
      visit_tracking: '/api/visit/track',
      websocket: '/ws?clientId=YOUR_CLIENT_ID',
      telegram_webhook: `/telegram/webhook/${process.env.WEBHOOK_SECRET || 'SECRET'}`,
      admin: {
        reload_clients: '/api/admin/reload-clients',
        sync_client: '/api/admin/sync-client/:apiKey',
        api_keys: '/api/admin/api-keys',
        debug_clients: '/api/admin/debug-clients'
      }
    },
    docs: 'https://github.com/ianshaker/SnapTalk.server'
  });
});

export default router;
