import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

const userAuth = async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return res
      .status(401)
      .json({
        success: false,
        message: 'Sesión no encontrada. Por favor, ingresa nuevamente.',
      });
  }

  try {
    const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);

    if (tokenDecode.id) {
      // 🛡️ VERIFICACIÓN A LA BASE DE DATOS
      const user = await User.findByPk(tokenDecode.id);

      // Si el usuario no existe o fue deshabilitado (is_active: false)
      if (!user || !user.is_active) {
        res.clearCookie('token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        });

        // 🚩 MENSAJE ELABORADO PARA EL USUARIO (UX)
        return res.status(403).json({
          success: false,
          message:
            'Tu acceso ha sido suspendido temporalmente. Por favor, contacta al administrador del sistema para revisar el estado de tu cuenta.',
        });
      }

      // Si todo está bien, lo dejamos pasar
      req.userID = Number(tokenDecode.id);
      req.userRole = tokenDecode.role;
      next();
    } else {
      return res
        .status(401)
        .json({
          success: false,
          message: 'Autorización denegada. Token inválido.',
        });
    }
  } catch (error) {
    // 🚩 Detección estricta de caducidad
    if (error.name === 'TokenExpiredError') {
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      });
      return res
        .status(401)
        .json({
          success: false,
          message: 'Tu sesión ha caducado por seguridad.',
        });
    }

    return res
      .status(401)
      .json({
        success: false,
        message: 'El token de seguridad ha sido manipulado o es inválido.',
      });
  }
};

export default userAuth;
