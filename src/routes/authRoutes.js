const express = require('express');
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validateSignup, validateLogin } = require('../middleware/validate');

const router = express.Router();

router.post('/signup', validateSignup, ctrl.signup);
router.post('/login', validateLogin, ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', authenticate, ctrl.me);

module.exports = router;
