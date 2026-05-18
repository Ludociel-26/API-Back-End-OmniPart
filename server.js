import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';

// =======================================================================
// 🚩 FAIL-FAST: VALIDACIÓN DE VARIABLES DE ENTORNO CRÍTICAS
// =======================================================================
// Si la semilla criptográfica no existe, detenemos el servidor de inmediato
// para evitar brechas de seguridad en la emisión de tokens JWT.
if (!process.env.JWT_SECRET) {
  console.error(
    '❌ FATAL ERROR: La variable JWT_SECRET no está definida en el archivo .env',
  );
  process.exit(1);
}

// Importaciones de los módulos path
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import connectDB, { sequelize } from './config/postgresdb.js';

// Routes
import authRouter from './routes/authRoutes.js';
import userRouter from './routes/userRoutes.js';
import roleRouter from './routes/roleRoutes.js';
import levelAreaRouter from './routes/levelAreaRoutes.js';

import logger from './logger.js';

// =======================================================================
// 🚩 1. CONFIGURACIÓN DE RUTAS ABSOLUTAS (__dirname en ES Modules)
// =======================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 4000;

// =======================================================================
// 🚩 2. TRUST PROXY (IMPORTANTE PARA AWS / NGINX / LOAD BALANCER)
// =======================================================================
// Permite que Express obtenga correctamente la IP real del cliente
// cuando se usa un proxy o balanceador (muy común en AWS EC2)

app.set('trust proxy', 1);

// =======================================================================
// 🚩 3. CONFIGURACIÓN DE SEGURIDAD CON HELMET
// =======================================================================

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

// =======================================================================
// 🚩 4. MIDDLEWARES DE PARSEO
// =======================================================================

app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser());

// =======================================================================
// 🚩 5. CONFIGURACIÓN DE CORS (DESDE .env)
// =======================================================================

// Convertimos la variable del .env en array
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((url) => url.trim())
  : [];

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requests sin origin (postman, curl, apps móviles)
      if (!origin) return callback(null, true);

      // Si el origin está permitido
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Si no está permitido
      console.log(`❌ CORS bloqueado para: ${origin}`);
      return callback(new Error('Bloqueado por CORS'));
    },

    credentials: true, // Vital para el envío y recepción de cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-forwarded-for'],
  }),
);

// =======================================================================
// 🚩 6. RATE LIMITING (PROTECCIÓN CONTRA ATAQUES)
// =======================================================================

const getClientIP = (req) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (ip && ip.includes(',')) ip = ip.split(',')[0];

  return ip?.replace(/^::ffff:/, '');
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // máximo 300 requests por IP
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    const ip = getClientIP(req);

    logger.warn(`⚠️ IP bloqueada temporalmente por exceso de requests: ${ip}`);

    res.status(429).json({
      success: false,
      message:
        'Demasiadas solicitudes al servidor. Intente nuevamente en unos minutos.',
    });
  },
});

app.use(limiter);

// =======================================================================
// 🚩 7. SERVIR ARCHIVOS ESTÁTICOS
// =======================================================================

app.use('/assets', express.static(path.join(__dirname, 'assets')));

// =======================================================================
// 🚩 7.5. PREVENCIÓN DE CACHÉ (EL FIX DEFINITIVO PARA LAS COOKIES)
// =======================================================================
// Este middleware inyecta cabeceras HTTP que prohíben al navegador (Chrome/Safari)
// cachear las respuestas de la API. Así, el Heartbeat de tu Front-End siempre
// impactará el servidor real. Si borras la cookie, el backend responderá 401
// instantáneamente y tu interceptor original hará su trabajo.

app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// =======================================================================
// 🚩 8. RUTAS DE LA API
// =======================================================================

app.get('/', (req, res) => {
  res.send('API Working fine');
});

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/roles', roleRouter);
app.use('/api/levelArea', levelAreaRouter);

// =======================================================================
// 🚩 9. MANEJO DE ERRORES DE JSON
// =======================================================================

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.log('❌ Invalid JSON format');

    return res.status(400).json({
      success: false,
      message: 'Formato JSON inválido',
    });
  }

  next();
});

// =======================================================================
// 🚩 10. RUTA 404 (SI NO EXISTE LA RUTA)
// =======================================================================

app.use((req, res) => {
  res.status(404).json({
    message: `No se encontró la ruta: ${req.method} ${req.originalUrl}`,
  });
});

// =======================================================================
// 🚩 11. INICIAR SERVIDOR SOLO CUANDO LA DB ESTÉ LISTA
// =======================================================================
// Esto evita que la API arranque si PostgreSQL falla

const startServer = async () => {
  try {
    console.log('🔍 Conectando a la base de datos...');

    await connectDB();

    console.log('✅ Base de datos conectada');

    await sequelize.sync();

    console.log('✅ Modelos sincronizados');

    app.listen(port, () => {
      logger.info(`🚀 Server started on PORT:${port}`);
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);

    process.exit(1);
  }
};

startServer();
