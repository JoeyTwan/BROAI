const bcrypt = require('bcryptjs');
const { supabase } = require('../config/database');

const TABLE = 'users';

const sanitizeEmail = (email) => email.trim().toLowerCase();

async function createUser(email, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ email: sanitizeEmail(email), password_hash: passwordHash })
    .select('id, email')
    .single();
  if (error) throw error;
  return data;
}

async function findByEmail(email) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('email', sanitizeEmail(email))
    .single();
  if (error) return null;
  return data;
}

async function getById(id) {
  const { data, error } = await supabase.from(TABLE).select('id, email').eq('id', id).single();
  if (error) return null;
  return data;
}

module.exports = {
  createUser,
  findByEmail,
  getById
};


