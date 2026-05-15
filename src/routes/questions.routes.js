const express = require('express');
const { list } = require('../controllers/questions.controller');

const router = express.Router();

router.get('/:gameId/:type', list);

module.exports = router;
