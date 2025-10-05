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

// ===== Кэш для CORS доменов =====
const domainCache = new Map(); // origin -> { allowed: boolean, timestamp: number }
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

// ===== Функция нормализации URL =====
function normalizeUrl(url) {
  if (!url) return null;
  
  try {
    // Убираем trailing slash
    let normalized = url.replace(/\/$/, '');
    
    // Приводим к нижнему регистру для сравнения
    normalized = normalized.toLowerCase();
    
    return normalized;
  } catch (error) {
    console.error('❌ Error normalizing URL:', error);
    return url;
  }
}

// ===== Функция извлечения origin из URL =====
function extractOrigin(url) {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.host}`;
  } catch (error) {
    console.error('❌ Error extracting origin from URL:', error);
    return url;
  }
}

// ===== Динамическая проверка CORS доменов через базу данных =====
export async function isDomainAllowed(origin) {
  if (!origin || origin === 'null') return true; // Разрешаем запросы без origin
  
  // Проверяем кэш
  const cached = domainCache.get(origin);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`🔄 CORS cache hit for ${origin}: ${cached.allowed ? '✅ allowed' : '❌ denied'}`);
    return cached.allowed;
  }
  
  try {
    // Нормализуем origin для сравнения
    const normalizedOrigin = normalizeUrl(origin);
    
    // Проверяем в базе данных
    const { data, error } = await sb
      .from('clients')
      .select('website_url, integration_status')
      .eq('integration_status', 'active');
    
    if (error) {
      console.error('❌ Error checking domains in database:', error);
      // В случае ошибки БД разрешаем запрос (fail-safe)
      return true;
    }
    
    // Проверяем совпадения
    let allowed = false;
    if (data && data.length > 0) {
      for (const client of data) {
        if (client.website_url) {
          // Извлекаем origin из website_url для правильного сравнения
          const clientOrigin = extractOrigin(client.website_url);
          const normalizedClientOrigin = normalizeUrl(clientOrigin);
          
          if (normalizedClientOrigin === normalizedOrigin) {
            allowed = true;
            console.log(`✅ CORS allowed for ${origin} (found in database: ${client.website_url})`);
            break;
          }
        }
      }
    }
    
    if (!allowed) {
      console.log(`❌ CORS denied for ${origin} (not found in database)`);
    }
    
    // Кэшируем результат
    domainCache.set(origin, { allowed, timestamp: Date.now() });
    
    return allowed;
    
  } catch (error) {
    console.error('❌ Error in isDomainAllowed:', error);
    // В случае ошибки разрешаем запрос (fail-safe)
    return true;
  }
}

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

export async function dbGetTopic(clientId, chatId = null) {
  if (!sb) return memoryMap.get(clientId) || null;
  
  // 🆕 ДОБАВЛЕНО: поиск с учетом chat_id
  const finalChatId = chatId || parseInt(SUPERGROUP_ID);
  
  const { data, error } = await sb
    .from('client_topics')
    .select('topic_id, chat_id')
    .eq('client_id', clientId)
    .eq('chat_id', finalChatId)
    .maybeSingle();
    
  if (error) { 
    console.error('dbGetTopic error', error); 
    return null; 
  }
  
  if (data) {
    console.log(`✅ Found topic ${data.topic_id} for client ${clientId} in chat ${finalChatId}`);
    return data.topic_id;
  }
  
  // FALLBACK: если не найдено с chat_id, ищем без него (обратная совместимость)
  console.log(`🔄 Fallback: searching for client ${clientId} without chat_id`);
  const { data: fallbackData, error: fallbackError } = await sb
    .from('client_topics')
    .select('topic_id')
    .eq('client_id', clientId)
    .is('chat_id', null)
    .maybeSingle();
    
  if (fallbackError) {
    console.error('dbGetTopic fallback error', fallbackError);
    return null;
  }
  
  return fallbackData?.topic_id ?? null;
}

// 🆕 Поиск существующего посетителя по visitor_id для конкретного клиента
export async function findExistingVisitorForClient(clientId, visitorId) {
  if (!sb || !visitorId) {
    return null;
  }
  
  try {
    const { data, error } = await sb
      .from('client_topics')
      .select('topic_id, visitor_id, created_at, page_url, client_id')
      .eq('visitor_id', visitorId)
      .eq('client_id', clientId)
      .maybeSingle();
    
    if (error) {
      console.error('❌ findExistingVisitorForClient error:', error);
      return null;
    }
    
    return data;
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
    const { data, error } = await sb
      .from('client_topics')
      .select('topic_id, visitor_id, created_at, page_url, client_id, last_session_status')
      .eq('client_id', clientId)
      .eq('visitor_id', visitorId)
      .maybeSingle();
    
    if (error) {
      console.error('❌ findExistingVisitorForClient error:', error);
      return null;
    }
    
    return data;
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

export async function dbSaveTopic(clientId, topicId, visitorId = null, requestId = null, url = null, meta = null, chatId = null) {
  if (!sb) { memoryMap.set(clientId, topicId); return; }
  
  // 🆕 ДОБАВЛЕНО: chat_id для корректной маршрутизации
  const finalChatId = chatId || parseInt(SUPERGROUP_ID);
  
  const topicData = { 
    client_id: clientId, 
    topic_id: topicId,
    chat_id: finalChatId, // 🔥 НОВОЕ: сохраняем chat_id!
    visitor_id: visitorId,
    request_id: requestId,
    page_url: url, // 🔥 СОХРАНЯЕМ URL!
    page_title: meta?.title || null,
    referrer: meta?.ref || null,
    utm_source: meta?.utm?.source || null,
    utm_medium: meta?.utm?.medium || null,
    utm_campaign: meta?.utm?.campaign || null,
    last_session_status: 'active', // 🔥 НОВОЕ: устанавливаем статус сессии
    visit_type: 'page_visit', // 🔥 ДОБАВЛЕНО: обязательное поле из схемы!
    updated_at: new Date().toISOString(), // 🔥 ДОБАВЛЕНО: время обновления
    fingerprint_data: visitorId ? { 
      visitorId, 
      requestId, 
      url,
      meta,
      chatId: finalChatId, // 🔥 НОВОЕ: включаем chat_id в fingerprint
      timestamp: new Date().toISOString() 
    } : null
  };
  
  console.log(`💾 dbSaveTopic: Saving topic ${topicId} for client ${clientId} in chat ${finalChatId}`);
  
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
          last_session_status: 'active', // 🔥 НОВОЕ: обновляем статус сессии
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
// 🆕 Функция для обновления существующей записи site_visits при завершении сессии
export async function updateSiteVisitOnSessionEnd(visitorId, sessionDuration = null) {
  if (!sb) {
    console.log('⚠️ Supabase not available - skipping site_visits update');
    return;
  }

  try {
    // Находим существующую запись для этого visitor_id сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const { data: existingVisit, error: findError } = await sb
      .from('site_visits')
      .select('id')
      .eq('visitor_id', visitorId)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .maybeSingle();
    
    if (findError) {
      console.error('❌ Error finding site visit to update:', findError);
      return;
    }
    
    if (!existingVisit) {
      console.log(`⚠️ No existing site visit found for visitor ${visitorId.slice(0,8)}... - cannot update`);
      return;
    }

    // Обновляем запись с длительностью сессии
    const updateData = {};
    
    if (sessionDuration !== null) {
      updateData.session_duration = sessionDuration;
    }
    
    // Обновляем updated_at для отметки времени завершения сессии
    updateData.updated_at = new Date().toISOString();
    
    const { error: updateError } = await sb
      .from('site_visits')
      .update(updateData)
      .eq('id', existingVisit.id);

    if (updateError) {
      console.error('❌ updateSiteVisitOnSessionEnd error:', updateError);
    } else {
      console.log(`✅ Site visit updated on session end: ${existingVisit.id} [${visitorId.slice(0,8)}...]`);
    }
  } catch (error) {
    console.error('❌ updateSiteVisitOnSessionEnd error:', error);
  }
}

// 🆕 Функция для записи каждого визита в таблицу site_visits
export async function saveSiteVisit(clientId, visitorId, requestId, url, meta, userAgent = null, ipAddress = null) {
  if (!sb) {
    console.log('⚠️ Supabase not available - skipping site_visits tracking');
    return;
  }

  try {
    // Проверяем, существует ли уже запись для этого visitor_id сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const { data: existingVisit, error: checkError } = await sb
      .from('site_visits')
      .select('id, created_at')
      .eq('visitor_id', visitorId)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .maybeSingle();
    
    if (checkError) {
      console.error('❌ Error checking existing site visit:', checkError);
    }
    
    if (existingVisit) {
      console.log(`⚠️ Site visit already exists for visitor ${visitorId.slice(0,8)}... today - skipping duplicate`);
      return;
    }

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
    
    const { data, error } = await sb
      .from('site_visits')
      .insert(siteVisitData)
      .select();

    if (error) {
      console.error('❌ saveSiteVisit error:', error);
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
  // Если есть visitorId - ищем существующего посетителя для конкретного клиента
  if (visitorId) {
    const existingVisitor = await findExistingVisitorForClient(clientId, visitorId);
    if (existingVisitor) {
      // Проверяем валидность топика в Telegram
      const botToken = client?.telegram_bot_token || BOT_TOKEN;
      const groupId = client?.telegram_group_id || SUPERGROUP_ID;
      
      // 🔥 ИСПРАВЛЕНИЕ: кэшированные данные используют topicId, а не topic_id
      const topicId = existingVisitor.topicId || existingVisitor.topic_id;
      const isValidTopic = await isTopicValidInTelegram(botToken, groupId, topicId);
      if (isValidTopic) {
        
        // БОЛЬШЕ НЕ ОБНОВЛЯЕМ СТАТУС В ФОНЕ. Только возвращаем то, что в базе.
        const lastSessionStatus = existingVisitor.last_session_status || 'active';

        // Асинхронно обновляем метаданные (без статуса)
        (async () => {
          try {
            const updateData = {
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
            };

            const { error } = await sb
              .from('client_topics')
              .update(updateData)
              .eq('visitor_id', visitorId);

            if (error) console.error('❌ Background metadata update error:', error);
          } catch (error) {
            console.error('❌ Background metadata update error:', error);
          }
        })();

        return {
          topicId: topicId,
          isExistingVisitor: true,
          previousUrl: existingVisitor.page_url || existingVisitor.pageUrl,
          firstVisit: existingVisitor.created_at,
          originalClientId: existingVisitor.client_id || existingVisitor.clientId,
          lastSessionStatus: lastSessionStatus // Возвращаем актуальный статус из базы
        };
      }
    }
  }
  
  // Создаем новый топик (для новых посетителей или если старый топик недействителен)
  return await createNewTopic(clientId, client, visitorId, requestId, url, meta);
}

// 🆕 Умная функция обеспечения топика для посетителя (глобальный поиск)
export async function ensureTopicForVisitor(clientId, client, visitorId = null, requestId = null, url = null, meta = null) {
  // Если есть visitorId - ищем существующего посетителя
  if (visitorId) {
    const existingVisitor = await findExistingVisitor(clientId, visitorId);
    if (existingVisitor) {
      // Проверяем валидность топика в Telegram
      const botToken = client?.telegram_bot_token || BOT_TOKEN;
      const groupId = client?.telegram_group_id || SUPERGROUP_ID;
      
      // 🔥 ИСПРАВЛЕНИЕ: кэшированные данные используют topicId, а не topic_id
      const topicId = existingVisitor.topicId || existingVisitor.topic_id;
      const isValidTopic = await isTopicValidInTelegram(botToken, groupId, topicId);
      if (isValidTopic) {
        
        // Обновляем метаданные последнего визита
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
              // НЕ обновляем last_session_status - сохраняем существующий статус
              updated_at: new Date().toISOString(),
              fingerprint_data: visitorId ? { 
                visitorId, 
                requestId, 
                url,
                meta,
                timestamp: new Date().toISOString() 
              } : null
            })
            .eq('visitor_id', visitorId);
          
          if (error) console.error('❌ Update existing visitor error:', error);
        } catch (error) {
          console.error('❌ Update existing visitor error:', error);
        }
        
        return {
          topicId: topicId,
          isExistingVisitor: true,
          previousUrl: existingVisitor.page_url || existingVisitor.pageUrl,
          firstVisit: existingVisitor.created_at,
          originalClientId: existingVisitor.client_id || existingVisitor.clientId,
          lastSessionStatus: existingVisitor.last_session_status || 'active'
        };
      }
    }
  }
  
  // Создаем новый топик (для новых посетителей или если старый топик недействителен)
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
  // 🆕 ДОБАВЛЕНО: используем chat_id для корректного поиска и сохранения
  const chatId = client?.telegram_group_id || SUPERGROUP_ID;
  let topicId = await dbGetTopic(clientId, chatId);
  if (topicId) return topicId;

  // Используем настройки клиента
  const botToken = client?.telegram_bot_token || BOT_TOKEN;
  const groupId = chatId; // используем уже определенный chatId

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

  // 🆕 ДОБАВЛЕНО: передаем chat_id для корректной маршрутизации
  await dbSaveTopic(clientId, topicId, visitorId, requestId, url, meta, chatId);
  
  return {
    topicId,
    isExistingVisitor: false,
    lastSessionStatus: 'active'
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
  
  const { data } = await axios.post(telegramApiUrl, payload);
  if (!data?.ok) throw new Error('sendMessage failed: ' + JSON.stringify(data));
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
  
  const { data } = await axios.post(telegramApiUrl, payload);
  if (!data?.ok) throw new Error('sendMessage failed: ' + JSON.stringify(data));
  return data.result;
}

// Экспорт memoryMap для обратной совместимости
export { memoryMap };
