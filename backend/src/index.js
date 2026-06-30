require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', app: 'PulpApp', version: '1.0.0' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/clinical-history', require('./routes/clinicalHistory'));
app.use('/api/odontogram', require('./routes/odontogram'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/evolutions', require('./routes/evolutions'));
app.use('/api/treatment-plans', require('./routes/treatmentPlans'));
app.use('/api/medication-orders', require('./routes/medicationOrders'));
app.use('/api/admin', require('./routes/admin'));

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════╗
  ║   PulpApp Backend v1.0.0          ║
  ║   Puerto: ${PORT}                    ║
  ║   Entorno: ${process.env.NODE_ENV || 'development'}          ║
  ╚═══════════════════════════════════╝
  `);
});

module.exports = app;
