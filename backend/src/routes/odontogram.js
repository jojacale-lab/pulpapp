const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/odontogram/:patientId
router.get('/:patientId', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('odontogram')
    .select('*')
    .eq('patient_id', req.params.patientId)
    .order('tooth_number');

  if (error) return res.status(400).json({ error: error.message });
  res.json({ teeth: data });
});

// PUT /api/odontogram/:patientId/:toothNumber - Update single tooth
router.put('/:patientId/:toothNumber', async (req, res) => {
  const { patientId, toothNumber } = req.params;
  const toothNum = parseInt(toothNumber);

  const { data: existing } = await supabaseAdmin
    .from('odontogram')
    .select('id')
    .eq('patient_id', patientId)
    .eq('tooth_number', toothNum)
    .single();

  let result;
  if (existing) {
    result = await supabaseAdmin
      .from('odontogram')
      .update({ ...req.body, updated_by: req.user.id, updated_at: new Date() })
      .eq('patient_id', patientId)
      .eq('tooth_number', toothNum)
      .select()
      .single();
  } else {
    result = await supabaseAdmin
      .from('odontogram')
      .insert({
        patient_id: patientId,
        tooth_number: toothNum,
        ...req.body,
        updated_by: req.user.id
      })
      .select()
      .single();
  }

  if (result.error) return res.status(400).json({ error: result.error.message });
  res.json({ tooth: result.data });
});

// PUT /api/odontogram/:patientId/bulk - Update multiple teeth
router.put('/:patientId/bulk', async (req, res) => {
  const { patientId } = req.params;
  const { teeth } = req.body;

  const results = await Promise.all(
    teeth.map(async (tooth) => {
      const { data: existing } = await supabaseAdmin
        .from('odontogram')
        .select('id')
        .eq('patient_id', patientId)
        .eq('tooth_number', tooth.tooth_number)
        .single();

      if (existing) {
        return supabaseAdmin
          .from('odontogram')
          .update({ ...tooth, updated_by: req.user.id, updated_at: new Date() })
          .eq('patient_id', patientId)
          .eq('tooth_number', tooth.tooth_number)
          .select()
          .single();
      } else {
        return supabaseAdmin
          .from('odontogram')
          .insert({ patient_id: patientId, ...tooth, updated_by: req.user.id })
          .select()
          .single();
      }
    })
  );

  res.json({ message: 'Odontograma actualizado', count: results.length });
});

module.exports = router;
