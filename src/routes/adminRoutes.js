const express = require('express');
const ctrl = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate, authorize('admin')); // RBAC: admins only
router.param('id', validateObjectId);

router.get('/users', ctrl.listUsers);
router.delete('/users/:id', ctrl.deleteUser);
router.get('/notes', ctrl.listAllNotes);
router.get('/stats', ctrl.eventStats);

module.exports = router;
