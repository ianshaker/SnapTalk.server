import express from 'express';
import { sb, SUPERGROUP_ID } from '../config/env.js';
import { memoryMap } from '../services/telegramService.js';

const router = express.Router();

// Функция для отправки сообщений клиентам через WebSocket
let pushToClient = null;

// Функция для установки pushToClient из server.js
export function setPushToClient(pushFunction) {
  pushToClient = pushFunction;
}

// ===== Webhook: Telegram -> сайт (ответ менеджера) =====
router.post('/webhook/:WEBHOOK_SECRET', async (req, res) => {
  try {
    const { WEBHOOK_SECRET } = req.params;
    
    const update = req.body;
    const msg = update?.message;
    
    // 🔍 ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ: входящие данные
    console.log('📨 Telegram webhook received:', {
      hasMessage: !!msg,
      messageId: msg?.message_id,
      chatId: msg?.chat?.id,
      topicId: msg?.message_thread_id,
      text: msg?.text?.slice(0, 50) + (msg?.text?.length > 50 ? '...' : ''),
      from: msg?.from?.username || msg?.from?.first_name,
      timestamp: new Date().toISOString()
    });
    
    if (!msg?.text || !msg?.message_thread_id) {
      console.log('⚠️  Skipping: missing text or topic_id');
      return res.sendStatus(200);
    }

    const text = msg?.text;
    const topicId = msg?.message_thread_id;
    const chatId = msg?.chat?.id;

    // 🔍 ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ: входящие данные
    console.log('🔍 Message validation:', {
      receivedChatId: chatId,
      topicId: topicId,
      hasText: !!text,
      textLength: text?.length || 0
    });

    // Базовая проверка наличия данных
    if (!text || !topicId || !chatId) {
      console.log('⚠️  Skipping: missing text, topic_id, or chat_id');
      return res.sendStatus(200);
    }

    // Сначала проверяем, что chat_id принадлежит одному из наших клиентов
    let validClient = null;
    if (sb) {
      console.log('🔍 Validating chat_id against active clients:', {
        receivedChatId: chatId
      });
      
      const { data: clientData, error: clientError } = await sb
        .from('clients')
        .select('id, client_name, telegram_group_id')
        .eq('telegram_group_id', chatId.toString())
        .eq('integration_status', 'active')
        .maybeSingle();
        
      if (clientError) {
        console.error('❌ Error validating client:', clientError);
        return res.sendStatus(200);
      }
      
      if (!clientData) {
        console.log('⚠️  Chat ID not found in active clients:', {
          receivedChatId: chatId,
          message: 'This chat_id does not belong to any active client'
        });
        return res.sendStatus(200);
      }
      
      validClient = clientData;
      console.log('✅ Valid client found:', {
        clientId: validClient.id,
        clientName: validClient.client_name,
        telegramGroupId: validClient.telegram_group_id
      });
    }

    // Ищем clientId по topicId + chatId (ИСПРАВЛЕНО для корректной маршрутизации)
    let clientId = null;
    if (sb) {
      // 🔍 ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ: поиск clientId
      console.log('🔍 Starting clientId lookup:', {
        topicId: topicId,
        chatId: chatId,
        searchStrategy: 'topic_id + chat_id'
      });
      
      // НОВАЯ ЛОГИКА: ищем по (topic_id + chat_id)
      const { data, error } = await sb
        .from('client_topics')
        .select('client_id, topic_id, chat_id')
        .eq('topic_id', topicId)
        .eq('chat_id', chatId)
        .maybeSingle();
        
      console.log('🔍 Primary search results:', {
        found: !!data,
        result: data,
        error: error?.message || null
      });
        
      if (error) {
        console.error('❌ Database error during clientId lookup:', {
          error: error.message,
          code: error.code,
          details: error.details,
          topicId: topicId,
          chatId: chatId
        });
      } else if (data) {
        clientId = data.client_id;
        console.log('✅ ClientId lookup successful (primary):', {
          clientId: clientId,
          topicId: topicId,
          chatId: chatId,
          foundVia: 'primary_search'
        });
      } else {
        console.log('🔄 Executing fallback search:', {
          strategy: 'topic_id only (chat_id IS NULL)',
          topicId: topicId
        });
        
        // FALLBACK: если chat_id еще не заполнен, ищем только по topic_id
        const { data: fallbackData, error: fallbackError } = await sb
          .from('client_topics')
          .select('client_id, topic_id, chat_id')
          .eq('topic_id', topicId)
          .is('chat_id', null)
          .maybeSingle();
          
        console.log('🔄 Fallback search results:', {
          found: !!fallbackData,
          result: fallbackData,
          error: fallbackError?.message || null
        });
          
        if (!fallbackError && fallbackData) {
          clientId = fallbackData.client_id;
          console.log('🔄 Updating chat_id for legacy record:', {
            topicId: topicId,
            newChatId: chatId,
            clientId: fallbackData.client_id
          });
          
          // Обновляем запись с правильным chat_id
          const updateResult = await sb
            .from('client_topics')
            .update({ chat_id: chatId })
            .eq('topic_id', topicId)
            .is('chat_id', null);
            
          if (updateResult.error) {
            console.error('❌ Failed to update chat_id:', updateResult.error);
          } else {
            console.log('✅ Successfully updated chat_id');
          }
          
          console.log('✅ ClientId lookup successful (fallback):', {
            clientId: clientId,
            topicId: topicId,
            chatId: chatId,
            foundVia: 'fallback_search'
          });
        } else if (fallbackError) {
          console.error('❌ Database error during fallback lookup:', {
            error: fallbackError.message,
            code: fallbackError.code,
            details: fallbackError.details,
            topicId: topicId
          });
        } else {
          console.log('❌ No client found:', {
            topicId: topicId,
            chatId: chatId,
            searchedStrategies: ['topic_id + chat_id', 'topic_id only']
          });
        }
      }
    } else {
      // Memory fallback (без изменений для обратной совместимости)
      console.log('🔄 Using memory fallback (no Supabase connection)');
      for (const [cid, tid] of memoryMap.entries()) {
        if (tid === topicId) { 
          clientId = cid; 
          console.log(`✅ Found clientId ${clientId} in memory for topic ${topicId}`);
          break; 
        }
      }
      if (!clientId) {
        console.log(`❌ No client found in memory for topic ${topicId}`);
      }
    }

    if (!clientId) {
      console.log('❌ Final result: No client found, ending processing');
      return res.sendStatus(200);
    }

    // 🔍 ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ: отправка сообщения клиенту
    console.log('📤 Preparing to send message to client:', {
      clientId: clientId,
      messageLength: text.length,
      messagePreview: text.slice(0, 100) + (text.length > 100 ? '...' : '')
    });

    console.log(`📱 Telegram → Site: "${text}" → ${clientId}`);

    // 1) Supabase Broadcast (если подключён)
    if (sb) {
      try {
        console.log('📡 Sending Supabase broadcast:', {
          channel: `client:${clientId}`,
          event: 'manager_message'
        });
        await sb.channel(`client:${clientId}`).send({
          type: 'broadcast',
          event: 'manager_message',
          payload: { from: 'manager', text, ts: Date.now() }
        });
        console.log('✅ Supabase broadcast sent successfully');
      } catch (broadcastError) {
        console.error('❌ Supabase broadcast error:', broadcastError);
      }
    }

    // 2) WebSocket push (всегда, если есть активные подписчики)
    const payload = { from: 'manager', text, ts: Date.now() };
    if (pushToClient) {
      console.log('📡 Sending WebSocket push:', {
        clientId: clientId,
        payloadType: payload.from
      });
      pushToClient(clientId, payload);
      console.log('✅ WebSocket push sent successfully');
    } else {
      console.log('⚠️ No pushToClient function available');
    }

    console.log('✅ Webhook processing completed successfully');
    return res.sendStatus(200);
  } catch (e) {
    console.error('❌ Critical error in Telegram webhook:', {
      error: e.message,
      stack: e.stack,
      requestBody: req.body,
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method
    });
    return res.sendStatus(200);
  }
});

export default router;