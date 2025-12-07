import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getMyTrustedContacts,
  addTrustedContact,
  updateTrustedContact,
  deleteTrustedContact,
  getPrimaryTrustedContact,
} from '../controllers/trustedContactsController';

const router = express.Router();

router.get('/', authenticate, getMyTrustedContacts);
router.get('/primary', authenticate, getPrimaryTrustedContact);
router.post('/', authenticate, addTrustedContact);
router.put('/:id', authenticate, updateTrustedContact);
router.delete('/:id', authenticate, deleteTrustedContact);

export default router;

