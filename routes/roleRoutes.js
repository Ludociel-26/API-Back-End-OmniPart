import express from 'express';
import userAuth from '../middleware/userAuth.js';
import requireRole from '../middleware/requireRole.js';
import {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
} from '../controllers/roleController.js';

const router = express.Router();

const ADMIN_ROLE = 3; // Definimos la constante del rol administrador

// =======================================================================
// 🔒 RUTAS DE ROLES (PROTEGIDAS SOLO PARA ADMINISTRADORES)
// =======================================================================

router.post('/', userAuth, requireRole([ADMIN_ROLE]), createRole);
router.get('/', userAuth, requireRole([ADMIN_ROLE]), getRoles);
router.get('/:id', userAuth, requireRole([ADMIN_ROLE]), getRoleById);
router.put('/:id', userAuth, requireRole([ADMIN_ROLE]), updateRole);
router.delete('/:id', userAuth, requireRole([ADMIN_ROLE]), deleteRole);

export default router;
