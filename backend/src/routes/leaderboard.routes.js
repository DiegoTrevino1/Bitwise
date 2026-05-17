const express = require('express');
const { top } = require('../controllers/leaderboard.controller');

const router = express.Router();

router.get('/', top);

module.exports = router;
