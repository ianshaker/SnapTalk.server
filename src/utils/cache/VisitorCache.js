/**
 * 🧠 VISITOR CACHE SERVICE
 * 
 * Управление кэшированием посетителей для предотвращения race condition:
 * - In-memory кэш данных посетителей
 * - Promise-based блокировка для предотвращения дублирования запросов
 * - Автоматическая очистка устаревших записей
 * 
 * Вынесен из telegramService.js для улучшения архитектуры
 */

// ===== Константы кэширования =====
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

class VisitorCache {
  constructor() {
    // Кэш для предотвращения одновременной обработки одного visitor_id
    this.processingCache = new Map(); // visitorId -> Promise
    
    // Кэш данных посетителей
    this.dataCache = new Map(); // visitorId -> { topicId, clientId, pageUrl, timestamp }
  }

  /**
   * Очистка устаревших записей из кэша
   */
  cleanExpiredCache() {
    const now = Date.now();
    for (const [visitorId, cacheData] of this.dataCache.entries()) {
      if (now - cacheData.timestamp > CACHE_TTL) {
        this.dataCache.delete(visitorId);
        console.log(`🧹 Cleaned expired cache for visitor ${visitorId.slice(0,8)}...`);
      }
    }
  }

  /**
   * Получение данных посетителя из кэша
   * @param {string} visitorId - ID посетителя
   * @returns {Object|null} - Данные посетителя или null
   */
  getCachedVisitor(visitorId) {
    if (!visitorId) return null;
    
    this.cleanExpiredCache();
    
    const cached = this.dataCache.get(visitorId);
    if (cached) {
      console.log(`💾 Found visitor ${visitorId.slice(0,8)}... in cache: topic_id=${cached.topicId}`);
      return {
        topic_id: cached.topicId,
        visitor_id: visitorId,
        client_id: cached.clientId,
        created_at: new Date(cached.timestamp).toISOString(),
        page_url: cached.pageUrl
      };
    }
    
    return null;
  }

  /**
   * Сохранение данных посетителя в кэш
   * @param {string} visitorId - ID посетителя
   * @param {Object} data - Данные для сохранения
   */
  setCachedVisitor(visitorId, data) {
    if (!visitorId || !data) return;
    
    this.dataCache.set(visitorId, {
      topicId: data.topicId || data.topic_id,
      clientId: data.clientId || data.client_id,
      pageUrl: data.pageUrl || data.page_url,
      lastSessionStatus: data.lastSessionStatus || data.last_session_status || 'active', // 🔥 NEW
      timestamp: Date.now()
    });
    
    console.log(`💾 Cached visitor ${visitorId.slice(0,8)}... with topic_id=${data.topicId || data.topic_id}`);
  }

  /**
   * Проверка, обрабатывается ли посетитель в данный момент
   * @param {string} visitorId - ID посетителя
   * @returns {boolean} - true если обрабатывается
   */
  isProcessing(visitorId) {
    return this.processingCache.has(visitorId);
  }

  /**
   * Ожидание завершения обработки посетителя
   * @param {string} visitorId - ID посетителя
   * @returns {Promise} - Promise обработки
   */
  async waitForProcessing(visitorId) {
    if (!this.processingCache.has(visitorId)) {
      return null;
    }
    
    console.log(`⏳ Visitor ${visitorId.slice(0,8)}... is already being processed, waiting...`);
    
    try {
      return await this.processingCache.get(visitorId);
    } catch (error) {
      console.error(`❌ Error waiting for visitor processing:`, error);
      this.processingCache.delete(visitorId);
      return null;
    }
  }

  /**
   * Начало обработки посетителя с блокировкой
   * @param {string} visitorId - ID посетителя
   * @param {Function} processingFunction - Функция обработки
   * @returns {Promise} - Результат обработки
   */
  async processWithLock(visitorId, processingFunction) {
    if (!visitorId || typeof processingFunction !== 'function') {
      throw new Error('Invalid parameters for processWithLock');
    }

    // Проверяем, не обрабатывается ли уже
    if (this.processingCache.has(visitorId)) {
      return await this.waitForProcessing(visitorId);
    }

    // Создаем Promise для обработки
    const processingPromise = (async () => {
      try {
        console.log(`🔄 Starting processing for visitor ${visitorId.slice(0,8)}...`);
        const result = await processingFunction();
        
        // Сохраняем результат в кэш, если он валидный
        if (result && result.topic_id) {
          this.setCachedVisitor(visitorId, {
            ...result,
            lastSessionStatus: result.last_session_status // 🔥 NEW
          });
        }
        
        return result;
      } catch (error) {
        console.error(`❌ Error processing visitor ${visitorId.slice(0,8)}...:`, error);
        throw error;
      } finally {
        // Удаляем из кэша обработки
        this.processingCache.delete(visitorId);
        console.log(`✅ Finished processing for visitor ${visitorId.slice(0,8)}...`);
      }
    })();

    // Сохраняем Promise в кэш обработки
    this.processingCache.set(visitorId, processingPromise);
    
    return processingPromise;
  }

  /**
   * Обновление данных посетителя в кэше
   * @param {string} visitorId - ID посетителя
   * @param {Object} updateData - Данные для обновления
   */
  updateCachedVisitor(visitorId, updateData) {
    if (!visitorId || !updateData) return;
    
    const existing = this.dataCache.get(visitorId);
    if (existing) {
      this.dataCache.set(visitorId, {
        ...existing,
        ...updateData,
        timestamp: Date.now() // Обновляем timestamp
      });
      console.log(`🔄 Updated cache for visitor ${visitorId.slice(0,8)}...`);
    }
  }

  /**
   * 🆕 Обновление статуса последней сессии в кэше
   * @param {string} visitorId - ID посетителя
   * @param {string} status - Новый статус сессии
   */
  updateLastSessionStatus(visitorId, status) {
    if (!visitorId || !status) return;
    
    const existing = this.dataCache.get(visitorId);
    if (existing) {
      existing.lastSessionStatus = status;
      existing.timestamp = Date.now();
      console.log(`🔄 Updated last_session_status to '${status}' in cache for visitor ${visitorId.slice(0,8)}...`);
    }
  }

  /**
   * Удаление посетителя из кэша
   * @param {string} visitorId - ID посетителя
   */
  removeCachedVisitor(visitorId) {
    if (!visitorId) return;
    
    this.dataCache.delete(visitorId);
    this.processingCache.delete(visitorId);
    console.log(`🗑️ Removed visitor ${visitorId.slice(0,8)}... from cache`);
  }

  /**
   * Получение статистики кэша
   * @returns {Object} - Статистика кэша
   */
  getStats() {
    return {
      cachedVisitors: this.dataCache.size,
      processingVisitors: this.processingCache.size,
      cacheTTL: CACHE_TTL
    };
  }

  /**
   * Очистка всего кэша
   */
  clearAll() {
    this.dataCache.clear();
    this.processingCache.clear();
    console.log(`🧹 Cleared all visitor cache`);
  }
}

// Создаем единственный экземпляр для всего приложения
const visitorCache = new VisitorCache();

export default visitorCache;
export { VisitorCache };