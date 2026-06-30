const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

const getClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
};

const SYSTEM_PROMPT = `Eres PulpIA, un asistente clínico inteligente integrado en PulpApp, software para consultorios odontológicos.

Tus capacidades:
- Sugerir diagnósticos diferenciales basados en síntomas clínicos
- Revisar antecedentes médicos del paciente y señalar contraindicaciones o precauciones
- Proponer planes de tratamiento odontológico paso a paso
- Responder preguntas sobre protocolos clínicos, materiales y técnicas
- Indicar dosis y precauciones de medicamentos de uso odontológico
- Redactar o mejorar notas clínicas e informes

Reglas:
- Responde SIEMPRE en español
- Sé conciso, claro y profesional
- Cuando el contexto del paciente esté disponible, úsalo activamente para personalizar tu respuesta
- Los diagnósticos que sugieras son orientativos; siempre indica que requieren evaluación clínica presencial
- Para medicamentos indica siempre verificar con el formulario vigente local
- No respondas temas fuera del ámbito odontológico o de salud general relacionada
- Usa listas y estructura cuando ayude a la claridad`;

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  const { message, history = [], patient_context } = req.body;
  if (!message) return res.status(400).json({ error: 'Mensaje requerido' });

  const client = getClient();
  if (!client) {
    return res.json({
      response: 'PulpIA no está configurada. Agrega **ANTHROPIC_API_KEY** en el archivo `.env` del backend y reinicia el servidor.',
      isDemo: true
    });
  }

  // Construir contexto del sistema con datos del paciente si existen
  const systemContent = patient_context
    ? `${SYSTEM_PROMPT}\n\n---\nCONTEXTO DEL PACIENTE ACTIVO:\n${JSON.stringify(patient_context, null, 2)}\n---`
    : SYSTEM_PROMPT;

  // Filtrar historial: solo roles 'user' y 'assistant'
  const messages = history
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-10)
    .concat([{ role: 'user', content: message }]);

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemContent,
      messages
    });

    const response = msg.content[0].text;
    res.json({ response, tokensUsed: (msg.usage?.input_tokens || 0) + (msg.usage?.output_tokens || 0) });
  } catch (error) {
    console.error('Anthropic error:', error);
    res.status(500).json({ error: 'Error al conectar con PulpIA. Verifica que ANTHROPIC_API_KEY sea válida.' });
  }
});

// POST /api/ai/summarize-record
router.post('/summarize-record', async (req, res) => {
  const { record_id } = req.body;

  const { data: record } = await supabaseAdmin
    .from('clinical_records')
    .select(`*, patients(first_name, last_name, date_of_birth)`)
    .eq('id', record_id)
    .single();

  if (!record) return res.status(404).json({ error: 'Registro no encontrado' });

  const client = getClient();
  if (!client) return res.json({ summary: 'PulpIA no configurada' });

  const prompt = `Resume el siguiente registro clínico odontológico en formato profesional y estructurado:

Paciente: ${record.patients.first_name} ${record.patients.last_name}
Fecha: ${record.visit_date}
Motivo de consulta: ${record.chief_complaint}
Hallazgos intraorales: ${record.intraoral_findings || 'No registrado'}
Hallazgos extraorales: ${record.extraoral_findings || 'No registrado'}
Diagnóstico: ${record.diagnosis || 'No registrado'}
Tratamiento realizado: ${record.treatment_performed || 'No registrado'}
Plan de tratamiento: ${record.treatment_plan || 'No registrado'}
Medicamentos: ${record.medications_prescribed || 'No registrado'}`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    });
    res.json({ summary: msg.content[0].text });
  } catch (error) {
    console.error('Anthropic error:', error);
    res.status(500).json({ error: 'Error al resumir el registro' });
  }
});

// POST /api/ai/suggest-treatment
router.post('/suggest-treatment', async (req, res) => {
  const { symptoms, tooth_number, patient_history } = req.body;

  const client = getClient();
  if (!client) return res.json({ suggestion: 'PulpIA no configurada' });

  const prompt = `Un paciente presenta: ${symptoms}
${tooth_number ? `Diente afectado: ${tooth_number}` : ''}
${patient_history ? `Antecedentes relevantes: ${patient_history}` : ''}

Proporciona:
1) Diagnósticos diferenciales más probables
2) Exámenes complementarios sugeridos
3) Opciones de tratamiento ordenadas por indicación clínica`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 900,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    });
    res.json({ suggestion: msg.content[0].text });
  } catch (error) {
    console.error('Anthropic error:', error);
    res.status(500).json({ error: 'Error al generar sugerencia de tratamiento' });
  }
});

module.exports = router;
