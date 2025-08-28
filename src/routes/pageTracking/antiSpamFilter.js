/**
 * 🛡️ ANTI-SPAM FILTER MODULE
 * 
 * Модуль антиспам-фильтра для системы трекинга страниц:
 * - Фильтрация частых запросов от одного посетителя
 * - Предотвращение повторных событий на одной странице
 * - Управление кэшем посетителей
 * - Статистика антиспам-системы
 */

import { logWithTimestamp } from './utils.js';

// Кэш для антиспам-фильтра: visitorId -> { lastEvent, lastPath, events }
const antiSpamCache = new Map();

// Константы для антиспам-фильтра
const ANTI_SPAM_DELAY = 10000; // 10 секунд между событиями от одного посетителя
const VISITOR_CACHE_TTL = 30 * 60 * 1000; // 30 минут для очистки кэша посетителей
const MAX_VISITOR_EVENTS = 100; // Максимальное количество событий в кэше для одного посетителя

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
export function shouldProcessEvent(visitorId, pagePath, clientId) {
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
export function shouldSendNotification(clientId, pagePath) {
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
 * Получение статистики антиспам-кэша
 * @returns {Object} - Статистика кэша посетителей
 */
export function getAntiSpamCacheStats() {
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
 * Принудительная очистка антиспам-кэша
 * @returns {number} - Количество удаленных записей
 */
export function forceCleanupAntiSpamCache() {
  const beforeSize = antiSpamCache.size;
  cleanupAntiSpamCache();
  const afterSize = antiSpamCache.size;
  const cleanedCount = beforeSize - afterSize;
  
  logWithTimestamp(`Manual anti-spam cache cleanup completed: ${cleanedCount} entries removed`);
  
  return cleanedCount;
}

/**
 * Удаление конкретного посетителя из антиспам-кэша
 * @param {string} visitorId - ID посетителя
 * @returns {boolean} - true если посетитель был найден и удален
 */
export function removeVisitorFromCache(visitorId) {
  const existed = antiSpamCache.has(visitorId);
  
  if (existed) {
    antiSpamCache.delete(visitorId);
    logWithTimestamp(`Visitor ${visitorId} removed from anti-spam cache`);
    return true;
  }
  
  return false;
}

/**
 * Получение информации о конкретном посетителе из кэша
 * @param {string} visitorId - ID посетителя
 * @returns {Object|null} - Информация о посетителе или null
 */
export function getVisitorCacheInfo(visitorId) {
  const visitorData = antiSpamCache.get(visitorId);
  if (!visitorData) {
    return null;
  }
  
  const now = Date.now();
  const timeSinceLastEvent = now - visitorData.lastEvent;
  const isActive = timeSinceLastEvent <= VISITOR_CACHE_TTL;
  
  return {
    visitorId,
    lastEvent: visitorData.lastEvent,
    lastPath: visitorData.lastPath,
    clientId: visitorData.clientId,
    eventCount: visitorData.events ? visitorData.events.length : 0,
    timeSinceLastEvent,
    isActive,
    recentEvents: visitorData.events ? visitorData.events.filter(
      event => now - event.timestamp <= 10 * 60 * 1000
    ).length : 0
  };
}

/**
 * Полная очистка антиспам-кэша
 * @returns {number} - Количество удаленных записей
 */
export function clearAntiSpamCache() {
  const beforeSize = antiSpamCache.size;
  antiSpamCache.clear();
  logWithTimestamp(`Anti-spam cache cleared: ${beforeSize} entries removed`);
  return beforeSize;
}