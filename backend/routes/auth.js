const express = require('express');
const { authenticate } = require('../middleware/auth');
const { setNickname, getById } = require('../models/User');

const router = express.Router();

router.get('/me', authenticate, (req, res) => {
  const u = getById(req.user.id) || req.user;
  res.json({
    success: true,
    user: {
      id: u.id,
      device_id: u.device_id || req.user.device_id,
      nickname: u.nickname || '兄弟'
    }
  });
});

router.post('/me/nickname', authenticate, async (req, res) => {
  const { nickname } = req.body || {};
  const u = setNickname(req.user.id, nickname);
  res.json({ success: true, user: u });
});

router.post('/nickname', authenticate, async (req, res) => {
  const { nickname } = req.body || {};
  const u = setNickname(req.user.id, nickname);
  res.json({ success: true, user: u });
});

module.exports = router;
