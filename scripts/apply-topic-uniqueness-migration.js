#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES модуль совместимость
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Инициализация Supabase клиента
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE; // Используем service role для миграций
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Supabase URL:', supabaseUrl);
console.log('🔧 Service Role Key:', supabaseKey ? 'Loaded' : 'Missing');

async function applyTopicUniquenessMigration() {
  console.log('🔧 Применение миграции уникального ограничения на topic_id...');
  
  try {
    // Проверяем наличие дубликатов перед миграцией
    console.log('🔍 Проверка дубликатов topic_id...');
    await checkForDuplicates();
    
    // Показываем команды для ручного выполнения
    console.log('\n🔧 Для применения миграции выполните следующие команды в Supabase Dashboard → SQL Editor:\n');
    await showManualMigrationSteps();
    
  } catch (error) {
    console.error('❌ Ошибка при подготовке миграции:', error.message);
  }
}

async function checkForDuplicates() {
  const { data: allTopics, error } = await supabase
    .from('client_topics')
    .select('topic_id, client_id')
    .not('topic_id', 'is', null);
    
  if (error) throw error;
  
  const topicToClient = {};
  let duplicatesFound = false;
  
  allTopics.forEach(row => {
    if (topicToClient[row.topic_id]) {
      console.log(`⚠️  Дублирующийся topic_id: ${row.topic_id} (клиенты: ${topicToClient[row.topic_id]}, ${row.client_id})`);
      duplicatesFound = true;
    } else {
      topicToClient[row.topic_id] = row.client_id;
    }
  });
  
  if (duplicatesFound) {
    console.log('\n🔍 Найдены дублирующиеся topic_id. Сначала нужно их очистить.');
    await showDuplicateTopics();
    throw new Error('Найдены дублирующиеся topic_id');
  } else {
    console.log('✅ Дубликаты не найдены, можно продолжать миграцию');
  }
}

async function showManualMigrationSteps() {
  const SUPERGROUP_ID = process.env.SUPERGROUP_ID || '-1001234567890';
  
  console.log('-- Шаг 1: Добавить колонку chat_id');
  console.log('ALTER TABLE client_topics ADD COLUMN IF NOT EXISTS chat_id BIGINT;\n');
  
  console.log('-- Шаг 2: Обновить существующие записи');
  console.log(`UPDATE client_topics SET chat_id = ${SUPERGROUP_ID} WHERE chat_id IS NULL;\n`);
  
  console.log('-- Шаг 3: Создать составной уникальный индекс');
  console.log('CREATE UNIQUE INDEX IF NOT EXISTS idx_client_topics_unique_topic_chat');
  console.log('ON client_topics (topic_id, chat_id)');
  console.log('WHERE topic_id IS NOT NULL AND chat_id IS NOT NULL;\n');
  
  console.log('✅ После выполнения этих команд миграция будет завершена.');
}

async function verifyMigration() {
  console.log('\n🔍 Проверяем результат миграции...');
  
  try {
    // Проверяем, что нет дублирующихся topic_id
    const { data: allTopics, error } = await supabase
      .from('client_topics')
      .select('topic_id, client_id')
      .not('topic_id', 'is', null);
      
    if (error) throw error;
    
    const topicToClient = {};
    let duplicatesFound = false;
    
    allTopics.forEach(row => {
      if (topicToClient[row.topic_id]) {
        console.log(`⚠️  Дублирующийся topic_id: ${row.topic_id} (клиенты: ${topicToClient[row.topic_id]}, ${row.client_id})`);
        duplicatesFound = true;
      } else {
        topicToClient[row.topic_id] = row.client_id;
      }
    });
    
    if (!duplicatesFound) {
      console.log('✅ Уникальность topic_id подтверждена');
      console.log(`📊 Всего уникальных topic_id: ${Object.keys(topicToClient).length}`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке:', error.message);
  }
}

async function showDuplicateTopics() {
  console.log('\n🔍 Анализ дублирующихся topic_id:');
  
  const { data: allTopics, error } = await supabase
    .from('client_topics')
    .select('*')
    .not('topic_id', 'is', null)
    .order('topic_id');
    
  if (error) {
    console.error('Ошибка при получении данных:', error.message);
    return;
  }
  
  const topicGroups = {};
  allTopics.forEach(row => {
    if (!topicGroups[row.topic_id]) {
      topicGroups[row.topic_id] = [];
    }
    topicGroups[row.topic_id].push(row);
  });
  
  Object.entries(topicGroups).forEach(([topicId, records]) => {
    if (records.length > 1) {
      console.log(`\n📍 Topic ID: ${topicId} (${records.length} записей):`);
      records.forEach((record, index) => {
        console.log(`   ${index + 1}. Client: ${record.client_id}, Created: ${record.created_at}`);
      });
    }
  });
}

// Запуск скрипта, если он вызван напрямую (ES модуль версия)
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  console.log('🚀 Запуск миграции...');
  applyTopicUniquenessMigration().catch(console.error);
} else {
  console.log('📄 Скрипт загружен как модуль');
}

export { applyTopicUniquenessMigration };