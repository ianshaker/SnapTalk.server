// ===== Сервис для обработки визитов =====

import { sb } from '../config/env.js';
import { findClientByApiKey, sendToTopic } from './telegramService.js';
import { checkRecentVisit, formatVisitMessage, formatReturnVisitMessage } from '../utils/visitUtils.js';

/**
 * 🎯 Основная функция обработки визита
 * @param {Object} visitData - Данные визита
 * @param {string} visitData.apiKey - API ключ клиента
 * @param {string} visitData.visitorId - ID посетителя
 * @param {string} visitData.url - URL страницы
 * @param {Object} visitData.meta - Метаданные страницы
 * @param {Function} pushToClient - Функция для отправки данных клиенту
 * @returns {Promise<Object>} - Результат обработки
 */
export async function processVisit(visitData, pushToClient) {
  const { apiKey, visitorId, url, meta } = visitData;
  
  console.log(`\n🔄 Processing visit: ${visitorId?.slice(0,8)}... -> ${url}`);
  
  try {
    // 1. Найти клиента по API ключу
    const client = await findClientByApiKey(apiKey);
    if (!client) {
      console.log('❌ Client not found for API key');
      return { success: false, error: 'Client not found' };
    }
    
    console.log(`✅ Client found: ${client.name} (${client.id})`);
    
    // 2. Проверить недавние визиты
    const recentVisitInfo = await checkRecentVisit(client.id, visitorId, url);
    if (recentVisitInfo.hasRecentActivity) {
      console.log('⏰ Recent visit detected, skipping notification');
      return { success: true, skipped: true, reason: 'Recent visit' };
    }
    
    // 3. Получить информацию о предыдущих визитах
    const visitInfo = await getVisitInfo(client.id, visitorId);
    
    // 4. Сформировать сообщение
    let message;
    if (visitInfo.isFirstVisit) {
      message = formatVisitMessage(client, visitorId, url, meta);
      console.log('🆕 First visit - sending new visitor notification');
    } else {
      message = formatReturnVisitMessage(
        client, 
        visitorId, 
        url, 
        meta, 
        visitInfo.previousUrl, 
        visitInfo.firstVisit
      );
      console.log('🔄 Return visit - sending return visitor notification');
    }
    
    // 5. Отправить уведомление в Telegram
    const telegramResult = await sendToTopic(client.id, message);
    
    // 6. Отправить данные клиенту через WebSocket
    if (pushToClient) {
      pushToClient(client.id, {
        type: 'visit',
        visitorId,
        url,
        meta,
        timestamp: new Date().toISOString(),
        isFirstVisit: visitInfo.isFirstVisit
      });
    }
    
    console.log('✅ Visit processed successfully');
    
    return {
      success: true,
      clientId: client.id,
      isFirstVisit: visitInfo.isFirstVisit,
      telegramSent: telegramResult.success
    };
    
  } catch (error) {
    console.error('❌ Error processing visit:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 📊 Получить информацию о визитах посетителя
 * @param {string} clientId - ID клиента
 * @param {string} visitorId - ID посетителя
 * @returns {Promise<Object>} - Информация о визитах
 */
async function getVisitInfo(clientId, visitorId) {
  if (!sb || !visitorId) {
    return { isFirstVisit: true, previousUrl: null, firstVisit: null };
  }
  
  try {
    // Проверяем существующую тему для этого посетителя
    const { data: existingTopic, error } = await sb
      .from('client_topics')
      .select('page_url, created_at')
      .eq('visitor_id', visitorId)
      .single();
      
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error checking existing topic:', error);
      return { isFirstVisit: true, previousUrl: null, firstVisit: null };
    }
    
    if (existingTopic) {
      return {
        isFirstVisit: false,
        previousUrl: existingTopic.page_url,
        firstVisit: existingTopic.created_at
      };
    } else {
      return { isFirstVisit: true, previousUrl: null, firstVisit: null };
    }
    
  } catch (error) {
    console.error('❌ Error getting visit info:', error);
    return { isFirstVisit: true, previousUrl: null, firstVisit: null };
  }
}

/**
 * 🔄 Обновить информацию о последнем визите
 * @param {string} clientId - ID клиента
 * @param {string} visitorId - ID посетителя
 * @param {string} url - URL страницы
 * @returns {Promise<boolean>} - Успешность обновления
 */
export async function updateLastVisit(clientId, visitorId, url) {
  if (!sb || !visitorId) return true; // В memory mode не сохраняем
  
  try {
    // Обновляем или создаем запись в client_topics
    const { error } = await sb
      .from('client_topics')
      .upsert({
        client_id: clientId,
        visitor_id: visitorId,
        page_url: url,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'client_id,visitor_id'
      });
      
    if (error) {
      console.error('❌ Error updating last visit:', error);
      return false;
    }
    
    console.log(`📝 Updated last visit for ${visitorId.slice(0,8)}...`);
    return true;
    
  } catch (error) {
    console.error('❌ Error updating last visit:', error);
    return false;
  }
}