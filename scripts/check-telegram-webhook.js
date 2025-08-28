#!/usr/bin/env node

/**
 * 🔍 ПРОВЕРКА TELEGRAM WEBHOOK
 * 
 * Этот скрипт проверяет текущее состояние webhook для Telegram бота
 * и показывает детальную информацию о настройках.
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

async function checkWebhook() {
  try {
    if (!BOT_TOKEN) {
      console.log('❌ Ошибка: TELEGRAM_BOT_TOKEN не найден в .env файле');
      process.exit(1);
    }
    
    console.log('🔍 Проверяем состояние Telegram webhook...');
    console.log('🤖 Bot Token:', BOT_TOKEN.slice(0, 10) + '...');
    console.log('🔐 Webhook Secret:', WEBHOOK_SECRET || 'НЕ УСТАНОВЛЕН');
    
    // Получаем информацию о webhook
    const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    
    if (response.data.ok) {
      const info = response.data.result;
      
      console.log('\n📊 ИНФОРМАЦИЯ О WEBHOOK:');
      console.log('=' .repeat(50));
      
      if (info.url) {
        console.log('✅ Webhook URL установлен:', info.url);
        
        // Проверяем, соответствует ли URL нашему формату
        const expectedPattern = `/telegram/webhook/${WEBHOOK_SECRET}`;
        if (info.url.includes(expectedPattern)) {
          console.log('✅ URL соответствует ожидаемому формату');
        } else {
          console.log('⚠️  URL НЕ соответствует ожидаемому формату');
          console.log('   Ожидается: ...', expectedPattern);
        }
      } else {
        console.log('❌ Webhook URL НЕ УСТАНОВЛЕН');
        console.log('💡 Используйте: node scripts/setup-telegram-webhook.js <YOUR_DOMAIN>');
      }
      
      console.log('📈 Ожидающие обновления:', info.pending_update_count || 0);
      console.log('🔗 Максимум соединений:', info.max_connections || 'По умолчанию');
      
      if (info.last_error_date) {
        console.log('❌ Последняя ошибка:', new Date(info.last_error_date * 1000));
        console.log('📝 Сообщение ошибки:', info.last_error_message || 'Не указано');
      } else {
        console.log('✅ Ошибок не обнаружено');
      }
      
      if (info.ip_address) {
        console.log('🌐 IP адрес:', info.ip_address);
      }
      
      console.log('=' .repeat(50));
      
      // Рекомендации
      if (!info.url) {
        console.log('\n💡 РЕКОМЕНДАЦИИ:');
        console.log('1. Установите webhook с помощью:');
        console.log('   node scripts/setup-telegram-webhook.js https://your-domain.com');
        console.log('2. Замените https://your-domain.com на ваш реальный домен');
      } else if (info.pending_update_count > 0) {
        console.log('\n⚠️  ВНИМАНИЕ:');
        console.log(`У вас ${info.pending_update_count} ожидающих обновлений`);
        console.log('Рекомендуется переустановить webhook для их очистки');
      } else {
        console.log('\n🎉 Webhook настроен корректно!');
      }
      
    } else {
      console.log('❌ Ошибка при получении информации о webhook:', response.data.description);
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    if (error.response) {
      console.error('📋 Детали ошибки:', error.response.data);
    }
  }
}

// Запуск скрипта
checkWebhook();