/**
 * Скрипт для анализа дублирующихся topicId в таблице client_topics
 * Проверяет потенциальные конфликты маршрутизации сообщений от Telegram
 */

import { sb } from '../src/config/env.js';

async function analyzeDuplicateTopics() {
  if (!sb) {
    console.log('❌ Supabase не подключен');
    return;
  }

  try {
    console.log('🔍 Анализ дублирующихся topicId в client_topics...');
    
    const { data, error } = await sb
      .from('client_topics')
      .select('topic_id, client_id, visitor_id, created_at, page_url')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Ошибка запроса:', error);
      return;
    }

    // Группируем записи по topicId
    const topicGroups = {};
    data.forEach(row => {
      if (!topicGroups[row.topic_id]) {
        topicGroups[row.topic_id] = [];
      }
      topicGroups[row.topic_id].push(row);
    });

    // Находим дублирующиеся topicId
    const duplicates = Object.entries(topicGroups)
      .filter(([topicId, rows]) => rows.length > 1);

    console.log('\n=== РЕЗУЛЬТАТЫ АНАЛИЗА ===');
    console.log(`📊 Всего записей: ${data.length}`);
    console.log(`🔢 Уникальных topicId: ${Object.keys(topicGroups).length}`);
    console.log(`⚠️  Дублирующихся topicId: ${duplicates.length}`);

    if (duplicates.length > 0) {
      console.log('\n🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: Найдены дублирующиеся topicId!');
      console.log('Это может привести к неправильной маршрутизации сообщений от Telegram\n');
      
      duplicates.forEach(([topicId, rows]) => {
        console.log(`📍 TopicId: ${topicId} (${rows.length} записей)`);
        rows.forEach((row, index) => {
          console.log(`   ${index + 1}. ClientId: ${row.client_id}`);
          console.log(`      VisitorId: ${row.visitor_id || 'null'}`);
          console.log(`      Created: ${row.created_at}`);
          console.log(`      URL: ${row.page_url || 'null'}`);
          console.log('');
        });
      });

      console.log('\n💡 РЕКОМЕНДАЦИИ:');
      console.log('1. Создать уникальное ограничение на topic_id');
      console.log('2. Очистить дублирующиеся записи (оставить самые новые)');
      console.log('3. Улучшить логику webhook для обработки конфликтов');
    } else {
      console.log('\n✅ Дублирующихся topicId не найдено');
      console.log('Маршрутизация сообщений должна работать корректно');
    }

    // Дополнительная статистика
    console.log('\n=== ДОПОЛНИТЕЛЬНАЯ СТАТИСТИКА ===');
    const clientCounts = {};
    data.forEach(row => {
      clientCounts[row.client_id] = (clientCounts[row.client_id] || 0) + 1;
    });
    
    console.log(`👥 Уникальных клиентов: ${Object.keys(clientCounts).length}`);
    console.log('📈 Топ клиентов по количеству топиков:');
    Object.entries(clientCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([clientId, count]) => {
        console.log(`   ${clientId}: ${count} топиков`);
      });

  } catch (error) {
    console.error('❌ Ошибка анализа:', error);
  }
}

analyzeDuplicateTopics();