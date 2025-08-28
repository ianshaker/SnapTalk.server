// ===== Роутер для трекинга визитов =====

import express from 'express';
import { processVisit, updateLastVisit } from '../services/visitTrackingService.js';

const router = express.Router();

/**
 * 🎯 POST /track - Трекинг визитов на сайт
 * Обрабатывает уведомления о посещениях страниц
 */
router.post('/track', async (req, res) => {
  const startTime = Date.now();
  console.log('\n🔄 === VISIT TRACKING REQUEST ===');
  
  try {
    const { apiKey, visitorId, url, meta } = req.body;
    
    // Валидация входных данных
    if (!apiKey) {
      console.log('❌ Missing apiKey');
      return res.status(400).json({ error: 'API key is required' });
    }
    
    if (!url) {
      console.log('❌ Missing url');
      return res.status(400).json({ error: 'URL is required' });
    }
    
    console.log(`📊 Visit data:`);
    console.log(`   API Key: ${apiKey?.slice(0,8)}...`);
    console.log(`   Visitor: ${visitorId?.slice(0,8)}...`);
    console.log(`   URL: ${url}`);
    console.log(`   Meta: ${meta?.title || 'No title'}`);
    
    // Получаем функцию pushToClient из app.locals (устанавливается в server.js)
    const pushToClient = req.app.locals.pushToClient;
    
    // Обработка визита
    const result = await processVisit({
      apiKey,
      visitorId,
      url,
      meta
    }, pushToClient);
    
    if (!result.success) {
      console.log(`❌ Visit processing failed: ${result.error}`);
      return res.status(400).json({ error: result.error });
    }
    
    // Если визит был пропущен из-за недавней активности
    if (result.skipped) {
      console.log(`⏰ Visit skipped: ${result.reason}`);
      return res.json({ 
        success: true, 
        skipped: true, 
        reason: result.reason 
      });
    }
    
    // Обновляем информацию о последнем визите
    await updateLastVisit(result.clientId, visitorId, url);
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Visit tracking completed in ${processingTime}ms`);
    console.log('=== END VISIT TRACKING ===\n');
    
    res.json({
      success: true,
      clientId: result.clientId,
      isFirstVisit: result.isFirstVisit,
      telegramSent: result.telegramSent,
      processingTime
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Visit tracking error:', error);
    console.log(`❌ Visit tracking failed in ${processingTime}ms`);
    console.log('=== END VISIT TRACKING (ERROR) ===\n');
    
    res.status(500).json({ 
      error: 'Internal server error',
      processingTime
    });
  }
});

export default router;