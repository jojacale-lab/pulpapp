const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// GET /api/clinical-history/:patientId - Get patient's clinical records
router.get('/:patientId', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('clinical_records')
    .select(`*, user_profiles!dentist_id(id, full_name, license_number)`)
    .eq('patient_id', req.params.patientId)
    .order('visit_date', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json({ records: data });
});

// GET /api/clinical-history/record/:id - Get single record
router.get('/record/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('clinical_records')
    .select(`*, user_profiles!dentist_id(id, full_name)`)
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json({ record: data });
});

// POST /api/clinical-history - Create record
router.post('/', requireRole('admin', 'dentist'), async (req, res) => {
  const {
    patient_id,
    visit_date,
    chief_complaint,
    intraoral_findings,
    extraoral_findings,
    diagnosis,
    treatment_performed,
    treatment_plan,
    medications_prescribed,
    next_visit_instructions,
    notes
  } = req.body;

  if (!patient_id || !chief_complaint) {
    return res.status(400).json({ error: 'Paciente y motivo de consulta son requeridos' });
  }

  const { data, error } = await supabaseAdmin
    .from('clinical_records')
    .insert({
      patient_id,
      dentist_id: req.user.id,
      visit_date: visit_date || new Date().toISOString(),
      chief_complaint,
      intraoral_findings,
      extraoral_findings,
      diagnosis,
      treatment_performed,
      treatment_plan,
      medications_prescribed,
      next_visit_instructions,
      notes
    })
    .select(`*, user_profiles!dentist_id(id, full_name)`)
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ record: data });
});

// PUT /api/clinical-history/:id - Update record
router.put('/:id', requireRole('admin', 'dentist'), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('clinical_records')
    .update({ ...req.body, updated_at: new Date() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ record: data });
});

// DELETE /api/clinical-history/:id
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const { error } = await supabaseAdmin
    .from('clinical_records')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Registro eliminado' });
});

module.exports = router;
