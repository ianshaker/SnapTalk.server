// ===== Утилиты для трекинга визитов =====

import { sb } from '../config/env.js';
import { formatNewVisitorMessage, formatReturnVisitorMessage } from '../services/messageFormatterService.js';

/**
 * 🔄 Проверка недавних визитов через client_topics (НЕ site_visits!)
 * @param {string} clientId - ID клиента
 * @param {string} visitorId - ID посетителя
 * @param {string} url - URL страницы
 * @returns {Promise<Object>} - объект с информацией о недавней активности и статусе сессии
 */
export async function checkRecentVisit(clientId, visitorId, url) {
  if (!sb || !visitorId) return { hasRecentActivity: false, lastSessionStatus: 'active' }; // В memory mode не проверяем дубли
  
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  
  try {
    const { data, error } = await sb
      .from('client_topics')
      .select('updated_at, page_url, last_session_status')
      .eq('visitor_id', visitorId)
      .gte('updated_at', thirtyMinutesAgo)
      .maybeSingle();
      
    if (error) {
      console.error('❌ checkRecentVisit error:', error);
      return { hasRecentActivity: false, lastSessionStatus: 'active' };
    }
    
    if (data) {
      const lastSessionStatus = data.last_session_status || 'active';
      // Если сессия была закрыта или истекла, не считаем это недавней активностью
      const hasRecentActivity = lastSessionStatus === 'active';
      
      if (hasRecentActivity) {
        console.log(`⏰ Recent activity found for visitor ${visitorId.slice(0,8)}... (within 30 min, status: ${lastSessionStatus})`);
      } else {
        console.log(`🔄 Visitor ${visitorId.slice(0,8)}... found but session was ${lastSessionStatus}`);
      }
      
      return { hasRecentActivity, lastSessionStatus };
    }
    
    return { hasRecentActivity: false, lastSessionStatus: 'active' };
  } catch (error) {
    console.error('❌ checkRecentVisit error:', error);
    return { hasRecentActivity: false, lastSessionStatus: 'active' };
  }
}

/**
 * Формат сообщения для нового посетителя
 * @param {Object} client - Данные клиента
 * @param {string} visitorId - ID посетителя
 * @param {string} url - URL страницы
 * @param {Object} meta - Метаданные страницы
 * @returns {string} - Отформатированное сообщение
 */
export function formatVisitMessage(client, visitorId, url, meta) {
  return formatNewVisitorMessage({
    url,
    visitorId,
    pageTitle: meta?.title,
    meta
  });
}

/**
 * 🆕 Формат сообщения для повторного визита
 * @param {Object} client - Данные клиента
 * @param {string} visitorId - ID посетителя
 * @param {string} url - URL страницы
 * @param {Object} meta - Метаданные страницы
 * @param {string} previousUrl - Предыдущий URL
 * @param {string} firstVisit - Время первого визита
 * @returns {string} - Отформатированное сообщение
 */
export function formatReturnVisitMessage(client, visitorId, url, meta, previousUrl, firstVisit) {
  return formatReturnVisitorMessage({
    url,
    visitorId,
    pageTitle: meta?.title,
    meta,
    previousUrl,
    firstVisit
  });
}