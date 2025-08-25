import express from 'express';
import { generateWidgetJS } from '../utils/widgetGenerator.js';
import { apiKeys } from './snapTalkClients.js';
import { supabaseDB } from '../config/supabase.js';

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

    // Проверяем в Map (быстрее)
    const keyData = apiKeys.get(apiKey);
    
    if (keyData) {
      // Проверка домена (если не *)
      const origin = req.get('Origin') || req.get('Referer');
      if (keyData.domain !== '*' && origin && !origin.includes(keyData.domain)) {
        console.log(`🚫 Widget blocked: ${keyData.clientName} - wrong domain (${domain})`);
        return res.status(403).type('application/javascript').send('console.error("SnapTalk: Domain not allowed");');
      }

      // Генерируем уникальный clientId
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      const clientId = `client-${timestamp}-${random}`;

      // Получаем тексты для языка
      const texts = keyData.config.texts[keyData.language] || keyData.config.texts.ru;

      // Генерируем JavaScript код виджета - принудительно HTTPS для Render.com
      const serverUrl = req.get('host').includes('onrender.com') 
        ? 'https://' + req.get('host')
        : req.protocol + '://' + req.get('host');
      const widgetJS = generateWidgetJS(clientId, keyData.config, texts, serverUrl, apiKey, keyData.managerAvatarUrl);

      console.log(`💬 SnapTalk loaded: ${keyData.clientName} → ${domain}`);
      return res.type('application/javascript')
        .header('Cache-Control', 'no-cache, no-store, must-revalidate')
        .header('Pragma', 'no-cache')
        .header('Expires', '0')
        .send(widgetJS);
    }

    // Если не найден в Map, проверяем Supabase напрямую
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

    // Генерируем полноценный виджет из Supabase данных  
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const supabaseClientId = `client-${timestamp}-${random}`;
    
    // Создаем конфигурацию из данных Supabase
    const supabaseConfig = {
      position: { bottom: '1.5rem', right: '1.5rem', zIndex: 9999 },
      minimizedButton: {
        backgroundColor: client.widget_color || '#70B347',
        hoverBackgroundColor: '#5a9834'
      },
      texts: {
        ru: {
          greeting: 'Здравствуйте! Меня зовут Сергей. Я готов вас проконсультировать. Какие у вас вопросы?',
          reply: 'Ответить',
          managerName: client.widget_title || 'Поддержка',
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

    console.log(`💬 SnapTalk loaded: ${client.client_name} → ${domain} (from DB)`);
    
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
router.get('/widget/config', (req, res) => {
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

    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const clientId = `client-${timestamp}-${random}`;

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
