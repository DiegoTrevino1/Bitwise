const express = require('express');
const { overview } = require('../controllers/stats.controller');

const router = express.Router();

router.get('/overview', overview);

module.exports = router;
