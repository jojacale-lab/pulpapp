const express = require('express');
const router = express.Router();
const { supabaseAdmin, supabaseAnon } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: 'Credenciales inválidas' });

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    return res.status(500).json({
      error: 'Las tablas de la base de datos no están inicializadas. Ejecuta el schema SQL en Supabase.',
      code: 'SCHEMA_NOT_INITIALIZED'
    });
  }

  res.json({
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: profile
  });
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, full_name, role = 'dentist', license_number, phone, clinic_name } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role, clinic_name }
  });

  if (error) return res.status(400).json({ error: error.message });

  // Update profile with additional fields
  await supabaseAdmin
    .from('user_profiles')
    .update({ license_number, phone, clinic_name })
    .eq('id', data.user.id);

  res.status(201).json({ message: 'Usuario creado exitosamente', userId: data.user.id });
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token requerido' });

  const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: refreshToken });
  if (error) return res.status(401).json({ error: 'Refresh token inválido' });

  res.json({ token: data.session.access_token, refreshToken: data.session.refresh_token });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res) => {
  const { full_name, phone, license_number, specialty } = req.body;
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .update({ full_name, phone, license_number, specialty, updated_at: new Date() })
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ user: data });
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  await supabaseAdmin.auth.admin.signOut(req.token);
  res.json({ message: 'Sesión cerrada' });
});

module.exports = router;
