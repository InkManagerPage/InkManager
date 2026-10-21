import { Router } from 'express';
import { uploadImage } from './imagenes.controller.js';
import { upload } from '../middlewares/multer.js';

export const imagenRouter = Router();

imagenRouter.post('/', upload.single('imagen'), uploadImage);
