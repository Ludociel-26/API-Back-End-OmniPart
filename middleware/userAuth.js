import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

const userAuth = async (req, res, next) => {
  // 🚩 1. Extraemos el token desde los Headers (El estándar Bearer)
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // (Fallback temporal) Por si quedó alguna cookie de la versión anterior
  if (!token && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
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
        // 🚩 Si la cuenta está desactivada, DESTRUIMOS el refresh_token
        // para que no pueda pedir más tokens nunca más.
        const killOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          maxAge: 0,
          expires: new Date(0),
        };
        res.clearCookie('refresh_token', killOptions);
        res.clearCookie('token', killOptions); // Limpieza de la cookie vieja

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
      return res.status(401).json({
        success: false,
        message: 'Autorización denegada. Token inválido.',
      });
    }
  } catch (error) {
    // 🚩 Detección estricta de caducidad
    if (error.name === 'TokenExpiredError') {
      // ⚠️ ATENCIÓN: Aquí YA NO borramos la cookie.
      // Devolvemos 401 para que el Frontend active la ruta /refresh-token
      // y renueve la sesión de forma invisible para el usuario.
      return res.status(401).json({
        success: false,
        message: 'Tu sesión ha caducado por seguridad.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'El token de seguridad ha sido manipulado o es inválido.',
    });
  }
};

export default userAuth;
