/**
 * 💾 DATABASE MODULE
 * 
 * Модуль для работы с базой данных в системе трекинга страниц:
 * - Сохранение событий переходов по страницам
 * - Взаимодействие с Supabase
 * - Обработка ошибок базы данных
 * - Подготовка данных для сохранения
 */

import { sb } from '../../config/env.js';
import { logWithTimestamp } from './utils.js';

// Используем существующий Supabase клиент из конфигурации
const supabase = sb;

if (!supabase) {
  throw new Error('Supabase client is not configured. Please check your environment variables.');
}

/**
 * Сохранение события перехода по странице в базу данных
 * @param {Object} eventData - Данные события
 * @param {number} eventData.site_id - ID сайта
 * @param {string} eventData.visitor_id - ID посетителя
 * @param {string} eventData.page_url - URL страницы
 * @param {string} eventData.page_path - Путь страницы
 * @param {string} eventData.page_title - Заголовок страницы
 * @param {string} eventData.referrer - Реферер
 * @param {string} eventData.user_agent - User Agent
 * @param {string} eventData.ip_address - IP адрес
 * @param {Object} eventData.utm_data - UTM параметры
 * @param {Object} eventData.metadata - Дополнительные метаданные
 * @returns {Promise<Object>} - Результат сохранения
 */
export async function savePageEvent(eventData) {
  try {
    // Валидация обязательных полей
    if (!eventData.site_id || !eventData.visitor_id || !eventData.page_url) {
      throw new Error('Missing required fields: site_id, visitor_id, page_url');
    }
    
    // Подготовка данных для вставки
    const insertData = {
      site_id: eventData.site_id,
      visitor_id: eventData.visitor_id,
      page_url: eventData.page_url,
      page_path: eventData.page_path || '',
      page_title: eventData.page_title || '',
      referrer: eventData.referrer || '',
      user_agent: eventData.user_agent || '',
      ip_address: eventData.ip_address || '',
      utm_data: eventData.utm_data || {},
      metadata: eventData.metadata || {},
      created_at: new Date().toISOString()
    };
    
    // Логирование попытки сохранения
    logWithTimestamp(`Saving page event: site_id=${insertData.site_id}, visitor_id=${insertData.visitor_id}, path=${insertData.page_path}`);
    
    // Вставка данных в таблицу page_events
    const { data, error } = await supabase
      .from('page_events')
      .insert([insertData])
      .select('id, created_at');
    
    if (error) {
      logWithTimestamp(`Database error saving page event: ${error.message}`);
      throw new Error(`Failed to save page event: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      logWithTimestamp('No data returned from page event insert');
      throw new Error('No data returned from database insert');
    }
    
    const savedEvent = data[0];
    logWithTimestamp(`Page event saved successfully: id=${savedEvent.id}, site_id=${insertData.site_id}`);
    
    return {
      success: true,
      eventId: savedEvent.id,
      createdAt: savedEvent.created_at,
      siteId: insertData.site_id,
      visitorId: insertData.visitor_id,
      pagePath: insertData.page_path
    };
    
  } catch (error) {
    logWithTimestamp(`Error saving page event: ${error.message}`);
    
    return {
      success: false,
      error: error.message,
      siteId: eventData.site_id,
      visitorId: eventData.visitor_id,
      pagePath: eventData.page_path
    };
  }
}

/**
 * Получение статистики событий для сайта
 * @param {number} siteId - ID сайта
 * @param {Object} options - Опции запроса
 * @param {Date} options.startDate - Начальная дата
 * @param {Date} options.endDate - Конечная дата
 * @param {number} options.limit - Лимит записей
 * @returns {Promise<Object>} - Статистика событий
 */
export async function getPageEventStats(siteId, options = {}) {
  try {
    const {
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000), // Последние 24 часа по умолчанию
      endDate = new Date(),
      limit = 1000
    } = options;
    
    logWithTimestamp(`Getting page event stats for site ${siteId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Запрос событий за указанный период
    let query = supabase
      .from('page_events')
      .select('id, visitor_id, page_path, page_title, created_at, utm_data')
      .eq('site_id', siteId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    
    if (error) {
      logWithTimestamp(`Database error getting page event stats: ${error.message}`);
      throw new Error(`Failed to get page event stats: ${error.message}`);
    }
    
    // Подсчет статистики
    const totalEvents = data.length;
    const uniqueVisitors = new Set(data.map(event => event.visitor_id)).size;
    const uniquePages = new Set(data.map(event => event.page_path)).size;
    
    // Топ страниц
    const pageViews = {};
    data.forEach(event => {
      const path = event.page_path || '/';
      pageViews[path] = (pageViews[path] || 0) + 1;
    });
    
    const topPages = Object.entries(pageViews)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([path, views]) => ({ path, views }));
    
    // UTM статистика
    const utmSources = {};
    data.forEach(event => {
      if (event.utm_data && event.utm_data.utm_source) {
        const source = event.utm_data.utm_source;
        utmSources[source] = (utmSources[source] || 0) + 1;
      }
    });
    
    const topUtmSources = Object.entries(utmSources)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([source, count]) => ({ source, count }));
    
    logWithTimestamp(`Page event stats calculated: ${totalEvents} events, ${uniqueVisitors} visitors, ${uniquePages} pages`);
    
    return {
      success: true,
      siteId,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      stats: {
        totalEvents,
        uniqueVisitors,
        uniquePages,
        topPages,
        topUtmSources
      },
      events: data
    };
    
  } catch (error) {
    logWithTimestamp(`Error getting page event stats: ${error.message}`);
    
    return {
      success: false,
      error: error.message,
      siteId
    };
  }
}

/**
 * Получение последних событий для сайта
 * @param {number} siteId - ID сайта
 * @param {number} limit - Количество событий
 * @returns {Promise<Object>} - Последние события
 */
export async function getRecentPageEvents(siteId, limit = 50) {
  try {
    logWithTimestamp(`Getting ${limit} recent page events for site ${siteId}`);
    
    const { data, error } = await supabase
      .from('page_events')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      logWithTimestamp(`Database error getting recent page events: ${error.message}`);
      throw new Error(`Failed to get recent page events: ${error.message}`);
    }
    
    logWithTimestamp(`Retrieved ${data.length} recent page events for site ${siteId}`);
    
    return {
      success: true,
      siteId,
      events: data,
      count: data.length
    };
    
  } catch (error) {
    logWithTimestamp(`Error getting recent page events: ${error.message}`);
    
    return {
      success: false,
      error: error.message,
      siteId
    };
  }
}

/**
 * Удаление старых событий (для очистки базы данных)
 * @param {number} daysToKeep - Количество дней для хранения
 * @returns {Promise<Object>} - Результат очистки
 */
export async function cleanupOldPageEvents(daysToKeep = 90) {
  try {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    logWithTimestamp(`Cleaning up page events older than ${cutoffDate.toISOString()}`);
    
    const { data, error } = await supabase
      .from('page_events')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id');
    
    if (error) {
      logWithTimestamp(`Database error cleaning up old page events: ${error.message}`);
      throw new Error(`Failed to cleanup old page events: ${error.message}`);
    }
    
    const deletedCount = data ? data.length : 0;
    logWithTimestamp(`Cleaned up ${deletedCount} old page events`);
    
    return {
      success: true,
      deletedCount,
      cutoffDate: cutoffDate.toISOString()
    };
    
  } catch (error) {
    logWithTimestamp(`Error cleaning up old page events: ${error.message}`);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Проверка подключения к базе данных
 * @returns {Promise<Object>} - Результат проверки
 */
export async function checkDatabaseConnection() {
  try {
    logWithTimestamp('Checking database connection...');
    
    // Простой запрос для проверки подключения
    const { data, error } = await supabase
      .from('page_events')
      .select('id')
      .limit(1);
    
    if (error) {
      logWithTimestamp(`Database connection error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        connected: false
      };
    }
    
    logWithTimestamp('Database connection successful');
    
    return {
      success: true,
      connected: true,
      message: 'Database connection is working'
    };
    
  } catch (error) {
    logWithTimestamp(`Error checking database connection: ${error.message}`);
    
    return {
      success: false,
      error: error.message,
      connected: false
    };
  }
}

// Экспорт Supabase клиента для использования в других модулях при необходимости
export { supabase };