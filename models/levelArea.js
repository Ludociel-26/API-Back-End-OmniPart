import { DataTypes } from 'sequelize';
import { sequelize } from '../config/postgresdb.js';

const LevelArea = sequelize.define(
  'levelArea',
  {
    area_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    level: {
      type: DataTypes.STRING,
      allowNull: false,
      // 🚩 QUITAMOS unique: true de aquí
    },
    descripcion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: '#fcfcfc',
      validate: {
        is: /^#([0-9A-F]{3}){1,2}$/i,
      },
    },
  },
  {
    // 🛡️ 1. Activamos el Soft Delete
    paranoid: true,

    // 🛡️ 2. Índice Parcial
    indexes: [
      {
        unique: true,
        fields: ['level'],
        where: {
          deletedAt: null, // Permite crear un área "Ventas" si la anterior "Ventas" fue borrada lógicamente
        },
      },
    ],
  },
);

export default LevelArea;
