#!/usr/bin/env node

/**
 * 🔍 ПРОВЕРКА TELEGRAM WEBHOOK С ТОКЕНОМ ИЗ RENDER
 * 
 * Этот скрипт проверяет webhook с токеном, который используется на Render
 */

import axios from 'axios';

// Новый токен из Render
const RENDER_BOT_TOKEN = '8301506242:AAFsCvMU-IyPA662gqK95mokhryeLk-4dSI';

async function checkRenderWebhook() {
  try {
    console.log('🔍 Проверяем состояние Telegram webhook с токеном из Render...');
    console.log('🤖 Bot Token:', RENDER_BOT_TOKEN.slice(0, 15) + '...');
    
    // Получаем информацию о webhook
    const response = await axios.post(`https://api.telegram.org/bot${RENDER_BOT_TOKEN}/getWebhookInfo`);
    
    if (response.data.ok) {
      const info = response.data.result;
      
      console.log('\n📊 ИНФОРМАЦИЯ О WEBHOOK:');
      console.log('=' .repeat(60));
      
      if (info.url) {
        console.log('✅ Webhook URL установлен:', info.url);
        
        // Проверяем домен
        const url = new URL(info.url);
        console.log('🌐 Домен:', url.hostname);
        console.log('📍 Путь:', url.pathname);
        
        if (url.hostname.includes('render.com')) {
          console.log('✅ Webhook указывает на Render');
        } else if (url.hostname.includes('localhost')) {
          console.log('⚠️  Webhook указывает на localhost (локальный сервер)');
        } else {
          console.log('🔍 Webhook указывает на:', url.hostname);
        }
      } else {
        console.log('❌ Webhook URL НЕ УСТАНОВЛЕН');
      }
      
      console.log('📈 Ожидающие обновления:', info.pending_update_count || 0);
      console.log('🔗 Максимум соединений:', info.max_connections || 'По умолчанию');
      
      if (info.last_error_date) {
        const errorDate = new Date(info.last_error_date * 1000);
        console.log('❌ Последняя ошибка:', errorDate.toLocaleString());
        console.log('📝 Сообщение ошибки:', info.last_error_message || 'Не указано');
      } else {
        console.log('✅ Ошибок не обнаружено');
      }
      
      if (info.ip_address) {
        console.log('🌐 IP адрес сервера:', info.ip_address);
      }
      
      console.log('=' .repeat(60));
      
      // Анализ проблем
      if (!info.url) {
        console.log('\n❌ ПРОБЛЕМА: Webhook не настроен');
        console.log('💡 Решение: Настройте webhook на ваш Render URL');
      } else if (info.pending_update_count > 0) {
        console.log(`\n⚠️  ПРОБЛЕМА: ${info.pending_update_count} ожидающих обновлений`);
        console.log('💡 Это может означать, что сервер не отвечает на webhook\'и');
      } else if (info.last_error_message) {
        console.log('\n❌ ПРОБЛЕМА: Есть ошибки webhook\'а');
        console.log('💡 Проверьте доступность сервера и правильность URL');
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
checkRenderWebhook();