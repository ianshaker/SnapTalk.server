/**
 * 🔗 WEBHOOK SERVICE
 * 
 * Сервис для автоматической настройки webhook'ов для каждого клиента.
 * Каждый клиент получает уникальный webhook URL для своего бота.
 * 
 * Архитектура:
 * - Каждый клиент имеет свой telegram_bot_token
 * - Каждый клиент имеет свой telegram_group_id (отдельный чат)
 * - Каждый клиент получает уникальный webhook URL: /telegram/webhook/client/{clientId}
 * - Webhook'и настраиваются автоматически при создании клиента
 */

import axios from 'axios';
import crypto from 'crypto';
import { sb } from '../config/env.js';

/**
 * Генерирует уникальный webhook secret для клиента
 */
function generateWebhookSecret(clientId) {
  return crypto.createHash('sha256')
    .update(`client_${clientId}_${Date.now()}`)
    .digest('hex')
    .substring(0, 32);
}

/**
 * Настраивает webhook для конкретного клиента
 * @param {string} clientId - ID клиента
 * @param {string} botToken - Telegram bot token клиента
 * @param {string} domain - Домен сервера (например, https://your-app.render.com)
 * @returns {Promise<Object>} Результат настройки
 */
export async function setupClientWebhook(clientId, botToken, domain) {
  try {
    if (!clientId || !botToken || !domain) {
      throw new Error('Missing required parameters: clientId, botToken, domain');
    }

    // Генерируем уникальный secret для клиента
    const webhookSecret = generateWebhookSecret(clientId);
    
    // Формируем уникальный webhook URL для клиента
    const webhookUrl = `${domain}/telegram/webhook/client/${clientId}/${webhookSecret}`;
    
    console.log(`🔧 Setting up webhook for client ${clientId}:`);
    console.log(`📡 Webhook URL: ${webhookUrl}`);
    console.log(`🤖 Bot Token: ${botToken.slice(0, 10)}...`);
    
    // Удаляем старый webhook (если есть)
    console.log('🗑️  Removing old webhook...');
    const deleteResponse = await axios.post(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
    
    if (!deleteResponse.data.ok) {
      console.log('⚠️  Warning: Failed to delete old webhook:', deleteResponse.data.description);
    }
    
    // Устанавливаем новый webhook
    console.log('🔗 Setting up new webhook...');
    const setResponse = await axios.post(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      url: webhookUrl,
      drop_pending_updates: true
    });
    
    if (!setResponse.data.ok) {
      throw new Error(`Failed to set webhook: ${setResponse.data.description}`);
    }
    
    // Сохраняем webhook secret в базе данных
    if (sb) {
      const { error } = await sb
        .from('clients')
        .update({ 
          telegram_webhook_secret: webhookSecret,
          telegram_webhook_url: webhookUrl,
          webhook_status: 'active',
          webhook_updated_at: new Date().toISOString()
        })
        .eq('id', clientId);
        
      if (error) {
        console.error('❌ Failed to save webhook secret to database:', error);
        throw new Error('Failed to save webhook configuration');
      }
    }
    
    console.log(`✅ Webhook successfully configured for client ${clientId}`);
    
    return {
      success: true,
      clientId,
      webhookUrl,
      webhookSecret,
      botToken: botToken.slice(0, 10) + '...'
    };
    
  } catch (error) {
    console.error(`❌ Failed to setup webhook for client ${clientId}:`, error.message);
    
    // Обновляем статус в базе данных
    if (sb) {
      await sb
        .from('clients')
        .update({ 
          webhook_status: 'failed',
          webhook_error: error.message,
          webhook_updated_at: new Date().toISOString()
        })
        .eq('id', clientId);
    }
    
    return {
      success: false,
      clientId,
      error: error.message
    };
  }
}

/**
 * Проверяет статус webhook для клиента
 * @param {string} botToken - Telegram bot token
 * @returns {Promise<Object>} Информация о webhook
 */
export async function checkClientWebhook(botToken) {
  try {
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    
    if (response.data.ok) {
      return {
        success: true,
        info: response.data.result
      };
    } else {
      return {
        success: false,
        error: response.data.description
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Удаляет webhook для клиента
 * @param {string} clientId - ID клиента
 * @param {string} botToken - Telegram bot token
 * @returns {Promise<Object>} Результат удаления
 */
export async function removeClientWebhook(clientId, botToken) {
  try {
    console.log(`🗑️  Removing webhook for client ${clientId}`);
    
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
    
    if (response.data.ok) {
      // Обновляем статус в базе данных
      if (sb) {
        await sb
          .from('clients')
          .update({ 
            telegram_webhook_secret: null,
            telegram_webhook_url: null,
            webhook_status: 'removed',
            webhook_updated_at: new Date().toISOString()
          })
          .eq('id', clientId);
      }
      
      console.log(`✅ Webhook removed for client ${clientId}`);
      return { success: true, clientId };
    } else {
      throw new Error(response.data.description);
    }
  } catch (error) {
    console.error(`❌ Failed to remove webhook for client ${clientId}:`, error.message);
    return {
      success: false,
      clientId,
      error: error.message
    };
  }
}

/**
 * Настраивает webhook'и для всех активных клиентов
 * @param {string} domain - Домен сервера
 * @returns {Promise<Object>} Результаты настройки
 */
export async function setupAllClientWebhooks(domain) {
  try {
    if (!sb) {
      throw new Error('Supabase connection not available');
    }
    
    console.log('🔧 Setting up webhooks for all active clients...');
    
    // Получаем всех активных клиентов с Telegram настройками
    const { data: clients, error } = await sb
      .from('clients')
      .select('id, client_name, telegram_bot_token, telegram_group_id')
      .eq('integration_status', 'active')
      .not('telegram_bot_token', 'is', null)
      .not('telegram_group_id', 'is', null);
      
    if (error) {
      throw new Error(`Failed to fetch clients: ${error.message}`);
    }
    
    if (!clients || clients.length === 0) {
      console.log('⚠️  No active clients with Telegram configuration found');
      return { success: true, results: [] };
    }
    
    console.log(`📋 Found ${clients.length} clients to configure`);
    
    const results = [];
    
    // Настраиваем webhook для каждого клиента
    for (const client of clients) {
      console.log(`\n🔄 Processing client: ${client.client_name} (${client.id})`);
      
      const result = await setupClientWebhook(
        client.id,
        client.telegram_bot_token,
        domain
      );
      
      results.push({
        clientId: client.id,
        clientName: client.client_name,
        ...result
      });
      
      // Небольшая пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n🎉 Webhook setup completed:`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    
    return {
      success: true,
      total: clients.length,
      successful,
      failed,
      results
    };
    
  } catch (error) {
    console.error('❌ Failed to setup webhooks for all clients:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}