import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import transporter from '../config/nodemailer.js';
import {
  EMAIL_WELCOME_TEMPLATE,
  EMAIL_VERIFY_TEMPLATE,
  PASSWORD_RESET_TEMPLATE,
} from '../config/emailTemplates.js';

// 🚩 Opciones globales y dinámicas de seguridad para Cookies
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 12 * 60 * 60 * 1000, // 12 horas
  path: '/', // 🚩 CRÍTICO: Obliga al navegador a aplicar los cambios en todo el dominio
});

// =======================================================================
// 1. REGISTRO PÚBLICO
// =======================================================================
export const register = async (req, res) => {
  const {
    email,
    password,
    name,
    surname,
    country,
    birth_date,
    rol_id,
    area_id,
  } = req.body;

  if (!email || !password || !name || !surname || !country || !birth_date) {
    return res.json({ success: false, message: 'Missing Details' });
  }

  const reqRol = rol_id ? Number(rol_id) : 1;
  const reqArea = area_id ? Number(area_id) : 9;

  if (reqRol !== 1 || reqArea !== 9) {
    return res.status(403).json({
      success: false,
      message:
        'Acceso Denegado: No tienes permitido asignar roles o áreas personalizadas.',
    });
  }

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.json({ success: false, message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      rol_id: 1,
      area_id: 9,
      name,
      surname,
      country,
      birth_date,
      is_active: true,
    });

    // 🚩 Patrón Dual: Access Token (Corto)
    const accessToken = jwt.sign(
      { id: user.id, role: user.rol_id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' },
    );

    // 🚩 Patrón Dual: Refresh Token (Largo)
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '12h',
    });

    user.auth_token = refreshToken;
    await user.save();

    // Inyección segura del Refresh Token en cookie
    res.cookie('refresh_token', refreshToken, getCookieOptions());

    try {
      const mailOptions = {
        from: `"👁️‍🗨️QuickFind" <${process.env.SENDER_EMAIL}>`,
        to: email,
        subject: '✨ Te damos la bienvenida a QuickFind',
        html: EMAIL_WELCOME_TEMPLATE.replace('{{name}}', user.name).replace(
          '{{email}}',
          user.email,
        ),
      };
      await transporter.sendMail(mailOptions);
    } catch (mailErr) {
      console.warn('Correo de bienvenida omitido:', mailErr.message);
    }

    return res.json({
      success: true,
      message: 'Registrado exitosamente',
      token: accessToken,
    });
  } catch (error) {
    if (
      error.name === 'SequelizeValidationError' ||
      error.name === 'SequelizeUniqueConstraintError'
    ) {
      const mensajes = error.errors.map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: `Error de Validación: ${mensajes.join(', ')}`,
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =======================================================================
// 2. INICIO DE SESIÓN
// =======================================================================
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({
      success: false,
      message: 'Email and password are required',
    });
  }
  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.json({ success: false, message: 'Invalid email' });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'ACCOUNT_DISABLED_FORCE_LOGOUT',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: 'Invalid password' });
    }

    // 🚩 Patrón Dual: Access Token (Corto - 15m)
    const accessToken = jwt.sign(
      { id: user.id, role: user.rol_id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' },
    );

    // 🚩 Patrón Dual: Refresh Token (Largo - 12h)
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '12h',
    });

    // Inyección segura del Refresh Token en cookie
    res.cookie('refresh_token', refreshToken, getCookieOptions());

    // Devolvemos el Access Token en el JSON
    return res.json({ success: true, token: accessToken });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: 'Internal Server Error' });
  }
};

// =======================================================================
// 2.5 RENOVACIÓN DE TOKEN (NUEVO ENDPOINT)
// =======================================================================
export const refreshToken = async (req, res) => {
  try {
    const rfToken = req.cookies.refresh_token;

    if (!rfToken) {
      return res
        .status(401)
        .json({ success: false, message: 'No refresh token provided' });
    }

    const decoded = jwt.verify(rfToken, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      return res.status(403).json({ success: false, message: 'User invalid' });
    }

    const newAccessToken = jwt.sign(
      { id: user.id, role: user.rol_id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' },
    );

    return res.json({ success: true, accessToken: newAccessToken });
  } catch (error) {
    return res
      .status(403)
      .json({ success: false, message: 'Refresh token expired' });
  }
};

// =======================================================================
// 3. CERRAR SESIÓN
// =======================================================================
export const logout = async (req, res) => {
  try {
    const killOptions = {
      ...getCookieOptions(),
      maxAge: 0,
      expires: new Date(0),
    };

    // 🚩 Destruimos ambas cookies para que no quede ningún rastro fantasma
    res.cookie('refresh_token', '', killOptions);
    res.cookie('token', '', killOptions);

    return res.json({ success: true, message: 'Logged Out' });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// =======================================================================
// 4. VERIFICACIÓN DE EMAIL (OTP)
// =======================================================================
export const sendVerifyOtp = async (req, res) => {
  try {
    const finalUserId = req.body?.userId || req.userID;

    if (!finalUserId) {
      return res
        .status(400)
        .json({ success: false, message: 'User ID is required' });
    }

    const user = await User.findByPk(finalUserId);
    if (!user) return res.json({ success: false, message: 'User not found' });
    if (user.is_account_verified)
      return res.json({ success: false, message: 'Account Already verified' });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.verify_otp = otp;
    user.verify_otp_expire_at = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    const mailOption = {
      from: `"👁️‍🗨️QuickFind" <${process.env.SENDER_EMAIL}>`,
      to: user.email,
      subject: '🔐 Verifica tu cuenta',
      html: EMAIL_VERIFY_TEMPLATE.replace('{{name}}', user.name).replace(
        '{{otp}}',
        otp,
      ),
    };
    await transporter.sendMail(mailOption);
    res.json({ success: true, message: 'Verification OTP Sent on Email' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  const { otp } = req.body;
  if (!otp)
    return res.status(400).json({ success: false, message: 'OTP is required' });

  try {
    const user = await User.findByPk(req.userID);
    if (!user) return res.json({ success: false, message: 'User not found' });
    if (user.verify_otp === '' || user.verify_otp !== otp)
      return res.json({ success: false, message: 'Invalid OTP' });
    if (user.verify_otp_expire_at < Date.now())
      return res.json({ success: false, message: 'OTP Expired' });

    user.is_account_verified = true;
    user.verify_otp = '';
    user.verify_otp_expire_at = 0;
    await user.save();
    return res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const isAuthenticated = async (req, res) => {
  return res.json({ success: true });
};

// =======================================================================
// 5. RECUPERACIÓN DE CONTRASEÑA (Protegido)
// =======================================================================
export const sendResetOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ success: false, message: 'Email is required' });

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.json({ success: false, message: 'User not found' });

    if (!user.is_account_verified) {
      return res.json({
        success: false,
        message:
          'Cuenta no verificada. Por favor contacta al administrador para restablecer tu contraseña.',
      });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.reset_otp = otp;
    user.reset_otp_expire_at = Date.now() + 15 * 60 * 1000;
    await user.save();

    const mailOption = {
      from: `"👁️‍🗨️QuickFind" <${process.env.SENDER_EMAIL}>`,
      to: user.email,
      subject: 'Restablecer contraseña',
      html: PASSWORD_RESET_TEMPLATE.replace('{{name}}', user.name).replace(
        '{{otp}}',
        otp,
      ),
    };
    await transporter.sendMail(mailOption);
    return res.json({ success: true, message: 'OTP sent to your email' });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.json({
      success: false,
      message: 'Email, OTP, and new password are required',
    });
  }
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.json({ success: false, message: 'User not found' });

    if (!user.is_account_verified) {
      return res.json({
        success: false,
        message: 'Cuenta no verificada. Acción denegada.',
      });
    }

    if (user.reset_otp === '' || user.reset_otp !== otp)
      return res.json({ success: false, message: 'Invalid OTP' });
    if (user.reset_otp_expire_at < Date.now())
      return res.json({ success: false, message: 'OTP Expired' });

    user.password = await bcrypt.hash(newPassword, 10);
    user.reset_otp = '';
    user.reset_otp_expire_at = 0;
    await user.save();
    return res.json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};
