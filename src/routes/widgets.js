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
  const startTime = Date.now();
  
  try {
    console.log(`🟡 [${new Date().toISOString()}] Widget request started`);
    console.log(`🔑 API Key: ${req.query.key}`);
    console.log(`🌐 Origin: ${req.get('Origin') || 'none'}`);
    console.log(`🌐 Referer: ${req.get('Referer') || 'none'}`);
    
    const apiKey = req.query.key;
    
    if (!apiKey) {
      console.log(`❌ [${Date.now() - startTime}ms] No API key provided`);
      return res.status(400).type('application/javascript').send('console.error("SnapTalk: API key required");');
    }

    // Сначала проверяем в Map (быстрее)
    console.log(`🔍 [${Date.now() - startTime}ms] Checking apiKeys Map...`);
    const keyData = apiKeys.get(apiKey);
    
    if (keyData) {
      console.log(`✅ [${Date.now() - startTime}ms] Found in apiKeys Map: ${keyData.clientName}`);
      
      // Проверка домена (если не *)
      const origin = req.get('Origin') || req.get('Referer');
      if (keyData.domain !== '*' && origin && !origin.includes(keyData.domain)) {
        console.log(`❌ [${Date.now() - startTime}ms] Domain not allowed: ${origin} vs ${keyData.domain}`);
        return res.status(403).type('application/javascript').send('console.error("SnapTalk: Domain not allowed");');
      }

      // Генерируем уникальный clientId
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      const clientId = `client-${timestamp}-${random}`;

      // Получаем тексты для языка
      const texts = keyData.config.texts[keyData.language] || keyData.config.texts.ru;

      console.log(`🎨 [${Date.now() - startTime}ms] Generating widget for ${keyData.clientName}`);

      // Генерируем JavaScript код виджета
      const widgetJS = generateWidgetJS(clientId, keyData.config, texts, req.protocol + '://' + req.get('host'));

      console.log(`✅ [${Date.now() - startTime}ms] Widget generated successfully`);
      return res.type('application/javascript').send(widgetJS);
    }

    // Если не найден в Map, проверяем Supabase напрямую
    console.log(`🔍 [${Date.now() - startTime}ms] Not in Map, checking Supabase...`);
    
    const { data: client, error } = await supabaseDB
      .from('clients')
      .select('*')
      .eq('api_key', apiKey)
      .eq('integration_status', 'active')
      .single();

    if (error) {
      console.log(`❌ [${Date.now() - startTime}ms] Supabase error:`, error.message);
      return res.status(404).type('application/javascript').send('console.error("SnapTalk: Client not found");');
    }

    if (!client) {
      console.log(`❌ [${Date.now() - startTime}ms] Client not found or inactive`);
      return res.status(404).type('application/javascript').send('console.error("SnapTalk: Client not found or inactive");');
    }

    console.log(`✅ [${Date.now() - startTime}ms] Found client in Supabase: ${client.client_name}`);

    // Простой тестовый виджет из Supabase данных
    const widgetCode = `
// SnapTalk Widget for ${client.client_name} (from Supabase)
console.log("🚀 SnapTalk Widget loaded for: ${client.client_name}");
console.log("⏱️ Load time: ${Date.now() - startTime}ms");

(function() {
  const widget = document.createElement('div');
  widget.id = 'snaptalk-widget';
  widget.style.cssText = \`
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    background: ${client.widget_color || '#70B347'};
    border-radius: 50%;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 9999;
    font-family: Arial, sans-serif;
    font-size: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  \`;
  widget.innerHTML = '💬';
  widget.title = '${client.widget_title || 'Чат поддержки'}';

  widget.onclick = function() {
    alert('SnapTalk активирован!\\nКлиент: ${client.client_name}\\nAPI: ${apiKey}');
  };

  document.body.appendChild(widget);
  console.log('✅ SnapTalk Widget добавлен на страницу');
})();
`;

    console.log(`✅ [${Date.now() - startTime}ms] Widget code generated from Supabase`);
    
    res.type('application/javascript')
      .header('Access-Control-Allow-Origin', '*')
      .send(widgetCode);

  } catch (e) {
    console.error(`❌ [${Date.now() - startTime}ms] Widget error:`, e);
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
