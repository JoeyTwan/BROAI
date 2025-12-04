import pg from 'pg';
import { config } from './config.js';

const pool = new pg.Pool({
  connectionString: config.dbUrl,
  ssl: config.dbUrl?.includes('supabase') ? { rejectUnauthorized: false } : undefined
});

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();


