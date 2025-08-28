#!/usr/bin/env node

/**
 * 🔧 НАСТРОЙКА TELEGRAM WEBHOOK
 * 
 * Этот скрипт настраивает webhook URL для Telegram бота,
 * чтобы сообщения из Telegram доходили до сервера.
 * 
 * Использование:
 * node scripts/setup-telegram-webhook.js <YOUR_DOMAIN>
 * 
 * Пример:
 * node scripts/setup-telegram-webhook.js https://your-app.render.com
 */

import dotenv from 'dotenv';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Загружаем переменные окружения
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
dotenv.config({ path: join(projectRoot, '.env') });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

async function setupWebhook() {
  try {
    // Получаем домен из аргументов командной строки
    const domain = process.argv[2];
    
    if (!domain) {
      console.log('❌ Ошибка: Укажите домен');
      console.log('Использование: node scripts/setup-telegram-webhook.js <YOUR_DOMAIN>');
      console.log('Пример: node scripts/setup-telegram-webhook.js https://your-app.render.com');
      process.exit(1);
    }
    
    if (!BOT_TOKEN) {
      console.log('❌ Ошибка: TELEGRAM_BOT_TOKEN не найден в .env файле');
      process.exit(1);
    }
    
    if (!WEBHOOK_SECRET) {
      console.log('❌ Ошибка: TELEGRAM_WEBHOOK_SECRET не найден в .env файле');
      process.exit(1);
    }
    
    const webhookUrl = `${domain}/telegram/webhook/${WEBHOOK_SECRET}`;
    
    console.log('🔧 Настройка Telegram webhook...');
    console.log('📡 Webhook URL:', webhookUrl);
    console.log('🤖 Bot Token:', BOT_TOKEN.slice(0, 10) + '...');
    
    // Сначала удаляем старый webhook
    console.log('🗑️  Удаляем старый webhook...');
    const deleteResponse = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
    
    if (deleteResponse.data.ok) {
      console.log('✅ Старый webhook удален');
    } else {
      console.log('⚠️  Ошибка при удалении старого webhook:', deleteResponse.data.description);
    }
    
    // Устанавливаем новый webhook
    console.log('🔗 Устанавливаем новый webhook...');
    const setResponse = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      url: webhookUrl,
      drop_pending_updates: true // Удаляем старые обновления
    });
    
    if (setResponse.data.ok) {
      console.log('✅ Webhook успешно установлен!');
      console.log('📋 Детали:', setResponse.data.result);
    } else {
      console.log('❌ Ошибка при установке webhook:', setResponse.data.description);
      process.exit(1);
    }
    
    // Проверяем информацию о webhook
    console.log('🔍 Проверяем информацию о webhook...');
    const infoResponse = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    
    if (infoResponse.data.ok) {
      const info = infoResponse.data.result;
      console.log('📊 Информация о webhook:');
      console.log('  - URL:', info.url);
      console.log('  - Pending updates:', info.pending_update_count);
      console.log('  - Last error date:', info.last_error_date ? new Date(info.last_error_date * 1000) : 'None');
      console.log('  - Last error message:', info.last_error_message || 'None');
      console.log('  - Max connections:', info.max_connections);
    }
    
    console.log('\n🎉 Webhook настроен успешно!');
    console.log('💡 Теперь сообщения из Telegram будут приходить на ваш сервер');
    console.log('🔗 Webhook URL:', webhookUrl);
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    if (error.response) {
      console.error('📋 Детали ошибки:', error.response.data);
    }
    process.exit(1);
  }
}

// Запуск скрипта
setupWebhook();