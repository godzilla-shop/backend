import { Router } from 'express';
import * as contactsController from '../controllers/contacts.controller';

const router = Router();

router.get('/', contactsController.getContacts);
router.post('/', contactsController.createContact);

router.patch('/:id', contactsController.updateContact);
router.delete('/:id', contactsController.deleteContact);

export default router;
