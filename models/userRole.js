import { DataTypes } from 'sequelize';
import { sequelize } from '../config/postgresdb.js';

const Role = sequelize.define(
  'Role',
  {
    rol_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      // 🚩 QUITAMOS el unique: true de aquí, lo pasamos a los índices abajo
    },
    descripcion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    // 🛡️ 1. Activamos el Soft Delete
    paranoid: true,

    // 🛡️ 2. Índice Parcial para evitar choques con registros borrados
    indexes: [
      {
        unique: true,
        fields: ['name'],
        where: {
          deletedAt: null, // Solo aplica la regla de "único" a los roles activos
        },
      },
    ],
  },
);

export default Role;
