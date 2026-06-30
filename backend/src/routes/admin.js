const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const OWNER_EMAILS = ['jojacale@gmail.com', 'sica2121@gmail.com'];

const requireOwner = (req, res, next) => {
  if (!OWNER_EMAILS.includes(req.user?.email)) {
    return res.status(403).json({ error: 'Acceso restringido a administradores del sistema' });
  }
  next();
};

// GET /api/admin/users — Lista todos los usuarios
router.get('/users', authenticate, requireOwner, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, email, full_name, role, is_active, subscription_status, subscription_end_date, clinic_name, created_at')
    .order('created_at', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json({ users: data });
});

// PUT /api/admin/users/:id — Activar / desactivar / cambiar suscripción
router.put('/users/:id', authenticate, requireOwner, async (req, res) => {
  const { is_active, subscription_status, subscription_end_date, role } = req.body;

  const updates = {};
  if (is_active !== undefined)            updates.is_active = is_active;
  if (subscription_status !== undefined)  updates.subscription_status = subscription_status;
  if (subscription_end_date !== undefined) updates.subscription_end_date = subscription_end_date;
  if (role !== undefined)                 updates.role = role;
  updates.updated_at = new Date();

  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ user: data });
});

module.exports = router;
