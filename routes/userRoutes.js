import express from 'express';
import userAuth from '../middleware/userAuth.js';
import requireRole from '../middleware/requireRole.js';
import {
  getUserData,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserStatus,
  toggleUserVerification,
  adminSendVerificationEmail,
  adminSendResetPassword,
} from '../controllers/userController.js';

const userRouter = express.Router();

// En la arquitectura IAM, el rol 3 corresponde al Administrador
const ADMIN_ROLE = 3;

// =======================================================================
// RUTAS PÚBLICAS / DE SESIÓN (Cualquier usuario autenticado)
// =======================================================================
userRouter.get('/data', userAuth, getUserData);

// =======================================================================
// 🔒 RUTAS DE ADMINISTRACIÓN (Protegidas estricatamente para Rol 3)
// =======================================================================
userRouter.get('/all-users', userAuth, requireRole([ADMIN_ROLE]), getAllUsers);

userRouter.get('/:id', userAuth, requireRole([ADMIN_ROLE]), getUserById);

userRouter.put(
  '/update-user/:id',
  userAuth,
  requireRole([ADMIN_ROLE]),
  updateUser,
);

userRouter.delete(
  '/delete-user/:id',
  userAuth,
  requireRole([ADMIN_ROLE]),
  deleteUser,
);

userRouter.put(
  '/toggle-status/:id',
  userAuth,
  requireRole([ADMIN_ROLE]),
  toggleUserStatus,
);

// Aquí está la ruta que estaba causando el Error 404
userRouter.put(
  '/toggle-verification/:id',
  userAuth,
  requireRole([ADMIN_ROLE]),
  toggleUserVerification,
);

userRouter.post(
  '/send-verification/:id',
  userAuth,
  requireRole([ADMIN_ROLE]),
  adminSendVerificationEmail,
);

userRouter.post(
  '/send-reset-instructions/:id',
  userAuth,
  requireRole([ADMIN_ROLE]),
  adminSendResetPassword,
);

export default userRouter;
