import { DataTypes } from 'sequelize';
import { sequelize } from '../config/postgresdb.js';

const User = sequelize.define(
  'User',
  {
    // ==========================================
    // 1. DEFINICIÓN DE COLUMNAS (ATRIBUTOS)
    // ==========================================
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      // 🚩 QUITAMOS unique: true de aquí para pasarlo al índice parcial
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rol_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    area_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 9,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    surname: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    birth_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    is_account_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Interruptor general para "bannear" o desactivar usuarios',
    },
    auth_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    verify_otp: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    verify_otp_expire_at: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    reset_otp: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    reset_otp_expire_at: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
  },
  {
    // ==========================================
    // 2. OPCIONES Y CONFIGURACIÓN DEL MODELO
    // ==========================================

    // 🛡️ Activamos el Soft Delete (agrega la columna deletedAt automáticamente)
    paranoid: true,

    // 🛡️ Índice Parcial para el Email
    indexes: [
      {
        unique: true,
        fields: ['email'],
        where: {
          deletedAt: null, // El email solo debe ser único entre los usuarios NO eliminados
        },
      },
    ],
  },
);

// ⚠️ CERO RELACIONES AQUÍ. Mantén este archivo limpio.

export default User;

/*
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {type: String, required: true}, // Nombre
    surname: { type: String, required: true }, // Apellido
    country: { type: String, required: true }, // País o región
    birthDate: { type: Date, required: true }, // Fecha de nacimiento
    email: { type: String, required: true, unique: true}, // Correo
    password: { type: String, required: true}, // Contraseña
    phoneLada: { 
        type: String,  
        required: true, 
        match: [/^\+(\d{1,4})$/, 'La lada debe tener entre 1 y 4 dígitos (por ejemplo, +52, +1)'] 
    }, // Validación para lada de 1 a 4 dígitos
    phoneNumber: { 
        type: String, 
        required: true, 
        match: [/^\d{10}$/, 'El número de teléfono debe contener 10 dígitos'] 
    }, // Teléfono móvil, con validación para 10 dígitos
    roles: { 
        type: [String], 
        enum: ['user', 'admin', 'moderator'], 
        default: ['user'] 
    },
    verifyOtp: {type: String, default: ''},
    verifyOtpExpireAt: {type: Number, default: 0},
    isAccountVerified: {type: Boolean, default: false},
    resetOtp: {type: String, default: ''},
    resetOtpExpireAt: {type: Number, default: 0},
})

const userModel = mongoose.models.user || mongoose.model('users', userSchema);

export default userModel;
*/
