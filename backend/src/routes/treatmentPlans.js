const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

// GET /api/treatment-plans/:patientId
router.get('/:patientId', authenticate, async (req, res) => {
  const { phase } = req.query;
  let query = supabaseAdmin
    .from('treatment_plans')
    .select('*')
    .eq('patient_id', req.params.patientId)
    .order('created_at', { ascending: true });

  if (phase) query = query.eq('phase', phase);

  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });
  res.json({ plans: data });
});

// POST /api/treatment-plans
router.post('/', authenticate, async (req, res) => {
  const { patient_id, tooth_number, procedure, estimated_cost, status, notes, phase } = req.body;
  if (!patient_id || !procedure) return res.status(400).json({ error: 'Paciente y procedimiento son requeridos' });

  const { data, error } = await supabaseAdmin
    .from('treatment_plans')
    .insert({ patient_id, tooth_number, procedure, estimated_cost: estimated_cost || 0, status: status || 'pending', notes, phase: phase || 'operatoria' })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ plan: data });
});

// PUT /api/treatment-plans/:id
router.put('/:id', authenticate, async (req, res) => {
  const { tooth_number, procedure, estimated_cost, status, notes, phase } = req.body;

  const { data, error } = await supabaseAdmin
    .from('treatment_plans')
    .update({ tooth_number, procedure, estimated_cost, status, notes, ...(phase ? { phase } : {}) })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ plan: data });
});

// DELETE /api/treatment-plans/:id
router.delete('/:id', authenticate, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('treatment_plans')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Item eliminado' });
});

module.exports = router;
