import express from 'express';
import { generateWidgetJS } from '../utils/widgetGenerator.js';
import { apiKeys } from './snapTalkClients.js';

const router = express.Router();

/**
 * Возвращает готовый JavaScript код виджета для встраивания
 * GET /widget.js?key=API_KEY
 */
router.get('/widget.js', (req, res) => {
  try {
    const apiKey = req.query.key;
    
    if (!apiKey) {
      return res.status(400).type('text/plain').send('// Error: API key required');
    }

    const keyData = apiKeys.get(apiKey);
    if (!keyData) {
      return res.status(404).type('text/plain').send('// Error: Invalid API key');
    }

    // Проверка домена (если не *)
    const origin = req.get('Origin') || req.get('Referer');
    if (keyData.domain !== '*' && origin && !origin.includes(keyData.domain)) {
      return res.status(403).type('text/plain').send('// Error: Domain not allowed');
    }

    // Генерируем уникальный clientId
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const clientId = `client-${timestamp}-${random}`;

    // Получаем тексты для языка
    const texts = keyData.config.texts[keyData.language] || keyData.config.texts.ru;

    // Генерируем JavaScript код виджета
    const widgetJS = generateWidgetJS(clientId, keyData.config, texts, req.protocol + '://' + req.get('host'));

    res.type('application/javascript').send(widgetJS);
  } catch (e) {
    console.error('Widget API error:', e);
    res.status(500).type('text/plain').send('// Error: Server error');
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
