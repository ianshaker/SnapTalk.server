/**
 * 🗄️ CLIENT CACHE MODULE
 * 
 * Модуль кэширования клиентов для системы трекинга страниц:
 * - Многоуровневое кэширование клиентов
 * - Поиск клиентов по siteKey (api_key)
 * - Управление TTL кэша
 * - Статистика кэша
 */

import { sb } from '../../config/env.js';
import { apiKeys } from '../snapTalkClients.js';
import { logWithTimestamp } from './utils.js';

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
export async function findClientBySiteKey(siteKey) {
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
    
    const { data, error } = await sb
      .from('clients')
      .select(`
        id,
        client_name,
        api_key,
        integration_status,
        telegram_bot_token,
        telegram_chat_id,
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
export async function refreshClientCache(siteKey) {
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
export function getClientCacheStats() {
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
 * Принудительная очистка всего кэша клиентов
 */
export function clearClientCache() {
  const beforeSize = clientCache.size;
  clientCache.clear();
  logWithTimestamp(`Client cache cleared: ${beforeSize} entries removed`);
  return beforeSize;
}

/**
 * Получение информации о конкретном клиенте из кэша
 * @param {string} siteKey - API ключ клиента
 * @returns {Object|null} - Информация о клиенте в кэше или null
 */
export function getClientCacheInfo(siteKey) {
  const cachedEntry = clientCache.get(siteKey);
  if (!cachedEntry) {
    return null;
  }
  
  const now = Date.now();
  const age = now - cachedEntry.timestamp;
  const isExpired = age > CLIENT_CACHE_TTL;
  
  return {
    client: cachedEntry.client,
    timestamp: cachedEntry.timestamp,
    age,
    isExpired,
    ttl: CLIENT_CACHE_TTL
  };
}