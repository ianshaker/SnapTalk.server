/**
 * 🚀 PAGE TRACKING API - MAIN ROUTER
 * 
 * Основной роутер для системы трекинга страниц.
 * Объединяет все модули и предоставляет API эндпоинты.
 * 
 * Структура API:
 * - POST /api/track/page - основной эндпоинт для трекинга переходов
 * - GET /api/track/status - статус API и диагностика
 * - POST /api/track/cache/refresh - обновление кэша клиентов
 * - POST /api/track/cache/cleanup - очистка антиспам-кэша
 * - DELETE /api/track/cache/visitor/:visitorId - удаление посетителя из кэша
 * - POST /api/track/test/telegram - тестирование Telegram уведомлений
 */

import express from 'express';
import { logWithTimestamp, prepareEventData } from './utils.js';
import { validateTrackingData, validateTelegramTestData, validateSiteKey, validateVisitorId } from './validation.js';
import { findClientBySiteKey, refreshClientCache, getClientCacheStats } from './clientCache.js';
import { shouldProcessEvent, getAntiSpamCacheStats, forceCleanupAntiSpamCache, removeVisitorFromCache } from './antiSpamFilter.js';
import { savePageEvent, checkDatabaseConnection } from './database.js';
import { sendTelegramNotification, sendTestTelegramNotification, validateTelegramConfig } from './notifications.js';

const router = express.Router();

/**
 * 📊 POST /api/track/page
 * Основной эндпоинт для трекинга переходов по страницам
 */
router.post('/page', async (req, res) => {
  const startTime = Date.now();
  
  try {
    logWithTimestamp('Received page tracking request');
    
    // Валидация входных данных
    const validation = validateTrackingData(req.body);
    if (!validation.isValid) {
      logWithTimestamp(`Validation failed: ${validation.errors.join(', ')}`);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      });
    }
    
    const { siteKey, visitorId, url, title, referrer, userAgent } = req.body;
    
    // Поиск клиента по siteKey
    const client = await findClientBySiteKey(siteKey);
    if (!client) {
      logWithTimestamp(`Client not found for siteKey: ${siteKey}`);
      return res.status(404).json({
        success: false,
        error: 'Client not found for provided siteKey'
      });
    }
    
    logWithTimestamp(`Processing page tracking for client ${client.id} (${client.site_name || client.site_url})`);
    
    // Подготовка данных события
    const eventData = prepareEventData({
      clientId: client.id,
      visitorId,
      url,
      title,
      referrer,
      userAgent,
      ipAddress: req.ip || req.connection.remoteAddress
    });
    
    // Проверка антиспам-фильтра
    if (!shouldProcessEvent(visitorId, eventData.page_path, client.id)) {
      logWithTimestamp(`Event blocked by anti-spam filter for visitor ${visitorId}`);
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: 'Event blocked by anti-spam filter'
      });
    }
    
    // Сохранение события в базу данных
    const saveResult = await savePageEvent(eventData);
    if (!saveResult.success) {
      logWithTimestamp(`Failed to save page event: ${saveResult.error}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to save page event',
        details: saveResult.error
      });
    }
    
    logWithTimestamp(`Page event saved successfully: ${saveResult.eventId}`);
    
    // Отправка Telegram уведомления (асинхронно, не блокируем ответ)
    let telegramResult = { success: false, skipped: true };
    
    try {
      telegramResult = await sendTelegramNotification(client, eventData, visitorId);
      if (telegramResult.success) {
        logWithTimestamp(`Telegram notification sent for visitor ${visitorId}`);
      } else if (!telegramResult.skipped) {
        logWithTimestamp(`Telegram notification failed: ${telegramResult.error}`);
      }
    } catch (telegramError) {
      logWithTimestamp(`Telegram notification error: ${telegramError.message}`);
      telegramResult = { success: false, error: telegramError.message };
    }
    
    const processingTime = Date.now() - startTime;
    
    // Успешный ответ
    res.status(200).json({
      success: true,
      message: 'Page event tracked successfully',
      data: {
        eventId: saveResult.eventId,
        siteId: client.id,
        visitorId: visitorId,
        pagePath: eventData.page_path,
        timestamp: saveResult.createdAt,
        telegram: {
          sent: telegramResult.success,
          skipped: telegramResult.skipped || false,
          error: telegramResult.error || null
        },
        processingTimeMs: processingTime
      }
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logWithTimestamp(`Error processing page tracking request: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      processingTimeMs: processingTime
    });
  }
});

/**
 * 🔍 GET /api/track/status
 * Статус API и диагностическая информация
 */
router.get('/status', async (req, res) => {
  try {
    logWithTimestamp('Status check requested');
    
    // Проверка подключения к базе данных
    const dbCheck = await checkDatabaseConnection();
    
    // Статистика кэшей
    const clientCacheStats = getClientCacheStats();
    const antiSpamStats = getAntiSpamCacheStats();
    
    const status = {
      success: true,
      status: 'operational',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      database: {
        connected: dbCheck.connected,
        error: dbCheck.error || null
      },
      cache: {
        clients: clientCacheStats,
        antiSpam: antiSpamStats
      },
      endpoints: {
        'POST /api/track/page': 'Main tracking endpoint',
        'GET /api/track/status': 'API status and diagnostics',
        'POST /api/track/cache/refresh': 'Refresh client cache',
        'POST /api/track/cache/cleanup': 'Cleanup anti-spam cache',
        'DELETE /api/track/cache/visitor/:visitorId': 'Remove visitor from cache',
        'POST /api/track/test/telegram': 'Test Telegram notifications'
      }
    };
    
    res.status(200).json(status);
    
  } catch (error) {
    logWithTimestamp(`Error getting API status: ${error.message}`);
    
    res.status(500).json({
      success: false,
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 🔄 POST /api/track/cache/refresh
 * Принудительное обновление кэша клиентов
 */
router.post('/cache/refresh', async (req, res) => {
  try {
    logWithTimestamp('Manual client cache refresh requested');
    
    const result = await refreshClientCache();
    
    res.status(200).json({
      success: true,
      message: 'Client cache refreshed successfully',
      ...result
    });
    
  } catch (error) {
    logWithTimestamp(`Error refreshing client cache: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: 'Failed to refresh client cache',
      details: error.message
    });
  }
});

/**
 * 🧹 POST /api/track/cache/cleanup
 * Принудительная очистка антиспам-кэша
 */
router.post('/cache/cleanup', async (req, res) => {
  try {
    logWithTimestamp('Manual anti-spam cache cleanup requested');
    
    const cleanedCount = forceCleanupAntiSpamCache();
    
    res.status(200).json({
      success: true,
      message: 'Anti-spam cache cleaned successfully',
      cleanedCount: cleanedCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logWithTimestamp(`Error cleaning anti-spam cache: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: 'Failed to clean anti-spam cache',
      details: error.message
    });
  }
});

/**
 * 🗑️ DELETE /api/track/cache/visitor/:visitorId
 * Удаление конкретного посетителя из антиспам-кэша
 */
router.delete('/cache/visitor/:visitorId', async (req, res) => {
  try {
    const { visitorId } = req.params;
    
    // Валидация visitorId
    const validation = validateVisitorId(visitorId);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid visitor ID',
        details: validation.errors
      });
    }
    
    logWithTimestamp(`Manual visitor cache removal requested for: ${visitorId}`);
    
    const removed = removeVisitorFromCache(visitorId);
    
    if (removed) {
      res.status(200).json({
        success: true,
        message: 'Visitor removed from cache successfully',
        visitorId: visitorId,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Visitor not found in cache',
        visitorId: visitorId
      });
    }
    
  } catch (error) {
    logWithTimestamp(`Error removing visitor from cache: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: 'Failed to remove visitor from cache',
      details: error.message
    });
  }
});

/**
 * 📱 POST /api/track/test/telegram
 * Тестирование Telegram уведомлений
 */
router.post('/test/telegram', async (req, res) => {
  try {
    logWithTimestamp('Telegram test notification requested');
    
    // Валидация входных данных
    const validation = validateTelegramTestData(req.body);
    if (!validation.valid) {
      logWithTimestamp(`Telegram test validation failed: ${validation.errors.join(', ')}`);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      });
    }
    
    const { siteKey, visitorId, url } = req.body;
    
    // Поиск клиента
    const client = await findClientBySiteKey(siteKey);
    if (!client) {
      logWithTimestamp(`Client not found for siteKey: ${siteKey}`);
      return res.status(404).json({
        success: false,
        error: 'Client not found for provided siteKey'
      });
    }
    
    // Проверка конфигурации Telegram
    const telegramConfig = validateTelegramConfig(client);
    if (!telegramConfig.valid) {
      logWithTimestamp(`Telegram configuration invalid for client ${client.id}: ${telegramConfig.errors.join(', ')}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid Telegram configuration',
        details: telegramConfig.errors
      });
    }
    
    // Отправка тестового уведомления
    const result = await sendTestTelegramNotification(client, visitorId, url);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Test Telegram notification sent successfully',
        data: {
          messageId: result.messageId,
          topicId: result.topicId,
          testData: result.testData,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send test notification',
        details: result.error,
        testData: result.testData
      });
    }
    
  } catch (error) {
    logWithTimestamp(`Error sending test Telegram notification: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Экспорт роутера
export default router;