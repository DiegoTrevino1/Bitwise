const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { submit, getResults } = require('../controllers/assessment.controller');

router.post('/',   requireAuth, submit);
router.get('/me',  requireAuth, getResults);

module.exports = router;
