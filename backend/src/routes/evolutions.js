const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

async function uploadPhoto(base64, patientId, evolutionId) {
  const matches = base64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  if (!matches) throw new Error('Formato base64 inválido');
  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
  const path = `${patientId}/${evolutionId}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from('evolution-photos')
    .upload(path, buffer, { contentType: mimeType, upsert: true });
  if (error) throw error;

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('evolution-photos')
    .getPublicUrl(path);
  return publicUrl;
}

// GET /api/evolutions/:patientId
router.get('/:patientId', authenticate, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('evolutions')
    .select('*, dentist:user_profiles!evolutions_dentist_id_fkey(id, full_name, specialty)')
    .eq('patient_id', req.params.patientId)
    .order('visit_date', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json({ evolutions: data });
});

// POST /api/evolutions
router.post('/', authenticate, async (req, res) => {
  const { patient_id, visit_date, procedure_performed, clinical_observations, materials_used, next_appointment_plan, photo_base64 } = req.body;
  if (!patient_id || !procedure_performed)
    return res.status(400).json({ error: 'Paciente y procedimiento son requeridos' });

  const { data: evo, error } = await supabaseAdmin
    .from('evolutions')
    .insert({ patient_id, dentist_id: req.user.id, visit_date: visit_date || new Date().toISOString(), procedure_performed, clinical_observations, materials_used, next_appointment_plan })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  if (photo_base64) {
    try {
      const photo_url = await uploadPhoto(photo_base64, patient_id, evo.id);
      await supabaseAdmin.from('evolutions').update({ photo_url }).eq('id', evo.id);
      evo.photo_url = photo_url;
    } catch (e) { console.error('Photo upload failed:', e.message); }
  }

  res.status(201).json({ evolution: evo });
});

// PUT /api/evolutions/:id
router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { visit_date, procedure_performed, clinical_observations, materials_used, next_appointment_plan, photo_base64 } = req.body;

  const updates = { visit_date, procedure_performed, clinical_observations, materials_used, next_appointment_plan, updated_at: new Date().toISOString() };

  if (photo_base64) {
    const { data: existing } = await supabaseAdmin.from('evolutions').select('patient_id').eq('id', id).single();
    if (existing) {
      try { updates.photo_url = await uploadPhoto(photo_base64, existing.patient_id, id); }
      catch (e) { console.error('Photo upload failed:', e.message); }
    }
  }

  const { data, error } = await supabaseAdmin.from('evolutions').update(updates).eq('id', id).select('*, dentist:user_profiles!evolutions_dentist_id_fkey(id, full_name, specialty)').single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ evolution: data });
});

// DELETE /api/evolutions/:id
router.delete('/:id', authenticate, async (req, res) => {
  const { data: evo } = await supabaseAdmin.from('evolutions').select('photo_url, patient_id').eq('id', req.params.id).single();
  if (evo?.photo_url) {
    const base = `${evo.patient_id}/${req.params.id}`;
    await supabaseAdmin.storage.from('evolution-photos').remove([`${base}.jpg`, `${base}.png`, `${base}.webp`]);
  }
  const { error } = await supabaseAdmin.from('evolutions').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Evolución eliminada' });
});

module.exports = router;
