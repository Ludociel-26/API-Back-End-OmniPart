import express from 'express';
import userAuth from '../middleware/userAuth.js';
import requireRole from '../middleware/requireRole.js';
import {
  createlevelArea,
  getlevelArea,
  getlevelAreaById,
  updatelevelArea,
  deletelevelArea,
} from '../controllers/levelAreaController.js';

const router = express.Router();

// Definimos la constante del rol administrador (Igual que en usuarios)
const ADMIN_ROLE = 3;

// =======================================================================
// 🔒 RUTAS DE ÁREAS (PROTEGIDAS SOLO PARA ADMINISTRADORES)
// =======================================================================

// Crear un nivel de área
router.post('/', userAuth, requireRole([ADMIN_ROLE]), createlevelArea);

// Obtener todas las áreas (Para llenar la tabla)
router.get('/', userAuth, requireRole([ADMIN_ROLE]), getlevelArea);

// Obtener un área específica por ID
router.get('/:id', userAuth, requireRole([ADMIN_ROLE]), getlevelAreaById);

// Actualizar un área (Edición inline)
router.put('/:id', userAuth, requireRole([ADMIN_ROLE]), updatelevelArea);

// Eliminar un área
router.delete('/:id', userAuth, requireRole([ADMIN_ROLE]), deletelevelArea);

export default router;
