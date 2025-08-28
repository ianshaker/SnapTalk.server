#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем переменные окружения
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Тестирует сценарий с множественными ботами и одинаковыми topic_id
 */
async function testMultipleBotsScenario() {
  console.log('🧪 Тестирование сценария с множественными ботами...');
  
  try {
    // Создаем тестовые данные для двух разных ботов с одинаковыми topic_id
    const testData = [
      {
        client_id: 'test-bot-1',
        topic_id: 123,
        chat_id: -1001111111111, // Бот 1
        fingerprint_data: JSON.stringify({ test: 'bot1' })
      },
      {
        client_id: 'test-bot-2', 
        topic_id: 123, // Тот же topic_id!
        chat_id: -1002222222222, // Бот 2
        fingerprint_data: JSON.stringify({ test: 'bot2' })
      },
      {
        client_id: 'test-bot-1-topic-456',
        topic_id: 456,
        chat_id: -1001111111111, // Бот 1, другой топик
        fingerprint_data: JSON.stringify({ test: 'bot1-topic456' })
      }
    ];
    
    console.log('📝 Вставка тестовых данных...');
    
    // Очищаем старые тестовые данные
    await supabase
      .from('client_topics')
      .delete()
      .like('client_id', 'test-bot-%');
    
    // Вставляем тестовые данные
    const { data: insertData, error: insertError } = await supabase
      .from('client_topics')
      .insert(testData);
    
    if (insertError) {
      console.error('❌ Ошибка вставки тестовых данных:', insertError);
      return;
    }
    
    console.log('✅ Тестовые данные вставлены');
    
    // Тест 1: Поиск по topic_id=123 и chat_id бота 1
    console.log('\n🔍 Тест 1: Поиск topic_id=123 для бота 1');
    const { data: test1, error: error1 } = await supabase
      .from('client_topics')
      .select('client_id, topic_id, chat_id')
      .eq('topic_id', 123)
      .eq('chat_id', -1001111111111);
    
    console.log('Результат:', test1);
    if (test1?.length === 1 && test1[0].client_id === 'test-bot-1') {
      console.log('✅ Тест 1 пройден: найден правильный клиент для бота 1');
    } else {
      console.log('❌ Тест 1 провален');
    }
    
    // Тест 2: Поиск по topic_id=123 и chat_id бота 2
    console.log('\n🔍 Тест 2: Поиск topic_id=123 для бота 2');
    const { data: test2, error: error2 } = await supabase
      .from('client_topics')
      .select('client_id, topic_id, chat_id')
      .eq('topic_id', 123)
      .eq('chat_id', -1002222222222);
    
    console.log('Результат:', test2);
    if (test2?.length === 1 && test2[0].client_id === 'test-bot-2') {
      console.log('✅ Тест 2 пройден: найден правильный клиент для бота 2');
    } else {
      console.log('❌ Тест 2 провален');
    }
    
    // Тест 3: Поиск только по topic_id=123 (должен вернуть оба)
    console.log('\n🔍 Тест 3: Поиск только по topic_id=123 (без chat_id)');
    const { data: test3, error: error3 } = await supabase
      .from('client_topics')
      .select('client_id, topic_id, chat_id')
      .eq('topic_id', 123);
    
    console.log('Результат:', test3);
    if (test3?.length === 2) {
      console.log('✅ Тест 3 пройден: найдены оба клиента с одинаковым topic_id');
    } else {
      console.log('❌ Тест 3 провален');
    }
    
    // Тест 4: Проверка уникального ограничения
    console.log('\n🔍 Тест 4: Попытка вставить дубликат (topic_id + chat_id)');
    const { data: test4, error: error4 } = await supabase
      .from('client_topics')
      .insert({
        client_id: 'test-duplicate',
        topic_id: 123,
        chat_id: -1001111111111, // Дубликат!
        fingerprint_data: JSON.stringify({ test: 'duplicate' })
      });
    
    if (error4) {
      console.log('✅ Тест 4 пройден: уникальное ограничение работает');
      console.log('Ошибка (ожидаемая):', error4.message);
    } else {
      console.log('❌ Тест 4 провален: уникальное ограничение не работает!');
    }
    
    // Тест 5: Симуляция webhook логики
    console.log('\n🔍 Тест 5: Симуляция webhook логики');
    await testWebhookLogic(123, -1001111111111, 'test-bot-1');
    await testWebhookLogic(123, -1002222222222, 'test-bot-2');
    await testWebhookLogic(456, -1001111111111, 'test-bot-1-topic-456');
    await testWebhookLogic(999, -1001111111111, null); // Несуществующий топик
    
    // Очистка тестовых данных
    console.log('\n🧹 Очистка тестовых данных...');
    await supabase
      .from('client_topics')
      .delete()
      .like('client_id', 'test-bot-%');
    
    console.log('✅ Тестирование завершено');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

/**
 * Симулирует логику поиска в webhook
 */
async function testWebhookLogic(topicId, chatId, expectedClientId) {
  console.log(`\n  🔍 Webhook симуляция: topicId=${topicId}, chatId=${chatId}`);
  
  // Основной поиск по (topic_id + chat_id)
  let { data: clientTopics, error } = await supabase
    .from('client_topics')
    .select('client_id, topic_id, chat_id')
    .eq('topic_id', topicId)
    .eq('chat_id', chatId)
    .maybeSingle();
  
  let clientId = clientTopics?.client_id;
  let foundVia = 'primary_search';
  
  // Fallback: поиск только по topic_id (для legacy записей)
  if (!clientId) {
    const fallbackResult = await supabase
      .from('client_topics')
      .select('client_id, topic_id, chat_id')
      .eq('topic_id', topicId)
      .is('chat_id', null)
      .maybeSingle();
    
    clientId = fallbackResult.data?.client_id;
    foundVia = 'fallback_search';
  }
  
  console.log(`    Результат: clientId=${clientId || 'null'}, foundVia=${foundVia}`);
  
  if (expectedClientId) {
    if (clientId === expectedClientId) {
      console.log(`    ✅ Успех: найден ожидаемый клиент`);
    } else {
      console.log(`    ❌ Ошибка: ожидался ${expectedClientId}, получен ${clientId}`);
    }
  } else {
    if (!clientId) {
      console.log(`    ✅ Успех: клиент не найден (как ожидалось)`);
    } else {
      console.log(`    ❌ Ошибка: ожидалось отсутствие клиента, но найден ${clientId}`);
    }
  }
}

// Запуск тестов если скрипт вызван напрямую
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  console.log('🚀 Запуск тестирования множественных ботов...');
  testMultipleBotsScenario()
    .then(() => {
      console.log('\n🎉 Все тесты завершены');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Критическая ошибка:', error);
      process.exit(1);
    });
} else {
  console.log('📦 Модуль загружен, но не выполнен');
}

export { testMultipleBotsScenario };