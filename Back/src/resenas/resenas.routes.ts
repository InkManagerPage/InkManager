import { Router } from 'express';
import { listarResenas } from './resenas.controller.js';

export const resenasRouter = Router();

resenasRouter.get('/', listarResenas);
