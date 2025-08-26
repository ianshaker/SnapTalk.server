/**
 * 📊 PAGE TRACKING ROUTES
 * 
 * API для трекинга переходов по страницам сайтов клиентов:
 * - POST /api/track/page - основной эндпоинт для трекинга
 * - Сохранение событий в таблицу page_events
 * - Отправка уведомлений в Telegram с антиспам-фильтром
 * - Поиск клиента по siteKey (api_key)
 * 
 * Структура данных:
 * - siteKey (api_key клиента)
 * - visitorId (уникальный ID посетителя)
 * - requestId (ID запроса для связи событий)
 * - clientId (ID клиента, опционально)
 * - url (полный URL страницы)
 * - path (путь страницы)
 * - title (заголовок страницы)
 * - referrer (источник перехода)
 * - utm параметры (source, medium, campaign, term, content)
 */

import express from 'express';
import { supabaseDB } from '../config/supabase.js';
import { sb } from '../config/env.js';
import { ensureTopicForVisitor, sendTelegramMessage } from '../services/telegramService.js';
import { apiKeys } from './snapTalkClients.js';

const router = express.Router();

// Кэш для антиспам-фильтра: visitorId -> { lastEvent, lastPath, events }
const antiSpamCache = new Map();

// Константы для антиспам-фильтра
const ANTI_SPAM_DELAY = 10000; // 10 секунд
const VISITOR_CACHE_TTL = 30 * 60 * 1000; // 30 минут для очистки кэша посетителей
const MAX_VISITOR_EVENTS = 100; // Максимальное количество событий в кэше для одного посетителя

/**
 * Утилита для логирования с временной меткой
 */
function logWithTimestamp(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] 📊 ${message}`, data);
  } else {
    console.log(`[${timestamp}] 📊 ${message}`);
  }
}

// Кэш для клиентов с TTL (время жизни кэша)
const clientCache = new Map();
const CLIENT_CACHE_TTL = 5 * 60 * 1000; // 5 минут

/**
 * Очистка устаревших записей из кэша клиентов
 */
function cleanupClientCache() {
  const now = Date.now();
  for (const [key, value] of clientCache.entries()) {
    if (now - value.timestamp > CLIENT_CACHE_TTL) {
      clientCache.delete(key);
      logWithTimestamp(`Removed expired client from cache: ${key}`);
    }
  }
}

/**
 * Поиск клиента по siteKey (api_key) с многоуровневым кэшированием
 * @param {string} siteKey - API ключ клиента
 * @returns {Object|null} - Данные клиента или null
 */
async function findClientBySiteKey(siteKey) {
  try {
    // Валидация входного параметра
    if (!siteKey || typeof siteKey !== 'string' || siteKey.trim().length === 0) {
      logWithTimestamp('Invalid siteKey provided');
      return null;
    }

    const trimmedSiteKey = siteKey.trim();
    
    // 1. Проверяем кэш apiKeys (основной кэш)
    if (apiKeys.has(trimmedSiteKey)) {
      const cachedClient = apiKeys.get(trimmedSiteKey);
      
      // Проверяем, что у клиента есть необходимые поля
      if (cachedClient && cachedClient.id) {
        logWithTimestamp(`Client found in apiKeys cache: ${cachedClient.id}`);
        
        // Обновляем локальный кэш
        clientCache.set(trimmedSiteKey, {
          client: cachedClient,
          timestamp: Date.now()
        });
        
        return cachedClient;
      }
    }

    // 2. Проверяем локальный кэш с TTL
    const cachedEntry = clientCache.get(trimmedSiteKey);
    if (cachedEntry && (Date.now() - cachedEntry.timestamp) < CLIENT_CACHE_TTL) {
      logWithTimestamp(`Client found in local cache: ${cachedEntry.client.id}`);
      return cachedEntry.client;
    }

    // 3. Очищаем устаревшие записи из кэша
    cleanupClientCache();

    // 4. Поиск в базе данных
    logWithTimestamp(`Searching client in database for siteKey: ${trimmedSiteKey}`);
    
    const { data, error } = await supabaseDB
      .from('clients')
      .select(`
        id,
        client_name,
        api_key,
        integration_status,
        telegram_bot_token,
        telegram_group_id,
        user_id,
        created_at
      `)
      .eq('api_key', trimmedSiteKey)
      .eq('integration_status', 'active')
      .maybeSingle();

    // Обработка ошибок базы данных
    if (error) {
      logWithTimestamp(`Database error while finding client:`, {
        code: error.code,
        message: error.message,
        details: error.details
      });
      
      // Для некоторых ошибок возвращаем null, для других - выбрасываем исключение
      if (error.code === 'PGRST116') {
        // Клиент не найден - это нормальная ситуация
        return null;
      }
      
      // Критические ошибки базы данных
      throw new Error(`Database error: ${error.message}`);
    }

    // 5. Обработка результата
    if (!data) {
      logWithTimestamp(`Client not found for siteKey: ${trimmedSiteKey}`);
      
      // Кэшируем отрицательный результат на короткое время
      clientCache.set(trimmedSiteKey, {
        client: null,
        timestamp: Date.now()
      });
      
      return null;
    }

    // 6. Валидация найденного клиента
    if (!data.id || !data.client_name) {
      logWithTimestamp(`Invalid client data found:`, data);
      return null;
    }

    logWithTimestamp(`Client found in database: ${data.id} (${data.client_name})`);
    
    // 7. Сохраняем в кэш
    clientCache.set(trimmedSiteKey, {
      client: data,
      timestamp: Date.now()
    });
    
    // 8. Опционально обновляем основной кэш apiKeys
    if (!apiKeys.has(trimmedSiteKey)) {
      logWithTimestamp(`Adding client to apiKeys cache: ${data.id}`);
      apiKeys.set(trimmedSiteKey, data);
    }

    return data;
    
  } catch (error) {
    logWithTimestamp(`Critical error finding client by siteKey:`, {
      siteKey: siteKey,
      error: error.message,
      stack: error.stack
    });
    
    // В случае критической ошибки возвращаем null
    // но логируем для мониторинга
    return null;
  }
}

/**
 * Принудительное обновление клиента в кэше
 * @param {string} siteKey - API ключ клиента
 * @returns {Object|null} - Обновленные данные клиента
 */
async function refreshClientCache(siteKey) {
  try {
    // Удаляем из всех кэшей
    clientCache.delete(siteKey);
    apiKeys.delete(siteKey);
    
    logWithTimestamp(`Cache cleared for siteKey: ${siteKey}`);
    
    // Загружаем заново
    return await findClientBySiteKey(siteKey);
  } catch (error) {
    logWithTimestamp(`Error refreshing client cache:`, error);
    return null;
  }
}

/**
 * Получение статистики кэша клиентов
 * @returns {Object} - Статистика кэша
 */
function getClientCacheStats() {
  const now = Date.now();
  let activeEntries = 0;
  let expiredEntries = 0;
  
  for (const [key, value] of clientCache.entries()) {
    if (now - value.timestamp > CLIENT_CACHE_TTL) {
      expiredEntries++;
    } else {
      activeEntries++;
    }
  }
  
  return {
    totalEntries: clientCache.size,
    activeEntries,
    expiredEntries,
    apiKeysCache: apiKeys.size,
    cacheTTL: CLIENT_CACHE_TTL
  };
}

/**
 * Очистка устаревших записей из антиспам-кэша
 */
function cleanupAntiSpamCache() {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [visitorId, visitorData] of antiSpamCache.entries()) {
    // Удаляем посетителей, которые не активны более 30 минут
    if (now - visitorData.lastEvent > VISITOR_CACHE_TTL) {
      antiSpamCache.delete(visitorId);
      cleanedCount++;
    } else {
      // Очищаем старые события (оставляем только последние)
      if (visitorData.events && visitorData.events.length > MAX_VISITOR_EVENTS) {
        visitorData.events = visitorData.events.slice(-MAX_VISITOR_EVENTS);
      }
    }
  }
  
  if (cleanedCount > 0) {
    logWithTimestamp(`Cleaned ${cleanedCount} expired visitors from anti-spam cache`);
  }
}

/**
 * Проверка антиспам-фильтра для visitorId
 * @param {string} visitorId - ID посетителя
 * @param {string} pagePath - Путь страницы
 * @param {number} clientId - ID клиента (для логирования)
 * @returns {boolean} - true если событие можно обработать
 */
function shouldProcessEvent(visitorId, pagePath, clientId) {
  const now = Date.now();
  
  // Валидация входных параметров
  if (!visitorId || typeof visitorId !== 'string') {
    logWithTimestamp(`Anti-spam: invalid visitorId provided`);
    return false;
  }
  
  if (!pagePath || typeof pagePath !== 'string') {
    logWithTimestamp(`Anti-spam: invalid pagePath provided`);
    return false;
  }
  
  // Очищаем устаревшие записи периодически
  if (Math.random() < 0.01) { // 1% вероятность очистки при каждом вызове
    cleanupAntiSpamCache();
  }
  
  // Инициализируем данные посетителя если их нет
  if (!antiSpamCache.has(visitorId)) {
    antiSpamCache.set(visitorId, {
      lastEvent: 0,
      lastPath: '',
      events: [],
      clientId: clientId
    });
  }
  
  const visitorData = antiSpamCache.get(visitorId);
  
  // Проверяем временной интервал (не чаще 10 секунд)
  if (now - visitorData.lastEvent < ANTI_SPAM_DELAY) {
    logWithTimestamp(`Anti-spam: too frequent events for visitor ${visitorId} (client ${clientId})`);
    return false;
  }
  
  // Проверяем повтор пути
  if (visitorData.lastPath === pagePath) {
    logWithTimestamp(`Anti-spam: repeated path ${pagePath} for visitor ${visitorId} (client ${clientId})`);
    return false;
  }
  
  // Проверяем историю событий (дополнительная защита от спама)
  const recentEvents = visitorData.events.filter(event => now - event.timestamp < ANTI_SPAM_DELAY * 3);
  if (recentEvents.length >= 3) {
    logWithTimestamp(`Anti-spam: too many recent events for visitor ${visitorId} (client ${clientId})`);
    return false;
  }
  
  // Обновляем данные посетителя
  visitorData.lastEvent = now;
  visitorData.lastPath = pagePath;
  visitorData.clientId = clientId; // Обновляем clientId на случай если посетитель переходит между сайтами
  
  // Добавляем событие в историю
  visitorData.events.push({
    timestamp: now,
    path: pagePath,
    clientId: clientId
  });
  
  // Ограничиваем размер истории событий
  if (visitorData.events.length > MAX_VISITOR_EVENTS) {
    visitorData.events = visitorData.events.slice(-MAX_VISITOR_EVENTS);
  }
  
  logWithTimestamp(`Anti-spam: event approved for visitor ${visitorId} on path ${pagePath} (client ${clientId})`);
  return true;
}

/**
 * Проверка антиспам-фильтра для уведомлений (совместимость с существующим кодом)
 * @param {number} clientId - ID клиента
 * @param {string} pagePath - Путь страницы
 * @returns {boolean} - true если можно отправить уведомление
 */
function shouldSendNotification(clientId, pagePath) {
  // Эта функция оставлена для совместимости с существующим кодом
  // В новой логике используется shouldProcessEvent с visitorId
  const now = Date.now();
  const cacheKey = `client_${clientId}`;
  
  if (!antiSpamCache.has(cacheKey)) {
    antiSpamCache.set(cacheKey, { 
      lastEvent: 0, 
      lastPath: '', 
      events: [],
      clientId: clientId 
    });
  }
  
  const cache = antiSpamCache.get(cacheKey);
  
  // Проверяем временной интервал (не чаще 10 секунд)
  if (now - cache.lastEvent < ANTI_SPAM_DELAY) {
    logWithTimestamp(`Anti-spam: too frequent notifications for client ${clientId}`);
    return false;
  }
  
  // Проверяем повтор пути
  if (cache.lastPath === pagePath) {
    logWithTimestamp(`Anti-spam: repeated path ${pagePath} for client ${clientId}`);
    return false;
  }
  
  // Обновляем кэш
  cache.lastEvent = now;
  cache.lastPath = pagePath;
  
  return true;
}

/**
 * Извлечение page_path из полного URL
 * @param {string} url - Полный URL
 * @returns {string} - Путь страницы
 */
function extractPagePath(url) {
  try {
    const urlObj = new URL(url);
    let path = urlObj.pathname;
    
    // Добавляем query параметры если они есть
    if (urlObj.search) {
      path += urlObj.search;
    }
    
    // Добавляем hash если он есть
    if (urlObj.hash) {
      path += urlObj.hash;
    }
    
    return path;
  } catch (error) {
    logWithTimestamp(`Error extracting path from URL: ${url}`, error);
    // Возвращаем исходный URL как fallback
    return url;
  }
}

/**
 * Подготовка данных события для сохранения
 * @param {Object} eventData - Исходные данные события
 * @returns {Object} - Подготовленные данные для базы
 */
function prepareEventData(eventData) {
  // Извлекаем page_path из URL
  const pagePath = extractPagePath(eventData.url);
  
  // Подготавливаем UTM параметры
  const utmData = {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_term: null,
    utm_content: null
  };
  
  if (eventData.utm && typeof eventData.utm === 'object') {
    Object.keys(utmData).forEach(key => {
      const utmKey = key.replace('utm_', '');
      if (eventData.utm[utmKey] && typeof eventData.utm[utmKey] === 'string') {
        const value = eventData.utm[utmKey].trim();
        utmData[key] = value.length > 0 ? value : null;
      }
    });
  }
  
  // Подготавливаем основные данные
  const preparedData = {
    client_id: eventData.clientId,
    visitor_id: eventData.visitorId?.trim() || null,
    request_id: eventData.requestId?.trim() || null,
    page_url: eventData.url?.trim() || null,
    page_path: pagePath,
    page_title: eventData.title?.trim() || null,
    referrer: eventData.referrer?.trim() || null,
    ...utmData,
    user_agent: eventData.userAgent?.trim() || null,
    ip_address: eventData.ipAddress?.trim() || null,
    event_timestamp: eventData.timestamp || new Date().toISOString()
  };
  
  return preparedData;
}

/**
 * Сохранение события в таблицу page_events
 * @param {Object} eventData - Данные события
 * @returns {Object|null} - Сохраненное событие или null
 */
async function savePageEvent(eventData) {
  try {
    // Подготавливаем данные для сохранения
    const preparedData = prepareEventData(eventData);
    
    logWithTimestamp(`Saving page event:`, {
      client_id: preparedData.client_id,
      visitor_id: preparedData.visitor_id,
      page_path: preparedData.page_path,
      page_title: preparedData.page_title,
      utm_source: preparedData.utm_source,
      utm_campaign: preparedData.utm_campaign
    });
    
    // Сохраняем в базу данных
    const { data, error } = await supabaseDB
      .from('page_events')
      .insert(preparedData)
      .select(`
        id,
        client_id,
        visitor_id,
        request_id,
        page_url,
        page_path,
        page_title,
        referrer,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        user_agent,
        ip_address,
        event_timestamp,
        created_at
      `)
      .single();

    if (error) {
      logWithTimestamp(`Database error saving page event:`, {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // Возвращаем более детальную информацию об ошибке
      throw new Error(`Database error: ${error.message}`);
    }

    logWithTimestamp(`Page event saved successfully:`, {
      id: data.id,
      client_id: data.client_id,
      page_path: data.page_path,
      visitor_id: data.visitor_id
    });
    
    return data;
    
  } catch (error) {
    logWithTimestamp(`Exception saving page event:`, {
      error: error.message,
      stack: error.stack,
      eventData: {
        clientId: eventData.clientId,
        visitorId: eventData.visitorId,
        url: eventData.url,
        path: eventData.path
      }
    });
    
    // Перебрасываем ошибку для обработки на верхнем уровне
    throw error;
  }
}

/**
 * Отправка уведомления в Telegram
 * @param {Object} client - Данные клиента
 * @param {Object} eventData - Данные события
 */
async function sendTelegramNotification(client, eventData) {
  try {
    logWithTimestamp(`Sending Telegram notification for client ${client.id}:`, {
      path: eventData.path,
      title: eventData.title,
      visitor: eventData.visitorId
    });
    
    // Подготовка метаданных для топика
    const meta = {
      title: eventData.title,
      ref: eventData.referrer,
      utm: eventData.utm
    };
    
    // Поиск или создание топика для посетителя
    const topicResult = await ensureTopicForVisitor(
      eventData.clientId,
      client,
      eventData.visitorId,
      eventData.requestId,
      eventData.url,
      meta
    );
    
    const { topicId, isExistingVisitor, previousUrl, firstVisit } = 
      typeof topicResult === 'object' ? topicResult : { topicId: topicResult, isExistingVisitor: false };
    
    // Формирование сообщения в зависимости от статуса посетителя
    let message, prefix;
    
    if (isExistingVisitor) {
      // Повторный визит
      prefix = `🔄 ПОВТОРНЫЙ ВИЗИТ\n\n`;
      
      const timeSinceFirst = firstVisit ? 
        Math.round((new Date() - new Date(firstVisit)) / (1000 * 60)) : null;
      
      message = `👤 <b>Посетитель:</b> ${eventData.visitorId.slice(0, 8)}...\n`;
      message += `📄 <b>Страница:</b> ${eventData.path}\n`;
      
      if (eventData.title) {
        message += `📝 <b>Заголовок:</b> ${eventData.title}\n`;
      }
      
      if (previousUrl && previousUrl !== eventData.url) {
        const prevPath = extractPagePath(previousUrl);
        message += `📍 <b>Предыдущая:</b> ${prevPath}\n`;
      }
      
      if (timeSinceFirst) {
        message += `⏱️ <b>Время с первого визита:</b> ${timeSinceFirst} мин\n`;
      }
      
      if (eventData.referrer) {
        message += `🔗 <b>Источник:</b> ${eventData.referrer}\n`;
      }
      
      // UTM параметры
      if (eventData.utm) {
        const utmParts = [];
        if (eventData.utm.source) utmParts.push(`source=${eventData.utm.source}`);
        if (eventData.utm.medium) utmParts.push(`medium=${eventData.utm.medium}`);
        if (eventData.utm.campaign) utmParts.push(`campaign=${eventData.utm.campaign}`);
        
        if (utmParts.length > 0) {
          message += `🎯 <b>UTM:</b> ${utmParts.join(', ')}\n`;
        }
      }
      
      message += `\n🌐 <a href="${eventData.url}">Открыть страницу</a>`;
      
    } else {
      // Новый посетитель
      prefix = `🆕 НОВЫЙ ВИЗИТ\n\n`;
      
      message = `👤 <b>Новый посетитель:</b> ${eventData.visitorId.slice(0, 8)}...\n`;
      message += `📄 <b>Первая страница:</b> ${eventData.path}\n`;
      
      if (eventData.title) {
        message += `📝 <b>Заголовок:</b> ${eventData.title}\n`;
      }
      
      if (eventData.referrer) {
        message += `🔗 <b>Источник перехода:</b> ${eventData.referrer}\n`;
      }
      
      // UTM параметры для нового посетителя
      if (eventData.utm) {
        const utmParts = [];
        if (eventData.utm.source) utmParts.push(`source=${eventData.utm.source}`);
        if (eventData.utm.medium) utmParts.push(`medium=${eventData.utm.medium}`);
        if (eventData.utm.campaign) utmParts.push(`campaign=${eventData.utm.campaign}`);
        if (eventData.utm.term) utmParts.push(`term=${eventData.utm.term}`);
        if (eventData.utm.content) utmParts.push(`content=${eventData.utm.content}`);
        
        if (utmParts.length > 0) {
          message += `🎯 <b>UTM параметры:</b> ${utmParts.join(', ')}\n`;
        }
      }
      
      message += `\n🌐 <a href="${eventData.url}">Открыть страницу</a>`;
    }
    
    // Отправка сообщения в Telegram
    await sendTelegramMessage(topicId, message, prefix, client);
    
    logWithTimestamp(`Telegram notification sent successfully to topic ${topicId}`);
    
  } catch (error) {
    logWithTimestamp(`Error sending Telegram notification:`, error);
    throw error; // Пробрасываем ошибку для обработки в основном эндпоинте
  }
}

// ===== ОСНОВНЫЕ ЭНДПОИНТЫ =====

/**
 * Валидация входящих данных для трекинга страниц
 * @param {Object} data - Данные запроса
 * @returns {Object} - Результат валидации { isValid, errors, cleanData }
 */
function validateTrackingData(data) {
  const errors = [];
  const cleanData = {};

  // Обязательные поля
  if (!data.siteKey || typeof data.siteKey !== 'string' || data.siteKey.trim().length === 0) {
    errors.push('siteKey is required and must be a non-empty string');
  } else {
    cleanData.siteKey = data.siteKey.trim();
  }

  if (!data.visitorId || typeof data.visitorId !== 'string' || data.visitorId.trim().length === 0) {
    errors.push('visitorId is required and must be a non-empty string');
  } else {
    cleanData.visitorId = data.visitorId.trim();
  }

  if (!data.url || typeof data.url !== 'string' || data.url.trim().length === 0) {
    errors.push('url is required and must be a non-empty string');
  } else {
    cleanData.url = data.url.trim();
    
    // Валидация URL
    try {
      new URL(cleanData.url);
    } catch {
      errors.push('url must be a valid URL');
    }
  }

  if (!data.path || typeof data.path !== 'string' || data.path.trim().length === 0) {
    errors.push('path is required and must be a non-empty string');
  } else {
    cleanData.path = data.path.trim();
    
    // Валидация пути (должен начинаться с /)
    if (!cleanData.path.startsWith('/')) {
      cleanData.path = '/' + cleanData.path;
    }
  }

  // Опциональные поля
  if (data.requestId !== undefined) {
    if (typeof data.requestId === 'string') {
      cleanData.requestId = data.requestId.trim() || null;
    } else {
      errors.push('requestId must be a string if provided');
    }
  }

  if (data.clientId !== undefined) {
    if (typeof data.clientId === 'number' || (typeof data.clientId === 'string' && !isNaN(parseInt(data.clientId)))) {
      cleanData.clientId = parseInt(data.clientId);
    } else {
      errors.push('clientId must be a number if provided');
    }
  }

  if (data.title !== undefined) {
    if (typeof data.title === 'string') {
      cleanData.title = data.title.trim() || null;
    } else {
      errors.push('title must be a string if provided');
    }
  }

  if (data.referrer !== undefined) {
    if (typeof data.referrer === 'string') {
      cleanData.referrer = data.referrer.trim() || null;
    } else {
      errors.push('referrer must be a string if provided');
    }
  }

  // Валидация UTM параметров
  if (data.utm !== undefined) {
    if (typeof data.utm === 'object' && data.utm !== null) {
      cleanData.utm = {};
      
      const utmFields = ['source', 'medium', 'campaign', 'term', 'content'];
      for (const field of utmFields) {
        if (data.utm[field] !== undefined) {
          if (typeof data.utm[field] === 'string') {
            cleanData.utm[field] = data.utm[field].trim() || null;
          } else {
            errors.push(`utm.${field} must be a string if provided`);
          }
        }
      }
    } else {
      errors.push('utm must be an object if provided');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    cleanData
  };
}

/**
 * POST /api/track/page
 * Основной эндпоинт для трекинга переходов по страницам
 */
router.post('/track/page', async (req, res) => {
  try {
    logWithTimestamp('New page tracking request received');
    
    // 1. Валидация входящих данных
    const validation = validateTrackingData(req.body);
    
    if (!validation.isValid) {
      logWithTimestamp('Validation failed:', validation.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      });
    }
    
    const data = validation.cleanData;
    logWithTimestamp('Data validated successfully:', { 
      siteKey: data.siteKey, 
      visitorId: data.visitorId, 
      path: data.path 
    });
    
    // 2. Поиск клиента по siteKey
    const client = await findClientBySiteKey(data.siteKey);
    
    if (!client) {
      logWithTimestamp(`Client not found for siteKey: ${data.siteKey}`);
      return res.status(404).json({
        success: false,
        error: 'Client not found',
        message: 'Invalid siteKey or inactive client'
      });
    }
    
    // Используем найденный client_id или переданный clientId
    const clientId = data.clientId || client.id;
    logWithTimestamp(`Using clientId: ${clientId}`);
    
    // 3. Подготовка данных события
    const eventData = {
      clientId,
      visitorId: data.visitorId,
      requestId: data.requestId,
      url: data.url,
      path: data.path,
      title: data.title,
      referrer: data.referrer,
      utm: data.utm,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString()
    };
    
    // 4. Проверка антиспам-фильтра для visitorId
    const pagePath = extractPagePath(data.url || data.path);
    
    if (!shouldProcessEvent(data.visitorId, pagePath, clientId)) {
      logWithTimestamp(`Event blocked by anti-spam filter for visitor ${data.visitorId}`);
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: 'Event blocked by anti-spam filter',
        details: 'Please wait before sending another event from this visitor'
      });
    }
    
    // 5. Сохранение события в базу данных
    let savedEvent;
    try {
      savedEvent = await savePageEvent(eventData);
    } catch (saveError) {
      logWithTimestamp('Failed to save page event:', saveError.message);
      
      // Определяем тип ошибки сохранения
      let statusCode = 503; // Service Unavailable для проблем с БД
      let errorMessage = 'Database service unavailable';
      
      if (saveError.message.includes('validation') || saveError.message.includes('constraint')) {
        statusCode = 400;
        errorMessage = 'Data validation error';
      }
      
      return res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: 'Failed to save page event',
        details: saveError.message
      });
    }
    
    logWithTimestamp(`Page event saved with ID: ${savedEvent.id}`);
    
    // 6. Проверка антиспам-фильтра для уведомлений (дополнительная проверка)
    if (shouldSendNotification(clientId, pagePath)) {
      try {
        await sendTelegramNotification(client, eventData);
        logWithTimestamp('Telegram notification sent successfully');
      } catch (telegramError) {
        // Ошибки Telegram не должны блокировать основной функционал
        logWithTimestamp('Warning: Failed to send Telegram notification:', telegramError.message);
        // Продолжаем выполнение, событие уже сохранено
      }
    } else {
      logWithTimestamp('Telegram notification skipped (anti-spam filter)');
    }
    
    // 6. Успешный ответ
    res.json({
      success: true,
      message: 'Page event tracked successfully',
      data: {
        eventId: savedEvent.id,
        clientId,
        visitorId: data.visitorId,
        path: data.path,
        timestamp: savedEvent.created_at
      }
    });
    
  } catch (error) {
    logWithTimestamp('Error in page tracking endpoint:', error);
    
    // Определяем тип ошибки для правильного HTTP статуса
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    
    if (error.message.includes('Client not found')) {
      statusCode = 404;
      errorMessage = 'Client not found';
    } else if (error.message.includes('Validation')) {
      statusCode = 400;
      errorMessage = 'Validation error';
    } else if (error.message.includes('Database')) {
      statusCode = 503;
      errorMessage = 'Database unavailable';
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ===== ОТЛАДОЧНЫЕ ЭНДПОИНТЫ =====

/**
 * Получение статистики антиспам-кэша
 * @returns {Object} - Статистика кэша посетителей
 */
function getAntiSpamCacheStats() {
  const now = Date.now();
  let totalVisitors = 0;
  let activeVisitors = 0;
  let totalEvents = 0;
  let recentEvents = 0;
  const clientDistribution = new Map();
  
  for (const [visitorId, visitorData] of antiSpamCache.entries()) {
    totalVisitors++;
    
    // Считаем активных посетителей (активность в последние 30 минут)
    if (now - visitorData.lastEvent <= VISITOR_CACHE_TTL) {
      activeVisitors++;
    }
    
    // Считаем события
    if (visitorData.events && Array.isArray(visitorData.events)) {
      totalEvents += visitorData.events.length;
      
      // Считаем недавние события (последние 10 минут)
      const recentEventCount = visitorData.events.filter(
        event => now - event.timestamp <= 10 * 60 * 1000
      ).length;
      recentEvents += recentEventCount;
    }
    
    // Распределение по клиентам
    const clientId = visitorData.clientId || 'unknown';
    clientDistribution.set(clientId, (clientDistribution.get(clientId) || 0) + 1);
  }
  
  return {
    totalVisitors,
    activeVisitors,
    totalEvents,
    recentEvents,
    clientDistribution: Object.fromEntries(clientDistribution),
    cacheSize: antiSpamCache.size,
    settings: {
      delayMs: ANTI_SPAM_DELAY,
      cacheTtlMs: VISITOR_CACHE_TTL,
      maxEventsPerVisitor: MAX_VISITOR_EVENTS
    }
  };
}

/**
 * GET /api/track/status
 * Проверка статуса API трекинга с информацией о кэше
 */
router.get('/status', (req, res) => {
  try {
    const clientCacheStats = getClientCacheStats();
    const antiSpamStats = getAntiSpamCacheStats();
    
    res.json({
      success: true,
      message: 'Page tracking API is operational',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      features: {
        pageTracking: true,
        antiSpamFilter: true,
        telegramNotifications: true,
        databaseStorage: true
      },
      cache: {
        clients: clientCacheStats,
        antiSpam: antiSpamStats
      },
      uptime: process.uptime()
    });
  } catch (error) {
    logWithTimestamp('Error in status endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/track/cache/refresh
 * Принудительное обновление кэша клиента
 */
router.post('/cache/refresh', async (req, res) => {
  try {
    const { siteKey } = req.body;
    
    if (!siteKey) {
      return res.status(400).json({
        success: false,
        error: 'siteKey is required'
      });
    }
    
    logWithTimestamp(`Manual cache refresh requested for siteKey: ${siteKey}`);
    
    const client = await refreshClientCache(siteKey);
    
    if (client) {
      res.json({
        success: true,
        message: 'Client cache refreshed successfully',
        client: {
          id: client.id,
          name: client.client_name,
          siteKey: client.api_key
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Client not found or inactive',
        siteKey
      });
    }
    
  } catch (error) {
    logWithTimestamp('Error in cache refresh endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/track/cache/cleanup
 * Принудительная очистка антиспам-кэша
 */
router.post('/cache/cleanup', (req, res) => {
  try {
    const beforeSize = antiSpamCache.size;
    
    // Принудительная очистка кэша
    cleanupAntiSpamCache();
    
    const afterSize = antiSpamCache.size;
    const cleanedCount = beforeSize - afterSize;
    
    logWithTimestamp(`Manual anti-spam cache cleanup completed: ${cleanedCount} entries removed`);
    
    res.json({
      success: true,
      message: 'Anti-spam cache cleanup completed',
      stats: {
        beforeSize,
        afterSize,
        cleanedCount
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logWithTimestamp('Error in cache cleanup endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * DELETE /api/track/cache/visitor/:visitorId
 * Удаление конкретного посетителя из антиспам-кэша
 */
router.delete('/cache/visitor/:visitorId', (req, res) => {
  try {
    const { visitorId } = req.params;
    
    if (!visitorId) {
      return res.status(400).json({
        success: false,
        error: 'visitorId is required'
      });
    }
    
    const existed = antiSpamCache.has(visitorId);
    
    if (existed) {
      antiSpamCache.delete(visitorId);
      logWithTimestamp(`Visitor ${visitorId} removed from anti-spam cache`);
      
      res.json({
        success: true,
        message: 'Visitor removed from anti-spam cache',
        visitorId,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Visitor not found in cache',
        visitorId
      });
    }
    
  } catch (error) {
    logWithTimestamp('Error in visitor removal endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/track/test/telegram
 * Тестирование Telegram уведомлений
 */
router.post('/test/telegram', async (req, res) => {
  try {
    const { siteKey, visitorId, url, title } = req.body;
    
    // Валидация обязательных полей
    if (!siteKey || !visitorId || !url) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['siteKey', 'visitorId', 'url']
      });
    }
    
    // Поиск клиента
    const client = await findClientBySiteKey(siteKey);
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found',
        siteKey
      });
    }
    
    // Подготовка тестовых данных
    const testEventData = {
      clientId: client.id,
      visitorId,
      requestId: `test-${Date.now()}`,
      url,
      path: extractPagePath(url),
      title: title || 'Test Page Title',
      referrer: 'https://test-referrer.com',
      utm: {
        source: 'test',
        medium: 'api',
        campaign: 'telegram-test'
      },
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString()
    };
    
    logWithTimestamp(`Testing Telegram notification for client ${client.id}`);
    
    // Отправка тестового уведомления
    await sendTelegramNotification(client, testEventData);
    
    res.json({
      success: true,
      message: 'Test Telegram notification sent successfully',
      data: {
        clientId: client.id,
        clientName: client.client_name,
        visitorId,
        testUrl: url,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logWithTimestamp('Error in Telegram test endpoint:', error);
    
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    
    if (error.message.includes('Client not found')) {
      statusCode = 404;
      errorMessage = 'Client not found';
    } else if (error.message.includes('Telegram')) {
      statusCode = 503;
      errorMessage = 'Telegram service error';
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;