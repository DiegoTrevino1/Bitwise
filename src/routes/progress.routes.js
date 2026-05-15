const express = require('express');
const { record, summary, recent } = require('../controllers/progress.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/',       requireAuth, record);
router.get('/me',      requireAuth, summary);
router.get('/recent',  recent);

module.exports = router;
