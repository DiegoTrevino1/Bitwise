const express = require('express');
const { register, login, me } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res, next) => register(req, res).catch(next));
router.post('/login',    (req, res, next) => login(req, res).catch(next));
router.get('/me', requireAuth, me);

module.exports = router;
