const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

// GET /api/medication-orders/:patientId
router.get('/:patientId', authenticate, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('medication_orders')
    .select('*')
    .eq('patient_id', req.params.patientId)
    .order('created_at', { ascending: true });

  if (error) return res.status(400).json({ error: error.message });
  res.json({ orders: data });
});

// POST /api/medication-orders
router.post('/', authenticate, async (req, res) => {
  const { patient_id, medication, formula, frequency, duration } = req.body;
  if (!patient_id || !medication) return res.status(400).json({ error: 'Paciente y medicamento son requeridos' });

  const { data, error } = await supabaseAdmin
    .from('medication_orders')
    .insert({ patient_id, medication, formula, frequency, duration })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ order: data });
});

// PUT /api/medication-orders/:id
router.put('/:id', authenticate, async (req, res) => {
  const { medication, formula, frequency, duration } = req.body;

  const { data, error } = await supabaseAdmin
    .from('medication_orders')
    .update({ medication, formula, frequency, duration })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ order: data });
});

// DELETE /api/medication-orders/:id
router.delete('/:id', authenticate, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('medication_orders')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Orden eliminada' });
});

module.exports = router;
