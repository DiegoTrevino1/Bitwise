const express = require('express');
const { list } = require('../controllers/games.controller');

const router = express.Router();

router.get('/', list);

module.exports = router;
