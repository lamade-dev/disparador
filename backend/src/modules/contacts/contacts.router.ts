import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate } from '../../middleware/auth';
import { uploadContacts, listContactLists, getContactList, deleteContactList } from './contacts.controller';

const upload = multer({
  dest: 'uploads/',
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv'].includes(ext)) cb(null, true);
    else cb(new Error('Apenas arquivos Excel e CSV são aceitos'));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.use(authenticate);
router.post('/upload', upload.single('file'), uploadContacts);
router.get('/', listContactLists);
router.get('/:id', getContactList);
router.delete('/:id', deleteContactList);

export default router;
