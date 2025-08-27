/**
 * 📱 TELEGRAM SERVICE
 * 
 * Централизованный сервис для работы с Telegram:
 * - Поиск клиентов и посетителей
 * - Управление топиками (создание, валидация)
 * - Умная логика распознавания посетителей
 * - Отправка сообщений в Telegram
 * 
 * Вынесен из server.js для улучшения архитектуры (267 строк → отдельный модуль)
 */

import axios from 'axios';
import { BOT_TOKEN, SUPERGROUP_ID, sb } from '../config/env.js';
import visitorCache from '../utils/cache/VisitorCache.js';

// ===== Хранилище связок clientId <-> topicId =====
const memoryMap = new Map(); // clientId -> topicId

// ===== Утилиты для базы данных =====
export async function findClientByApiKey(apiKey) {
  if (!sb || !apiKey) return null;
  try {
    const { data, error } = await sb
      .from('clients')
      .select('*')
      .eq('api_key', apiKey)
      .eq('integration_status', 'active')
      .maybeSingle();
    
    if (error) {
      console.error('❌ Error finding client by API key:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('❌ findClientByApiKey error:', error);
    return null;
  }
}

export async function dbGetTopic(clientId) {
  if (!sb) return memoryMap.get(clientId) || null;
  const { data, error } = await sb
    .from('client_topics')
    .select('topic_id')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) { console.error('dbGetTopic error', error); return null; }
  return data?.topic_id ?? null;
}

// 🆕 Поиск существующего посетителя по visitor_id для конкретного клиента
export async function findExistingVisitorForClient(clientId, visitorId) {
  if (!sb || !visitorId) {
    console.log(`❌ findExistingVisitorForClient: No Supabase connection or visitorId`);
    return null;
  }
  
  try {
    console.log(`🔍 Searching for existing visitor ${visitorId.slice(0,8)}... for client ${clientId}`);
    
    const { data, error } = await sb
      .from('client_topics')
      .select('topic_id, visitor_id, created_at, page_url, client_id')
      .eq('visitor_id', visitorId)
      .eq('client_id', clientId)  // 🔥 Ищем для конкретного клиента!
      .maybeSingle();
    
    if (error) {
      console.error('❌ findExistingVisitorForClient error:', error);
      return null;
    }
    
    if (data) {
      console.log(`✅ Found existing visitor for client ${clientId}: topic_id=${data.topic_id}, created_at=${data.created_at}`);
    } else {
      console.log(`❌ No existing visitor found for ${visitorId.slice(0,8)}... and client ${clientId}`);
    }
    
    return data; // { topic_id, visitor_id, created_at, page_url, client_id } или null
  } catch (error) {
    console.error('❌ findExistingVisitorForClient error:', error);
    return null;
  }
}



// 🆕 Поиск существующего посетителя по visitor_id (БЕЗ client_id!) - для обратной совместимости
export async function findExistingVisitor(clientId, visitorId) {
  if (!sb || !visitorId) {
    console.log(`❌ findExistingVisitor: No Supabase connection or visitorId`);
    return null;
  }
  
  // Проверяем кэш
  const cached = visitorCache.getCachedVisitor(visitorId);
  if (cached) {
    return cached;
  }
  
  // Используем VisitorCache для обработки с блокировкой
  return await visitorCache.processWithLock(visitorId, async () => {
    console.log(`🔍 Searching for existing visitor ${visitorId.slice(0,8)}... in client_topics (ANY client)`);
    
    const { data, error } = await sb
      .from('client_topics')
      .select('topic_id, visitor_id, created_at, page_url, client_id')
      .eq('visitor_id', visitorId)  // 🔥 ТОЛЬКО по visitor_id! НЕ фильтруем по client_id!
      .maybeSingle();
    
    if (error) {
      console.error('❌ findExistingVisitor error:', error);
      return null;
    }
    
    if (data) {
      console.log(`✅ Found existing visitor: topic_id=${data.topic_id}, original_client_id=${data.client_id}, created_at=${data.created_at}`);
    } else {
      console.log(`❌ No existing visitor found for ${visitorId.slice(0,8)}... (first visit ever)`);
    }
    
    return data; // { topic_id, visitor_id, created_at, page_url, client_id } или null
  });
}

// 🆕 Проверка валидности топика в Telegram
export async function isTopicValidInTelegram(botToken, groupId, topicId) {
  try {
    const telegramCheckUrl = `https://api.telegram.org/bot${botToken}/getForumTopicIconStickers`;
    const { data } = await axios.post(telegramCheckUrl, {
      chat_id: groupId,
      message_thread_id: topicId
    });
    
    // Если топик существует, API вернет ok: true
    return data?.ok === true;
  } catch (error) {
    // Если топик не существует или удален - API вернет ошибку
    console.warn(`⚠️ Topic ${topicId} not valid in Telegram:`, error.response?.data?.description || error.message);
    return false;
  }
}

export async function dbSaveTopic(clientId, topicId, visitorId = null, requestId = null, url = null, meta = null) {
  if (!sb) { memoryMap.set(clientId, topicId); return; }
  
  const topicData = { 
    client_id: clientId, 
    topic_id: topicId,
    visitor_id: visitorId,
    request_id: requestId,
    page_url: url, // 🔥 СОХРАНЯЕМ URL!
    page_title: meta?.title || null,
    referrer: meta?.ref || null,
    utm_source: meta?.utm?.source || null,
    utm_medium: meta?.utm?.medium || null,
    utm_campaign: meta?.utm?.campaign || null,
    visit_type: 'page_visit', // 🔥 ДОБАВЛЕНО: обязательное поле из схемы!
    updated_at: new Date().toISOString(), // 🔥 ДОБАВЛЕНО: время обновления
    fingerprint_data: visitorId ? { 
      visitorId, 
      requestId, 
      url,
      meta,
      timestamp: new Date().toISOString() 
    } : null
  };
  
  // 🔄 ИСПРАВЛЕНИЕ: используем visitor_id для уникальности записей!
  try {
    if (visitorId) {
      // Для посетителей с visitor_id - ищем по visitor_id (БЕЗ client_id!)
      console.log(`🔍 dbSaveTopic: Checking if visitor ${visitorId.slice(0,8)}... already exists`);
      const existing = await sb
        .from('client_topics')
        .select('id, client_id, topic_id')
        .eq('visitor_id', visitorId)  // 🔥 ТОЛЬКО по visitor_id!
        .maybeSingle();
      
      if (existing.data) {
        // Обновляем существующую запись (НЕ меняем client_id и topic_id!)
        console.log(`🔄 Updating existing visitor ${visitorId.slice(0,8)}... - keeping original client_id: ${existing.data.client_id}, topic_id: ${existing.data.topic_id}`);
        
        // Обновляем только метаданные, НЕ трогаем client_id и topic_id
        const updateData = {
          page_url: url,
          page_title: topicData.page_title,
          referrer: topicData.referrer,
          utm_source: topicData.utm_source,
          utm_medium: topicData.utm_medium,
          utm_campaign: topicData.utm_campaign,
          updated_at: topicData.updated_at,
          fingerprint_data: topicData.fingerprint_data
          // НЕ обновляем: client_id, topic_id (оставляем оригинальные!)
        };
        
        const { data, error } = await sb
          .from('client_topics')
          .update(updateData)
          .eq('id', existing.data.id)
          .select();
        
        if (error) {
          console.error('❌ dbSaveTopic update error:', error);
        } else {
          console.log(`✅ dbSaveTopic update success - preserved original topic_id: ${existing.data.topic_id}`);
          
          // Обновляем кэш
          visitorCache.setCachedVisitor(visitorId, {
            topicId: existing.data.topic_id,
            clientId: existing.data.client_id,
            pageUrl: url
          });
        }
      } else {
        // Создаем новую запись
        console.log(`🆕 Inserting new record for visitor ${visitorId.slice(0,8)}... to client_topics`);
        const { data, error } = await sb
          .from('client_topics')
          .insert(topicData)
          .select();
        
        if (error) {
          console.error('❌ dbSaveTopic insert error:', error);
          console.error('❌ Failed topicData:', topicData);
        } else {
          console.log(`✅ dbSaveTopic insert success:`, data);
          
          // Добавляем в кэш новую запись
          if (visitorId) {
            visitorCache.setCachedVisitor(visitorId, {
              topicId: topicId,
              clientId: clientId,
              pageUrl: url
            });
          }
        }
      }
    } else {
      // Для старых записей без visitor_id - upsert по client_id (обратная совместимость)
      console.log(`🔄 Upserting record for client ${clientId} (no visitor_id) to client_topics`);
      const { data, error } = await sb
        .from('client_topics')
        .upsert(topicData, { onConflict: 'client_id' })
        .select();
      
      if (error) {
        console.error('❌ dbSaveTopic upsert error:', error);
        console.error('❌ Failed topicData:', topicData);
      } else {
        console.log(`✅ dbSaveTopic upsert success:`, data);
      }
    }
  } catch (error) {
    console.error('❌ dbSaveTopic error:', error);
  }
}

// ===== Site Visits Tracking =====
// 🆕 Функция для записи каждого визита в таблицу site_visits
export async function saveSiteVisit(clientId, visitorId, requestId, url, meta, userAgent = null, ipAddress = null) {
  if (!sb) {
    console.log('⚠️ Supabase not available - skipping site_visits tracking');
    return;
  }

  try {
    const siteVisitData = {
      client_id: clientId,
      visitor_id: visitorId,
      request_id: requestId,
      page_url: url,
      page_title: meta?.title || null,
      referrer: meta?.ref || null,
      user_agent: userAgent,
      ip_address: ipAddress,
      utm_source: meta?.utm?.source || null,
      utm_medium: meta?.utm?.medium || null,
      utm_campaign: meta?.utm?.campaign || null,
      utm_term: meta?.utm?.term || null,
      utm_content: meta?.utm?.content || null,
      session_id: meta?.sessionId || null,
      fingerprint_data: {
        visitorId,
        requestId,
        url,
        meta,
        timestamp: new Date().toISOString(),
        userAgent,
        ipAddress
      },
      visit_timestamp: new Date().toISOString()
    };

    console.log(`📊 Saving site visit: ${visitorId.slice(0,8)}... → ${url}`);
    
    const { data, error } = await sb
      .from('site_visits')
      .insert(siteVisitData)
      .select();

    if (error) {
      console.error('❌ saveSiteVisit error:', error);
      console.error('❌ Failed siteVisitData:', siteVisitData);
    } else {
      console.log(`✅ Site visit saved: ${data[0]?.id || 'unknown'} [${visitorId.slice(0,8)}...]`);
    }
  } catch (error) {
    console.error('❌ saveSiteVisit error:', error);
  }
}

// ===== Telegram helpers =====
// 🆕 Умная функция обеспечения топика для посетителя конкретного клиента
export async function ensureTopicForVisitorForClient(clientId, client, visitorId = null, requestId = null, url = null, meta = null) {
  // 1️⃣ Если есть visitorId - ищем существующего посетителя для конкретного клиента
  if (visitorId) {
    console.log(`🔍 Checking for existing visitor: ${visitorId.slice(0,8)}... for client ${clientId}`);
    
    const existingVisitor = await findExistingVisitorForClient(clientId, visitorId);
    if (existingVisitor) {
      console.log(`👤 Found existing visitor for client ${clientId} with topic: ${existingVisitor.topic_id}`);
      
      // 2️⃣ Проверяем валидность топика в Telegram
      const botToken = client?.telegram_bot_token || BOT_TOKEN;
      const groupId = client?.telegram_group_id || SUPERGROUP_ID;
      
      const isValidTopic = await isTopicValidInTelegram(botToken, groupId, existingVisitor.topic_id);
      if (isValidTopic) {
        console.log(`✅ Topic ${existingVisitor.topic_id} is valid - reusing for visitor and client ${clientId}`);
        
        // 3️⃣ Обновляем ТОЛЬКО метаданные последнего визита (НЕ создаем новую запись!)
        try {
          const { error } = await sb
            .from('client_topics')
            .update({
              page_url: url,
              page_title: meta?.title || null,
              referrer: meta?.ref || null,
              utm_source: meta?.utm?.source || null,
              utm_medium: meta?.utm?.medium || null,
              utm_campaign: meta?.utm?.campaign || null,
              updated_at: new Date().toISOString(),
              fingerprint_data: visitorId ? { 
                visitorId, 
                requestId, 
                url,
                meta,
                timestamp: new Date().toISOString() 
              } : null
            })
            .eq('client_id', clientId)
            .eq('visitor_id', visitorId);
          
          if (error) console.error('❌ Update existing visitor error:', error);
          else console.log(`🔄 Updated existing visitor metadata for client ${clientId}: ${visitorId.slice(0,8)}...`);
        } catch (error) {
          console.error('❌ Update existing visitor error:', error);
        }
        
        return {
          topicId: existingVisitor.topic_id,
          isExistingVisitor: true,
          previousUrl: existingVisitor.page_url,
          firstVisit: existingVisitor.created_at,
          originalClientId: existingVisitor.client_id  // 🔥 Оригинальный client_id
        };
      } else {
        console.log(`❌ Topic ${existingVisitor.topic_id} is invalid - creating new topic for client ${clientId}`);
      }
    }
  }
  
  // 4️⃣ Создаем новый топик (для новых посетителей или если старый топик недействителен)
  return await createNewTopic(clientId, client, visitorId, requestId, url, meta);
}

// 🆕 Умная функция обеспечения топика для посетителя (глобальный поиск)
export async function ensureTopicForVisitor(clientId, client, visitorId = null, requestId = null, url = null, meta = null) {
  // 1️⃣ Если есть visitorId - ищем существующего посетителя
  if (visitorId) {
    console.log(`🔍 Checking for existing visitor: ${visitorId.slice(0,8)}...`);
    
    const existingVisitor = await findExistingVisitor(clientId, visitorId);
    if (existingVisitor) {
      console.log(`👤 Found existing visitor with topic: ${existingVisitor.topic_id}`);
      
      // 2️⃣ Проверяем валидность топика в Telegram
      const botToken = client?.telegram_bot_token || BOT_TOKEN;
      const groupId = client?.telegram_group_id || SUPERGROUP_ID;
      
      const isValidTopic = await isTopicValidInTelegram(botToken, groupId, existingVisitor.topic_id);
      if (isValidTopic) {
        console.log(`✅ Topic ${existingVisitor.topic_id} is valid - reusing for visitor`);
        
        // 3️⃣ Обновляем ТОЛЬКО метаданные последнего визита (НЕ создаем новую запись!)
        try {
          const { error } = await sb
            .from('client_topics')
            .update({
              page_url: url,
              page_title: meta?.title || null,
              referrer: meta?.ref || null,
              utm_source: meta?.utm?.source || null,
              utm_medium: meta?.utm?.medium || null,
              utm_campaign: meta?.utm?.campaign || null,
              updated_at: new Date().toISOString(),
              fingerprint_data: visitorId ? { 
                visitorId, 
                requestId, 
                url,
                meta,
                timestamp: new Date().toISOString() 
              } : null
            })
            .eq('client_id', clientId)
            .eq('visitor_id', visitorId);
          
          if (error) console.error('❌ Update existing visitor error:', error);
          else console.log(`🔄 Updated existing visitor metadata: ${visitorId.slice(0,8)}...`);
        } catch (error) {
          console.error('❌ Update existing visitor error:', error);
        }
        
        return {
          topicId: existingVisitor.topic_id,
          isExistingVisitor: true,
          previousUrl: existingVisitor.page_url,
          firstVisit: existingVisitor.created_at,
          originalClientId: existingVisitor.client_id  // 🔥 Оригинальный client_id
        };
      } else {
        console.log(`❌ Topic ${existingVisitor.topic_id} is invalid - creating new topic`);
      }
    }
  }
  
  // 4️⃣ Создаем новый топик (для новых посетителей или если старый топик недействителен)
  return await createNewTopic(clientId, client, visitorId, requestId, url, meta);
}

// 🔄 Старая функция ensureTopic - теперь только для обратной совместимости
export async function ensureTopic(clientId, client, visitorId = null, requestId = null, url = null, meta = null) {
  // Используем новую умную логику
  const result = await ensureTopicForVisitor(clientId, client, visitorId, requestId, url, meta);
  return typeof result === 'object' ? result.topicId : result;
}

// 🆕 Вынесенная логика создания нового топика
export async function createNewTopic(clientId, client, visitorId = null, requestId = null, url = null, meta = null) {
  console.log(`🆕 Creating new topic for client: ${client?.client_name || clientId}`);
  
  let topicId = await dbGetTopic(clientId);
  if (topicId) return topicId;

  // Используем настройки клиента
  const botToken = client?.telegram_bot_token || BOT_TOKEN;
  const groupId = client?.telegram_group_id || SUPERGROUP_ID;

  if (!botToken || !groupId) {
    throw new Error(`Telegram settings not configured for client ${client?.client_name || clientId}`);
  }

  // Create topic title with short unique ID
  const shortId = Date.now().toString(36).slice(-6);
  const title = visitorId 
    ? `Визит - ${shortId}`
    : `Client #${clientId} (${client?.client_name || 'Unknown'})`;
    
  const telegramUrl = `https://api.telegram.org/bot${botToken}/createForumTopic`;
  const { data } = await axios.post(telegramUrl, {
    chat_id: groupId,
    name: title
  });
  if (!data?.ok) throw new Error('createForumTopic failed: ' + JSON.stringify(data));
  topicId = data.result.message_thread_id;

  await dbSaveTopic(clientId, topicId, visitorId, requestId, url, meta);
  console.log(`✅ Created topic ${topicId} for client ${client?.client_name || clientId}${visitorId ? ` [Visitor: ${visitorId.slice(0,8)}...]` : ''}`);
  
  return {
    topicId,
    isExistingVisitor: false
  };
}

export async function sendToTopic({ clientId, text, prefix = '', client, visitorId = null, requestId = null, url = null, meta = null }) {
  const result = await ensureTopicForVisitor(clientId, client, visitorId, requestId, url, meta);
  const topicId = typeof result === 'object' ? result.topicId : result;

  // Используем настройки клиента
  const botToken = client?.telegram_bot_token || BOT_TOKEN;
  const groupId = client?.telegram_group_id || SUPERGROUP_ID;

  const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const msg = `${prefix}${text}`.slice(0, 4096);
  const payload = {
    chat_id: groupId,
    message_thread_id: topicId,
    text: msg,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };
  
  console.log(`📤 Sending to Telegram: bot=${botToken.slice(0,10)}..., group=${groupId}, topic=${topicId}`);
  const { data } = await axios.post(telegramApiUrl, payload);
  if (!data?.ok) throw new Error('sendMessage failed: ' + JSON.stringify(data));
  console.log(`✅ Message sent to Telegram topic ${topicId}`);
  return data.result;
}

// 🆕 Прямая отправка сообщения в Telegram (без создания топика)
export async function sendTelegramMessage(topicId, message, prefix, client) {
  const botToken = client?.telegram_bot_token || BOT_TOKEN;
  const groupId = client?.telegram_group_id || SUPERGROUP_ID;
  
  const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const fullMessage = `${prefix}${message}`.slice(0, 4096);
  
  const payload = {
    chat_id: groupId,
    message_thread_id: topicId,
    text: fullMessage,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };
  
  console.log(`📤 Sending to Telegram topic ${topicId}: ${botToken.slice(0,10)}...`);
  const { data } = await axios.post(telegramApiUrl, payload);
  if (!data?.ok) throw new Error('sendMessage failed: ' + JSON.stringify(data));
  console.log(`✅ Message sent to Telegram topic ${topicId}`);
  return data.result;
}

// Экспорт memoryMap для обратной совместимости
export { memoryMap };
