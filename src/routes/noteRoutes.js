const express = require('express');
const ctrl = require('../controllers/noteController');
const { authenticate } = require('../middleware/auth');
const { validateNote, validateObjectId } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate); // every notes route is protected
router.param('id', validateObjectId);

router.route('/')
  .get(ctrl.getNotes)
  .post(validateNote(true), ctrl.createNote);

router.route('/:id')
  .get(ctrl.getNote)
  .put(validateNote(false), ctrl.updateNote)
  .delete(ctrl.deleteNote);

module.exports = router;
