import { LevelArea } from '../models/index.js';

// =========================================================
// CREAR ÁREA (POST)
// =========================================================
export const createlevelArea = async (req, res) => {
  try {
    // 🛡️ Seguridad: Prevención de Mass Assignment
    const { level, descripcion, color } = req.body;

    if (!level || level.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El nombre del área es obligatorio.',
      });
    }

    // Normalizamos el string para evitar engaños (ej. " Ventas " -> "ventas")
    const normalizedLevel = level.trim().toLowerCase();

    const newArea = await LevelArea.create({
      level: normalizedLevel,
      descripcion: descripcion ? descripcion.trim() : null,
      color: color || '#fcfcfc',
    });

    res.status(201).json({ success: true, area: newArea });
  } catch (error) {
    // 🛡️ Log profundo para el desarrollador en la consola de Node
    console.error(
      '❌ [ERROR POST AREA] Detalles de DB:',
      error.errors ? JSON.stringify(error.errors, null, 2) : error.message,
    );

    // 🛡️ Manejo Inteligente de Restricciones
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0]?.path;

      // 1. Conflicto de Llave Primaria (La secuencia de PostgreSQL se corrompió)
      if (field === 'area_id' || field === 'PRIMARY') {
        return res.status(400).json({
          success: false,
          message:
            'Error de Base de Datos: La secuencia de IDs auto-incrementales está desincronizada.',
        });
      }

      // 2. Conflicto real de nombre de área
      return res.status(400).json({
        success: false,
        message: `El área '${req.body.level}' ya se encuentra registrada en el sistema.`,
      });
    }

    // 🛡️ Si falla la validación del Regex del Color u otra validación de modelo
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: `Error de formato: ${error.errors[0]?.message}`,
      });
    }

    res
      .status(500)
      .json({
        success: false,
        message: 'Error interno del servidor al crear el área.',
      });
  }
};

// =========================================================
// OBTENER TODAS (GET)
// =========================================================
export const getlevelArea = async (req, res) => {
  try {
    const leveles = await LevelArea.findAll({
      order: [['area_id', 'ASC']], // Crucial para mantener el orden en el Front-End
    });
    res.status(200).json({ success: true, areas: leveles });
  } catch (error) {
    console.error(`[ERROR GET AREAS]: ${error.message}`);
    res
      .status(500)
      .json({
        success: false,
        message: 'Error al obtener las áreas operativas.',
      });
  }
};

// =========================================================
// OBTENER POR ID (GET)
// =========================================================
export const getlevelAreaById = async (req, res) => {
  try {
    const level = await LevelArea.findByPk(req.params.id);
    if (!level) {
      return res
        .status(404)
        .json({ success: false, message: 'Área no encontrada' });
    }
    res.status(200).json({ success: true, area: level });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================
// ACTUALIZAR ÁREA (PUT)
// =========================================================
export const updatelevelArea = async (req, res) => {
  try {
    const { id } = req.params;
    const { level, descripcion, color } = req.body;

    const area = await LevelArea.findByPk(id);
    if (!area) {
      return res
        .status(404)
        .json({ success: false, message: 'Área no encontrada' });
    }

    await area.update({
      level: level !== undefined ? level.trim().toLowerCase() : area.level,
      descripcion:
        descripcion !== undefined ? descripcion.trim() : area.descripcion,
      color: color !== undefined ? color : area.color,
    });

    res.status(200).json({ success: true, area });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0]?.path;
      if (field === 'level') {
        return res
          .status(400)
          .json({
            success: false,
            message: 'El nombre del área ya está en uso por otra.',
          });
      }
    }
    if (error.name === 'SequelizeValidationError') {
      return res
        .status(400)
        .json({ success: false, message: error.errors[0]?.message });
    }

    console.error(`[ERROR PUT AREA]: ${error.message}`);
    res
      .status(500)
      .json({
        success: false,
        message: 'Error interno al actualizar el área.',
      });
  }
};

// =========================================================
// ELIMINAR ÁREA (DELETE)
// =========================================================
export const deletelevelArea = async (req, res) => {
  try {
    const level = await LevelArea.findByPk(req.params.id);
    if (!level) {
      return res
        .status(404)
        .json({ success: false, message: 'Área no encontrada' });
    }
    await level.destroy();
    res.status(204).send();
  } catch (error) {
    console.error(`[ERROR DELETE AREA]: ${error.message}`);
    res
      .status(500)
      .json({
        success: false,
        message: 'Error al eliminar el área. Verifique que no esté en uso.',
      });
  }
};
