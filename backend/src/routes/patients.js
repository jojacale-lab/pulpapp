const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// GET /api/patients - List all patients
router.get('/', async (req, res) => {
  const { search, page = 1, limit = 20, active = 'true' } = req.query;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('patients')
    .select('*', { count: 'exact' })
    .eq('is_active', active === 'true')
    .order('last_name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,national_id.ilike.%${search}%,patient_number.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) return res.status(400).json({ error: error.message });

  res.json({ patients: data, total: count, page: Number(page), limit: Number(limit) });
});

// GET /api/patients/:id - Get single patient
router.get('/:id', async (req, res) => {
  const { data: patient, error } = await supabaseAdmin
    .from('patients')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !patient) return res.status(404).json({ error: 'Paciente no encontrado' });

  const { data: medHistory } = await supabaseAdmin
    .from('medical_history')
    .select('*')
    .eq('patient_id', req.params.id)
    .single();

  res.json({ patient, medical_history: medHistory });
});

// POST /api/patients - Create patient
router.post('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('patients')
    .insert({ ...req.body, created_by: req.user.id })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  // Create empty medical history
  await supabaseAdmin
    .from('medical_history')
    .insert({ patient_id: data.id });

  res.status(201).json({ patient: data });
});

// PUT /api/patients/:id - Update patient
router.put('/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('patients')
    .update({ ...req.body, updated_at: new Date() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ patient: data });
});

// DELETE /api/patients/:id - Hard delete (cascades all related records)
router.delete('/:id', requireRole('admin', 'dentist'), async (req, res) => {
  const { error } = await supabaseAdmin
    .from('patients')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Paciente eliminado permanentemente' });
});

// PUT /api/patients/:id/medical-history - Update medical history
router.put('/:id/medical-history', async (req, res) => {
  const { data: existing } = await supabaseAdmin
    .from('medical_history')
    .select('id')
    .eq('patient_id', req.params.id)
    .single();

  let result;
  if (existing) {
    result = await supabaseAdmin
      .from('medical_history')
      .update({ ...req.body, updated_at: new Date() })
      .eq('patient_id', req.params.id)
      .select()
      .single();
  } else {
    result = await supabaseAdmin
      .from('medical_history')
      .insert({ ...req.body, patient_id: req.params.id })
      .select()
      .single();
  }

  if (result.error) return res.status(400).json({ error: result.error.message });
  res.json({ medical_history: result.data });
});

// GET /api/patients/:id/stats - Patient stats
router.get('/:id/stats', async (req, res) => {
  const [appointments, records, invoices] = await Promise.all([
    supabaseAdmin.from('appointments').select('id', { count: 'exact' }).eq('patient_id', req.params.id),
    supabaseAdmin.from('clinical_records').select('id', { count: 'exact' }).eq('patient_id', req.params.id),
    supabaseAdmin.from('invoices').select('total, paid_amount').eq('patient_id', req.params.id)
  ]);

  const totalBilled = invoices.data?.reduce((s, i) => s + Number(i.total), 0) || 0;
  const totalPaid = invoices.data?.reduce((s, i) => s + Number(i.paid_amount), 0) || 0;

  res.json({
    total_appointments: appointments.count || 0,
    total_visits: records.count || 0,
    total_billed: totalBilled,
    total_paid: totalPaid,
    balance: totalBilled - totalPaid
  });
});

module.exports = router;
