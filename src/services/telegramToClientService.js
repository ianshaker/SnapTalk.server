// ===== Сервис для обработки сообщений от Telegram к клиентам =====

import { sb } from '../config/env.js';
import { apiKeys } from '../routes/snapTalkClients.js';

/**
 * Сервис для обработки входящих сообщений от Telegram и доставки их клиентам
 * Включает детальное логирование каждого шага процесса
 */
export class TelegramToClientService {
  constructor(pushToClientFunction) {
    this.pushToClient = pushToClientFunction;
    this.logPrefix = '📨 [TelegramToClient]';
  }

  /**
   * Основная функция обработки входящего сообщения от Telegram
   * @param {Object} messageData - Данные сообщения от Telegram webhook
   * @returns {Promise<Object>} Результат обработки
   */
  async processIncomingMessage(messageData) {
    const startTime = Date.now();
    const messageId = messageData.message?.message_id || 'unknown';
    
    console.log(`${this.logPrefix} 🚀 Начинаем обработку сообщения ID: ${messageId}`);
    console.log(`${this.logPrefix} 📋 Входящие данные:`, {
      chat_id: messageData.message?.chat?.id,
      message_thread_id: messageData.message?.message_thread_id,
      text: messageData.message?.text?.substring(0, 100) + '...',
      from: messageData.message?.from?.username || messageData.message?.from?.first_name
    });

    try {
      // Шаг 1: Валидация входящих данных
      const validationResult = await this.validateIncomingMessage(messageData);
      if (!validationResult.isValid) {
        return this.createErrorResponse('VALIDATION_FAILED', validationResult.error, messageId);
      }

      const { chatId, topicId, text } = validationResult.data;

      // Шаг 2: Поиск клиента по chat_id и topic_id
      const clientLookupResult = await this.findClientByTopic(chatId, topicId);
      if (!clientLookupResult.success) {
        return this.createErrorResponse('CLIENT_NOT_FOUND', clientLookupResult.error, messageId);
      }

      const { clientId, clientName } = clientLookupResult.data;

      // Шаг 3: Подготовка сообщения для отправки
      const messagePayload = this.prepareMessagePayload(text, messageData);
      
      // Шаг 4: Отправка через WebSocket
      const deliveryResult = await this.deliverToClient(clientId, messagePayload);
      
      // Шаг 5: Отправка через Supabase (если доступно)
      const supabaseResult = await this.broadcastViaSupabase(clientId, messagePayload);

      const processingTime = Date.now() - startTime;
      console.log(`${this.logPrefix} ✅ Сообщение успешно обработано за ${processingTime}ms`);
      console.log(`${this.logPrefix} 📊 Результаты доставки:`, {
        websocket: deliveryResult.success,
        supabase: supabaseResult.success,
        clientId,
        clientName
      });

      return {
        success: true,
        messageId,
        clientId,
        clientName,
        processingTime,
        delivery: {
          websocket: deliveryResult,
          supabase: supabaseResult
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`${this.logPrefix} ❌ Критическая ошибка при обработке сообщения:`, error);
      return this.createErrorResponse('PROCESSING_ERROR', error.message, messageId, processingTime);
    }
  }

  /**
   * Валидация входящего сообщения от Telegram
   * @param {Object} messageData - Данные от webhook
   * @returns {Promise<Object>} Результат валидации
   */
  async validateIncomingMessage(messageData) {
    console.log(`${this.logPrefix} 🔍 Шаг 1: Валидация входящего сообщения`);

    if (!messageData?.message) {
      console.log(`${this.logPrefix} ❌ Отсутствует объект message`);
      return { isValid: false, error: 'Missing message object' };
    }

    const message = messageData.message;
    const chatId = message.chat?.id;
    const topicId = message.message_thread_id;
    const text = message.text;

    // Проверка наличия текста
    if (!text || text.trim() === '') {
      console.log(`${this.logPrefix} ❌ Сообщение не содержит текста`);
      return { isValid: false, error: 'Message has no text content' };
    }

    // Проверка наличия chat_id
    if (!chatId) {
      console.log(`${this.logPrefix} ❌ Отсутствует chat_id`);
      return { isValid: false, error: 'Missing chat_id' };
    }

    // Проверка наличия topic_id
    if (!topicId) {
      console.log(`${this.logPrefix} ❌ Отсутствует message_thread_id (topic_id)`);
      return { isValid: false, error: 'Missing message_thread_id' };
    }

    console.log(`${this.logPrefix} ✅ Валидация пройдена:`, {
      chatId,
      topicId,
      textLength: text.length,
      hasText: !!text
    });

    return {
      isValid: true,
      data: { chatId, topicId, text }
    };
  }

  /**
   * Поиск клиента по chat_id и topic_id
   * @param {string} chatId - ID чата Telegram
   * @param {string} topicId - ID топика (message_thread_id)
   * @returns {Promise<Object>} Результат поиска
   */
  async findClientByTopic(chatId, topicId) {
    console.log(`${this.logPrefix} 🔍 Шаг 2: Поиск клиента по chat_id=${chatId}, topic_id=${topicId}`);

    try {
      // Сначала ищем по chat_id и topic_id
      console.log(`${this.logPrefix} 🔎 Поиск в client_topics по chat_id и topic_id`);
      
      if (!sb) {
        console.log(`${this.logPrefix} ⚠️ Supabase недоступен, используем memory mode`);
        return { success: false, error: 'Database not available in memory mode' };
      }

      const { data: topicData, error: topicError } = await sb
        .from('client_topics')
        .select('client_id, chat_id')
        .eq('topic_id', topicId)
        .eq('chat_id', chatId)
        .maybeSingle();

      if (topicError) {
        console.error(`${this.logPrefix} ❌ Ошибка запроса к client_topics:`, topicError);
        return { success: false, error: `Database error: ${topicError.message}` };
      }

      let clientId = null;
      let foundMethod = null;

      if (topicData) {
        clientId = topicData.client_id;
        foundMethod = 'chat_id + topic_id';
        console.log(`${this.logPrefix} ✅ Клиент найден по chat_id + topic_id: ${clientId}`);
      } else {
        // Fallback: поиск только по topic_id
        console.log(`${this.logPrefix} 🔄 Fallback: поиск только по topic_id`);
        
        const { data: fallbackData, error: fallbackError } = await sb
          .from('client_topics')
          .select('client_id, chat_id')
          .eq('topic_id', topicId)
          .maybeSingle();

        if (fallbackError) {
          console.error(`${this.logPrefix} ❌ Ошибка fallback запроса:`, fallbackError);
          return { success: false, error: `Fallback database error: ${fallbackError.message}` };
        }

        if (fallbackData) {
          clientId = fallbackData.client_id;
          foundMethod = 'topic_id only (legacy)';
          console.log(`${this.logPrefix} ✅ Клиент найден по topic_id (legacy): ${clientId}`);
          
          // Обновляем chat_id для legacy записи
          console.log(`${this.logPrefix} 🔄 Обновляем chat_id для legacy записи`);
          const { error: updateError } = await sb
            .from('client_topics')
            .update({ chat_id: chatId })
            .eq('topic_id', topicId)
            .eq('client_id', clientId);

          if (updateError) {
            console.error(`${this.logPrefix} ⚠️ Не удалось обновить chat_id:`, updateError);
          } else {
            console.log(`${this.logPrefix} ✅ chat_id обновлен для legacy записи`);
          }
        }
      }

      if (!clientId) {
        console.log(`${this.logPrefix} ❌ Клиент не найден для topic_id=${topicId}, chat_id=${chatId}`);
        return { success: false, error: `No client found for topic_id=${topicId}` };
      }

      // Получаем информацию о клиенте
      const clientInfo = await this.getClientInfo(clientId);
      
      console.log(`${this.logPrefix} ✅ Клиент успешно найден:`, {
        clientId,
        clientName: clientInfo.name,
        foundMethod,
        chatId,
        topicId
      });

      return {
        success: true,
        data: {
          clientId,
          clientName: clientInfo.name,
          foundMethod
        }
      };

    } catch (error) {
      console.error(`${this.logPrefix} ❌ Критическая ошибка при поиске клиента:`, error);
      return { success: false, error: `Critical error: ${error.message}` };
    }
  }

  /**
   * Получение информации о клиенте
   * @param {string} clientId - ID клиента
   * @returns {Promise<Object>} Информация о клиенте
   */
  async getClientInfo(clientId) {
    console.log(`${this.logPrefix} 📋 Получение информации о клиенте: ${clientId}`);

    // Сначала проверяем кэш
    for (const [apiKey, clientData] of apiKeys.entries()) {
      if (clientData.clientId === clientId) {
        console.log(`${this.logPrefix} 💾 Информация о клиенте найдена в кэше`);
        return {
          name: clientData.clientName || 'Unknown Client',
          source: 'cache'
        };
      }
    }

    // Если не найдено в кэше, запрашиваем из базы
    if (sb) {
      console.log(`${this.logPrefix} 🔍 Запрос информации о клиенте из базы данных`);
      try {
        const { data, error } = await sb
          .from('clients')
          .select('client_name')
          .eq('id', clientId)
          .single();

        if (!error && data) {
          console.log(`${this.logPrefix} ✅ Информация о клиенте получена из БД`);
          return {
            name: data.client_name || 'Unknown Client',
            source: 'database'
          };
        }
      } catch (error) {
        console.error(`${this.logPrefix} ❌ Ошибка получения информации о клиенте:`, error);
      }
    }

    console.log(`${this.logPrefix} ⚠️ Информация о клиенте не найдена, используем fallback`);
    return {
      name: `Client ${clientId.slice(0, 8)}...`,
      source: 'fallback'
    };
  }

  /**
   * Подготовка payload сообщения для отправки клиенту
   * @param {string} text - Текст сообщения
   * @param {Object} originalData - Оригинальные данные от Telegram
   * @returns {Object} Подготовленный payload
   */
  prepareMessagePayload(text, originalData) {
    console.log(`${this.logPrefix} 🔧 Шаг 3: Подготовка payload сообщения`);

    const payload = {
      from: 'manager',
      text: text,
      timestamp: new Date().toISOString(),
      source: 'telegram',
      metadata: {
        telegram_message_id: originalData.message?.message_id,
        telegram_user: originalData.message?.from?.username || originalData.message?.from?.first_name,
        chat_id: originalData.message?.chat?.id,
        message_thread_id: originalData.message?.message_thread_id
      }
    };

    console.log(`${this.logPrefix} ✅ Payload подготовлен:`, {
      textLength: text.length,
      hasMetadata: !!payload.metadata,
      timestamp: payload.timestamp
    });

    return payload;
  }

  /**
   * Доставка сообщения клиенту через WebSocket
   * @param {string} clientId - ID клиента
   * @param {Object} payload - Данные сообщения
   * @returns {Promise<Object>} Результат доставки
   */
  async deliverToClient(clientId, payload) {
    console.log(`${this.logPrefix} 🔌 Шаг 4: Доставка через WebSocket для клиента ${clientId}`);

    try {
      if (!this.pushToClient) {
        console.log(`${this.logPrefix} ❌ pushToClient функция не установлена`);
        return { success: false, error: 'pushToClient function not available' };
      }

      // Вызываем функцию отправки
      this.pushToClient(clientId, payload);
      
      console.log(`${this.logPrefix} ✅ Сообщение отправлено через WebSocket`);
      console.log(`${this.logPrefix} 📊 WebSocket payload:`, {
        clientId,
        messageFrom: payload.from,
        textPreview: payload.text.substring(0, 50) + '...',
        timestamp: payload.timestamp
      });

      return {
        success: true,
        method: 'websocket',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`${this.logPrefix} ❌ Ошибка доставки через WebSocket:`, error);
      return {
        success: false,
        error: error.message,
        method: 'websocket'
      };
    }
  }

  /**
   * Отправка сообщения через Supabase Realtime
   * @param {string} clientId - ID клиента
   * @param {Object} payload - Данные сообщения
   * @returns {Promise<Object>} Результат отправки
   */
  async broadcastViaSupabase(clientId, payload) {
    console.log(`${this.logPrefix} 📡 Шаг 5: Отправка через Supabase Realtime`);

    try {
      if (!sb) {
        console.log(`${this.logPrefix} ⚠️ Supabase недоступен`);
        return { success: false, error: 'Supabase not available' };
      }

      const channel = sb.channel(`client_${clientId}`);
      const broadcastResult = await channel.send({
        type: 'broadcast',
        event: 'new_message',
        payload: payload
      });

      console.log(`${this.logPrefix} ✅ Сообщение отправлено через Supabase`);
      console.log(`${this.logPrefix} 📊 Supabase broadcast result:`, broadcastResult);

      return {
        success: true,
        method: 'supabase',
        result: broadcastResult,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`${this.logPrefix} ❌ Ошибка отправки через Supabase:`, error);
      return {
        success: false,
        error: error.message,
        method: 'supabase'
      };
    }
  }

  /**
   * Создание стандартного ответа об ошибке
   * @param {string} errorType - Тип ошибки
   * @param {string} errorMessage - Сообщение об ошибке
   * @param {string} messageId - ID сообщения
   * @param {number} processingTime - Время обработки
   * @returns {Object} Объект ошибки
   */
  createErrorResponse(errorType, errorMessage, messageId, processingTime = null) {
    const errorResponse = {
      success: false,
      error: {
        type: errorType,
        message: errorMessage,
        messageId,
        timestamp: new Date().toISOString()
      }
    };

    if (processingTime !== null) {
      errorResponse.error.processingTime = processingTime;
    }

    console.log(`${this.logPrefix} ❌ Ошибка обработки:`, errorResponse.error);
    return errorResponse;
  }

  /**
   * Установка функции для отправки сообщений клиентам
   * @param {Function} pushFunction - Функция pushToClient
   */
  setPushToClientFunction(pushFunction) {
    this.pushToClient = pushFunction;
    console.log(`${this.logPrefix} ✅ pushToClient функция установлена`);
  }
}

// Экспорт singleton instance
let serviceInstance = null;

/**
 * Получение singleton instance сервиса
 * @param {Function} pushToClientFunction - Функция для отправки сообщений
 * @returns {TelegramToClientService} Instance сервиса
 */
export function getTelegramToClientService(pushToClientFunction = null) {
  if (!serviceInstance) {
    serviceInstance = new TelegramToClientService(pushToClientFunction);
  } else if (pushToClientFunction) {
    serviceInstance.setPushToClientFunction(pushToClientFunction);
  }
  return serviceInstance;
}