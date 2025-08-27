import express from 'express';
import { generateWidgetJS } from '../utils/widgetGenerator.js';
import { apiKeys, updateClientInApiKeys } from './snapTalkClients.js';
import { supabaseDB } from '../config/supabase.js';
import { createWidgetColorConfig } from '../utils/colorUtils.js';

const router = express.Router();

/**
 * Возвращает готовый JavaScript код виджета для встраивания
 * GET /widget.js?key=API_KEY
 */
router.get('/widget.js', async (req, res) => {
  try {
    const apiKey = req.query.key;
    const referer = req.get('Referer') || req.get('Origin') || 'unknown';
    const domain = referer.replace(/^https?:\/\//, '').split('/')[0];
    
    if (!apiKey) {
      return res.status(400).type('application/javascript').send('console.error("SnapTalk: API key required");');
    }

    // ВСЕГДА загружаем актуальные данные из Supabase (для синхронизации с фронтендом)
    const { data: client, error } = await supabaseDB
      .from('clients')
      .select('*')
      .eq('api_key', apiKey)
      .eq('integration_status', 'active')
      .single();

    if (error || !client) {
      console.log(`❌ Widget failed: Invalid API key from ${domain}`);
      return res.status(404).type('application/javascript').send('console.error("SnapTalk: Client not found");');
    }

    // Проверяем домен из кэша (для безопасности)
    const keyData = apiKeys.get(apiKey);
    if (keyData && keyData.domain !== '*') {
      const origin = req.get('Origin') || req.get('Referer');
      if (origin && !origin.includes(keyData.domain)) {
        console.log(`🚫 Widget blocked: ${client.client_name} - wrong domain (${domain})`);
        return res.status(403).type('application/javascript').send('console.error("SnapTalk: Domain not allowed");');
      }
    }

    // Используем реальный ID клиента из базы данных
    const supabaseClientId = client.id;
    
    // Создаем конфигурацию из данных Supabase
    const supabaseConfig = {
      position: { bottom: '1.5rem', right: '1.5rem', zIndex: 9999 },
      minimizedButton: {
        ...createWidgetColorConfig(client.widget_color, client.widget_color_secondary)
      },
      texts: {
        ru: {
          greeting: client.greeting_message || 'Здравствуйте! Как дела? Чем могу помочь?',
          reply: 'Ответить', 
          managerName: client.widget_title || client.client_name || 'Поддержка',
          managerStatus: 'Онлайн'
        }
      }
    };
    
    const supabaseTexts = supabaseConfig.texts.ru;
    const serverUrl = req.get('host').includes('onrender.com') 
      ? 'https://' + req.get('host')
      : req.protocol + '://' + req.get('host');
      
    const widgetCode = generateWidgetJS(
      supabaseClientId, 
      supabaseConfig, 
      supabaseTexts, 
      serverUrl, 
      apiKey,
      client.manager_avatar_url
    );

    // Обновляем кэш актуальными данными из Supabase (async для производительности)
    updateClientInApiKeys(apiKey).catch(error => {
      console.error('❌ Failed to update cache for', apiKey, error);
    });

    console.log(`💬 SnapTalk loaded: ${client.client_name} → ${domain} (from DB, cache updating...)`);
    
    return res.type('application/javascript')
      .header('Access-Control-Allow-Origin', '*')
      .header('Cache-Control', 'no-cache, no-store, must-revalidate')
      .header('Pragma', 'no-cache')
      .header('Expires', '0')
      .send(widgetCode);

  } catch (e) {
    console.error(`❌ Widget error:`, e.message);
    res.status(500).type('application/javascript').send('console.error("SnapTalk: Server error");');
  }
});

/**
 * API для получения конфигурации виджета (JSON)
 * GET /widget/config?key=API_KEY
 */
router.get('/widget/config', async (req, res) => {
  try {
    const apiKey = req.query.key;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key required' });
    }

    const keyData = apiKeys.get(apiKey);
    if (!keyData) {
      return res.status(404).json({ error: 'Invalid API key' });
    }

    // Проверка домена
    const origin = req.get('Origin') || req.get('Referer');
    if (keyData.domain !== '*' && origin && !origin.includes(keyData.domain)) {
      return res.status(403).json({ error: 'Domain not allowed' });
    }

    // Получаем реальный clientId из базы данных
    const { data: client, error } = await supabaseDB
      .from('clients')
      .select('id')
      .eq('api_key', apiKey)
      .eq('integration_status', 'active')
      .single();
      
    if (error || !client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const clientId = client.id;

    res.json({
      clientId,
      config: keyData.config,
      texts: keyData.config.texts[keyData.language] || keyData.config.texts.ru,
      serverUrl: req.protocol + '://' + req.get('host')
    });
  } catch (e) {
    console.error('Config API error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
