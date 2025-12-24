const bcrypt = require('bcryptjs');
const { supabase } = require('../config/database');

// 临时使用内存数据库（用于本地开发测试，当Supabase不可用时自动切换）
const MEMORY_USERS = [];
let nextId = 1;

const TABLE = 'users';

const sanitizeEmail = (email) => email.trim().toLowerCase();

async function createUser(email, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  
  try {
    // 优先使用Supabase实现
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ email: sanitizeEmail(email), password_hash: passwordHash })
      .select('id, email')
      .single();
    
    if (error) throw error;
    console.log('[Supabase] 用户已创建:', data.email);
    return data;
  } catch (error) {
    console.warn('[Supabase] 创建用户失败，切换到内存数据库:', error.message);
    
    // 回退到内存数据库
    const newUser = {
      id: nextId++,
      email: sanitizeEmail(email),
      password_hash: passwordHash,
      created_at: new Date().toISOString()
    };
    
    MEMORY_USERS.push(newUser);
    console.log('[内存数据库] 用户已创建:', newUser.email);
    return { id: newUser.id, email: newUser.email };
  }
}

async function findByEmail(email) {
  try {
    // 优先使用Supabase实现
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('email', sanitizeEmail(email))
      .single();
    
    if (error) throw error;
    console.log('[Supabase] 查找用户:', sanitizeEmail(email), '结果:', !!data);
    return data;
  } catch (error) {
    console.warn('[Supabase] 查找用户失败，切换到内存数据库:', error.message);
    
    // 回退到内存数据库
    const user = MEMORY_USERS.find(user => user.email === sanitizeEmail(email));
    console.log('[内存数据库] 查找用户:', sanitizeEmail(email), '结果:', !!user);
    return user || null;
  }
}

async function getById(id) {
  try {
    // 优先使用Supabase实现
    const { data, error } = await supabase.from(TABLE).select('id, email').eq('id', id).single();
    
    if (error) throw error;
    console.log('[Supabase] 根据ID查找用户:', id, '结果:', !!data);
    return data;
  } catch (error) {
    console.warn('[Supabase] 根据ID查找用户失败，切换到内存数据库:', error.message);
    
    // 回退到内存数据库
    const user = MEMORY_USERS.find(user => user.id === id);
    console.log('[内存数据库] 根据ID查找用户:', id, '结果:', !!user);
    return user ? { id: user.id, email: user.email } : null;
  }
}

module.exports = {
  createUser,
  findByEmail,
  getById
};