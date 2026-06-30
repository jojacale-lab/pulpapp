const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/appointments - List appointments with filters
router.get('/', async (req, res) => {
  const { start, end, dentist_id, patient_id, status } = req.query;

  let query = supabaseAdmin
    .from('appointments')
    .select(`
      *,
      patients (id, first_name, last_name, phone, mobile),
      user_profiles!dentist_id (id, full_name)
    `)
    .order('start_time', { ascending: true });

  if (start) query = query.gte('start_time', start);
  if (end) query = query.lte('start_time', end);
  if (dentist_id) query = query.eq('dentist_id', dentist_id);
  if (patient_id) query = query.eq('patient_id', patient_id);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });
  res.json({ appointments: data });
});

// GET /api/appointments/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select(`*, patients(*), user_profiles!dentist_id(*)`)
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Cita no encontrada' });
  res.json({ appointment: data });
});

// POST /api/appointments - Create appointment
router.post('/', async (req, res) => {
  const { patient_id, dentist_id, start_time, end_time, title, treatment_type, notes, color } = req.body;

  if (!patient_id || !start_time || !end_time || !title) {
    return res.status(400).json({ error: 'Paciente, título y horario son requeridos' });
  }

  // Check for overlapping appointments
  const { data: conflicts } = await supabaseAdmin
    .from('appointments')
    .select('id')
    .eq('dentist_id', dentist_id || req.user.id)
    .neq('status', 'cancelled')
    .or(`and(start_time.lte.${start_time},end_time.gt.${start_time}),and(start_time.lt.${end_time},end_time.gte.${end_time})`);

  if (conflicts?.length > 0) {
    return res.status(409).json({ error: 'Conflicto de horario: ya existe una cita en ese rango' });
  }

  const { data, error } = await supabaseAdmin
    .from('appointments')
    .insert({
      patient_id,
      dentist_id: dentist_id || req.user.id,
      start_time,
      end_time,
      title,
      treatment_type,
      notes,
      color: color || '#1a9e75',
      created_by: req.user.id
    })
    .select(`*, patients(id, first_name, last_name)`)
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ appointment: data });
});

// PUT /api/appointments/:id - Update appointment
router.put('/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .update({ ...req.body, updated_at: new Date() })
    .eq('id', req.params.id)
    .select(`*, patients(id, first_name, last_name)`)
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ appointment: data });
});

// DELETE /api/appointments/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabaseAdmin
    .from('appointments')
    .update({ status: 'cancelled', updated_at: new Date() })
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Cita cancelada' });
});

// GET /api/appointments/today/summary
router.get('/today/summary', async (req, res) => {
  const today = new Date();
  const start = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const end = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select(`*, patients(first_name, last_name)`)
    .gte('start_time', start)
    .lte('start_time', end)
    .order('start_time');

  if (error) return res.status(400).json({ error: error.message });
  res.json({ appointments: data });
});

module.exports = router;
