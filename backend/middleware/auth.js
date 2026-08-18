const crypto = require('crypto');
const { upsertUserByDevice } = require('../models/User');

function normalizeDeviceId(raw) {
  if (!raw) return '';
  const trimmed = String(raw).trim().slice(0, 128);
  if (!trimmed) return '';
  return trimmed;
}

function hashDeviceFallback(req) {
  const ua = String(req.headers['user-agent'] || 'no-ua');
  const lang = String(req.headers['accept-language'] || 'zh');
  const ip = String(
    req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      req.socket?.remoteAddress ||
      '0.0.0.0'
  ).split(',')[0].trim();
  return crypto.createHash('sha256').update(`${ua}|${lang}|${ip}`, 'utf8').digest('hex').slice(0, 40);
}

async function authenticate(req, res, next) {
  const raw = req.headers['x-device-id'];
  let deviceId = normalizeDeviceId(raw);
  if (!deviceId) deviceId = hashDeviceFallback(req);
  try {
    const user = upsertUserByDevice(deviceId);
    req.user = {
      id: user.id,
      device_id: user.device_id,
      nickname: user.nickname
    };
    next();
  } catch (err) {
    console.error('[authenticate]', err);
    res.status(500).json({ success: false, error: 'AUTH_FAILED', message: '身份识别失败' });
  }
}

module.exports = { authenticate, normalizeDeviceId, hashDeviceFallback };
