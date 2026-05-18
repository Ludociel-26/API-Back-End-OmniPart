import { Role } from '../models/index.js';

// =========================================================
// CREAR ROL (POST)
// =========================================================
export const createRole = async (req, res) => {
  try {
    // 🛡️ Seguridad: Extraemos estrictamente los campos permitidos
    const { name, descripcion } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El nombre del rol es obligatorio.',
      });
    }

    // Normalizamos el string
    const normalizedName = name.trim().toLowerCase();

    const newRole = await Role.create({
      name: normalizedName,
      descripcion: descripcion ? descripcion.trim() : null,
    });

    res.status(201).json({ success: true, role: newRole });
  } catch (error) {
    console.error(
      '❌ [ERROR POST ROLE] Detalles:',
      error.errors ? JSON.stringify(error.errors, null, 2) : error.message,
    );

    // 🛡️ Manejo Inteligente de Restricciones
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0]?.path;

      // 1. Conflicto de Llave Primaria (Secuencia de Postgres desincronizada)
      if (field === 'rol_id' || field === 'PRIMARY') {
        return res.status(400).json({
          success: false,
          message:
            'Error de BD: La secuencia de IDs de roles está desincronizada. Contacte a soporte.',
        });
      }

      // 2. Conflicto real: el nombre del rol ya existe
      return res.status(400).json({
        success: false,
        message: `El rol '${req.body.name}' ya existe en el sistema.`,
      });
    }

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
        message: 'Error interno del servidor al crear el rol.',
      });
  }
};

// =========================================================
// OBTENER TODOS LOS ROLES (GET)
// =========================================================
export const getRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      order: [['rol_id', 'ASC']], // Evita que las filas brinquen al editar en React
    });
    res.status(200).json({ success: true, roles });
  } catch (error) {
    console.error(`[ERROR GET ROLES]: ${error.message}`);
    res
      .status(500)
      .json({ success: false, message: 'Error al obtener los roles.' });
  }
};

// =========================================================
// OBTENER ROL POR ID (GET)
// =========================================================
export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res
        .status(404)
        .json({ success: false, message: 'Rol no encontrado' });
    }
    res.status(200).json({ success: true, role });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================
// ACTUALIZAR ROL (PUT)
// =========================================================
export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, descripcion } = req.body;

    const role = await Role.findByPk(id);
    if (!role) {
      return res
        .status(404)
        .json({ success: false, message: 'Rol no encontrado' });
    }

    await role.update({
      name: name !== undefined ? name.trim().toLowerCase() : role.name,
      descripcion:
        descripcion !== undefined ? descripcion.trim() : role.descripcion,
    });

    res.status(200).json({ success: true, role });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0]?.path;
      if (field === 'name') {
        return res
          .status(400)
          .json({
            success: false,
            message: 'El nombre del rol ya está en uso por otro.',
          });
      }
    }

    console.error(`[ERROR PUT ROLE]: ${error.message}`);
    res
      .status(500)
      .json({ success: false, message: 'Error interno al actualizar el rol.' });
  }
};

// =========================================================
// ELIMINAR ROL (DELETE)
// =========================================================
export const deleteRole = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res
        .status(404)
        .json({ success: false, message: 'Rol no encontrado' });
    }
    await role.destroy();
    res.status(204).send(); // 204 No Content para éxito sin payload
  } catch (error) {
    console.error(`[ERROR DELETE ROLE]: ${error.message}`);
    // Si tienes relaciones con usuarios y la BD tiene restricciones, fallará aquí.
    res
      .status(500)
      .json({
        success: false,
        message:
          'Error al eliminar. Verifique que no haya usuarios con este rol asignado.',
      });
  }
};
