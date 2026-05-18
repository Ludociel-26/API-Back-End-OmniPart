import crypto from 'crypto';
import { User, Role, LevelArea } from '../models/index.js';
import transporter from '../config/nodemailer.js';

// =======================================================================
// 1. OBTENER DATOS DEL USUARIO LOGUEADO
// =======================================================================
export const getUserData = async (req, res) => {
  try {
    const userId = req.userID;

    if (!userId) {
      return res
        .status(400)
        .json({
          success: false,
          message: 'ID de usuario no encontrado en la sesión.',
        });
    }

    const user = await User.findOne({
      where: { id: Number(userId) },
      include: [
        { model: Role, as: 'roleDetail', attributes: ['name'] },
        { model: LevelArea, as: 'areaDetail', attributes: ['level'] },
      ],
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'Usuario no encontrado.' });
    }

    return res.status(200).json({
      success: true,
      userData: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        isAccountVerified: user.is_account_verified,
        role: user.rol_id,
        roleName: user.roleDetail ? user.roleDetail.name : 'Sin Rol',
        area: user.area_id,
        areaName: user.areaDetail ? user.areaDetail.level : 'Sin Área',
      },
    });
  } catch (error) {
    console.error(`[ERROR GET USER DATA]: ${error.message}`);
    return res
      .status(500)
      .json({
        success: false,
        message: 'Error interno del servidor al obtener datos del usuario.',
      });
  }
};

// =======================================================================
// 2. OBTENER TODOS LOS USUARIOS (Directorio)
// =======================================================================
export const getAllUsers = async (req, res) => {
  try {
    const rawUsers = await User.findAll({
      attributes: [
        'id',
        'email',
        'rol_id',
        'area_id',
        'name',
        'surname',
        'country',
        'birth_date',
        'is_account_verified',
        'is_active',
      ],
      include: [
        { model: Role, as: 'roleDetail', attributes: ['name'] },
        { model: LevelArea, as: 'areaDetail', attributes: ['level'] },
      ],
      order: [['id', 'ASC']],
    });

    const users = rawUsers.map((user) => ({
      id: user.id,
      email: user.email,
      rol_id: user.rol_id,
      role_name: user.roleDetail ? user.roleDetail.name : null,
      area_id: user.area_id,
      area_level: user.areaDetail ? user.areaDetail.level : null,
      name: user.name,
      surname: user.surname,
      country: user.country,
      birth_date: user.birth_date,
      is_account_verified: user.is_account_verified,
      is_active: user.is_active,
    }));

    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error(`[ERROR GET ALL USERS]: ${error.message}`);
    return res
      .status(500)
      .json({ success: false, message: 'Error al procesar el directorio.' });
  }
};

// =======================================================================
// 3. OBTENER USUARIO POR ID
// =======================================================================
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      where: { id: Number(id) },
      attributes: { exclude: ['password'] },
      include: [
        { model: Role, as: 'roleDetail', attributes: ['name'] },
        { model: LevelArea, as: 'areaDetail', attributes: ['level'] },
      ],
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'Usuario no encontrado.' });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error(`[ERROR GET USER BY ID]: ${error.message}`);
    return res
      .status(500)
      .json({ success: false, message: 'Error interno del servidor.' });
  }
};

// =======================================================================
// 4. ACTUALIZAR USUARIO
// =======================================================================
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      surname,
      email,
      rol_id,
      area_id,
      is_active,
      is_account_verified,
      country,
      birth_date,
    } = req.body;

    const user = await User.findByPk(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'Usuario no encontrado.' });

    await user.update({
      name: name !== undefined ? name.trim() : user.name,
      surname: surname !== undefined ? surname.trim() : user.surname,
      email: email !== undefined ? email.trim().toLowerCase() : user.email,
      country: country !== undefined ? country.trim() : user.country,
      birth_date: birth_date !== undefined ? birth_date : user.birth_date,
      rol_id: rol_id !== undefined ? rol_id : user.rol_id,
      area_id: area_id !== undefined ? area_id : user.area_id,
      is_active: is_active !== undefined ? is_active : user.is_active,
      is_account_verified:
        is_account_verified !== undefined
          ? is_account_verified
          : user.is_account_verified,
    });

    return res
      .status(200)
      .json({ success: true, message: 'Registro actualizado con éxito.' });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res
        .status(400)
        .json({
          success: false,
          message: 'El correo electrónico ya pertenece a otro usuario.',
        });
    }
    console.error(`[ERROR UPDATE USER]: ${error.message}`);
    return res
      .status(500)
      .json({ success: false, message: 'Error interno al actualizar.' });
  }
};

// =======================================================================
// 5. ELIMINAR USUARIO (SOFT DELETE)
// =======================================================================
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (Number(id) === req.userID) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            'Vulnerabilidad detectada: No puedes eliminar tu propia sesión activa.',
        });
    }

    const user = await User.findByPk(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'Usuario no encontrado.' });

    await user.destroy();

    return res
      .status(200)
      .json({
        success: true,
        message: 'Usuario eliminado lógicamente del sistema.',
      });
  } catch (error) {
    console.error(`[ERROR DELETE USER]: ${error.message}`);
    return res
      .status(500)
      .json({
        success: false,
        message: 'Error al intentar eliminar el usuario.',
      });
  }
};

// =======================================================================
// 6. CAMBIAR ESTADO DE ACCESO (Habilitar/Deshabilitar)
// =======================================================================
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (Number(id) === req.userID) {
      return res
        .status(400)
        .json({
          success: false,
          message: 'Acción denegada: No puedes deshabilitar tu propia cuenta.',
        });
    }

    const user = await User.findByPk(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'Usuario no encontrado.' });

    user.is_active = !user.is_active;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `El usuario ha sido ${user.is_active ? 'habilitado' : 'deshabilitado'}.`,
      is_active: user.is_active,
    });
  } catch (error) {
    console.error(`[ERROR TOGGLE STATUS]: ${error.message}`);
    return res
      .status(500)
      .json({
        success: false,
        message: 'Error interno al modificar el estado.',
      });
  }
};

// =======================================================================
// 7. CAMBIAR ESTADO DE VERIFICACIÓN MANUALMENTE
// =======================================================================
export const toggleUserVerification = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'Usuario no encontrado.' });

    user.is_account_verified = !user.is_account_verified;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `La cuenta ha sido marcada como ${user.is_account_verified ? 'verificada' : 'no verificada'} manualmente.`,
      is_account_verified: user.is_account_verified,
    });
  } catch (error) {
    console.error(`[ERROR TOGGLE VERIFICATION]: ${error.message}`);
    return res
      .status(500)
      .json({
        success: false,
        message: 'Error interno al modificar el estado de verificación.',
      });
  }
};

// =======================================================================
// 8. ENVIAR INSTRUCCIONES DE VERIFICACIÓN (Solo Admin)
// =======================================================================
export const adminSendVerificationEmail = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'Usuario no encontrado.' });

    if (user.is_account_verified) {
      return res
        .status(400)
        .json({
          success: false,
          message: 'La cuenta ya se encuentra verificada.',
        });
    }

    // Comprobación de integridad SMTP estricta antes de generar el token
    await transporter.verify();

    const otp = crypto.randomInt(100000, 999999).toString();
    user.verify_otp = otp;
    user.verify_otp_expire_at = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-account?email=${encodeURIComponent(user.email)}&token=${otp}`;

    const mailOptions = {
      from: `"Soporte QuickFind" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: '✔️ Verifica tu cuenta de QuickFind',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #0972d3;">Bienvenido a QuickFind, ${user.name}</h2>
          <p>Un administrador ha solicitado la validación de tu cuenta de inventario.</p>
          <p>Haz clic en el siguiente enlace seguro para activar tu acceso:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="display:inline-block; padding:12px 24px; background:#0972d3; color:#fff; text-decoration:none; border-radius:4px; font-weight: bold;">Verificar Mi Cuenta</a>
          </div>
          <p style="color: #666;"><small>Este enlace es único, personal y caducará en 24 horas.</small></p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res
      .status(200)
      .json({
        success: true,
        message: `Enlace de verificación enviado con éxito a ${user.email}.`,
      });
  } catch (error) {
    console.error(`[SMTP FATAL ERROR - VERIFY]: ${error.message}`);
    // Si llega aquí, significa que la contraseña de app, el host o el puerto SMTP fallaron.
    return res.status(500).json({
      success: false,
      message:
        'No se pudo contactar con el servidor de correos SMTP. Verifica tus variables de entorno (.env).',
    });
  }
};

// =======================================================================
// 9. ENVIAR INSTRUCCIONES DE RESTABLECIMIENTO (Solo Admin)
// =======================================================================
export const adminSendResetPassword = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'Usuario no encontrado.' });

    if (!user.is_account_verified) {
      return res.status(400).json({
        success: false,
        message:
          'Regla de Negocio: El usuario debe verificar su cuenta antes de poder restablecer la contraseña.',
      });
    }

    // Comprobación de integridad SMTP estricta antes de generar el token
    await transporter.verify();

    const otp = crypto.randomInt(100000, 999999).toString();
    user.reset_otp = otp;
    user.reset_otp_expire_at = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?email=${encodeURIComponent(user.email)}&token=${otp}`;

    const mailOptions = {
      from: `"Soporte QuickFind" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: '🔑 Restablecimiento de Credenciales',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #d13212;">Restablecimiento de Contraseña</h2>
          <p>Hola <strong>${user.name}</strong>,</p>
          <p>Un administrador ha habilitado el restablecimiento de tu contraseña en QuickFind.</p>
          <p>Haz clic en el botón de abajo para establecer una nueva contraseña de forma segura:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display:inline-block; padding:12px 24px; background:#d13212; color:#fff; text-decoration:none; border-radius:4px; font-weight: bold;">Restablecer Contraseña</a>
          </div>
          <p style="color: #d13212;"><small>Por seguridad, este enlace expirará en 15 minutos.</small></p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res
      .status(200)
      .json({
        success: true,
        message: `Instrucciones de restablecimiento enviadas con éxito a ${user.email}.`,
      });
  } catch (error) {
    console.error(`[SMTP FATAL ERROR - RESET]: ${error.message}`);
    return res.status(500).json({
      success: false,
      message:
        'No se pudo contactar con el servidor de correos SMTP. Verifica tus variables de entorno (.env).',
    });
  }
};
