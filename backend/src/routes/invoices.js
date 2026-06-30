const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// GET /api/invoices
router.get('/', async (req, res) => {
  const { patient_id, status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('invoices')
    .select(`*, patients(id, first_name, last_name, patient_number), user_profiles!dentist_id(id, full_name)`, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (patient_id) query = query.eq('patient_id', patient_id);
  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) return res.status(400).json({ error: error.message });
  res.json({ invoices: data, total: count });
});

// GET /api/invoices/:id
router.get('/:id', async (req, res) => {
  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select(`*, patients(*), user_profiles!dentist_id(*)`)
    .eq('id', req.params.id)
    .single();

  if (error || !invoice) return res.status(404).json({ error: 'Factura no encontrada' });

  const { data: items } = await supabaseAdmin
    .from('invoice_items')
    .select(`*, treatments(id, name, code)`)
    .eq('invoice_id', req.params.id);

  res.json({ invoice, items });
});

// POST /api/invoices - Create invoice
router.post('/', requireRole('admin', 'dentist'), async (req, res) => {
  const { patient_id, items, notes, due_date, tax_rate = 0, discount = 0, payment_method } = req.body;

  if (!patient_id || !items?.length) {
    return res.status(400).json({ error: 'Paciente e items son requeridos' });
  }

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price - (i.discount || 0), 0);
  const taxAmount = subtotal * (tax_rate / 100);
  const total = subtotal + taxAmount - discount;

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .insert({
      patient_id,
      dentist_id: req.user.id,
      due_date,
      tax_rate,
      tax_amount: taxAmount,
      discount,
      subtotal,
      total,
      notes,
      payment_method
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  const itemsToInsert = items.map(item => ({
    invoice_id: invoice.id,
    treatment_id: item.treatment_id || null,
    description: item.description,
    tooth_number: item.tooth_number || null,
    quantity: item.quantity || 1,
    unit_price: item.unit_price,
    discount: item.discount || 0,
    total: item.quantity * item.unit_price - (item.discount || 0)
  }));

  await supabaseAdmin.from('invoice_items').insert(itemsToInsert);

  const { data: fullInvoice } = await supabaseAdmin
    .from('invoices')
    .select(`*, patients(first_name, last_name, patient_number)`)
    .eq('id', invoice.id)
    .single();

  res.status(201).json({ invoice: fullInvoice });
});

// PUT /api/invoices/:id - Update invoice
router.put('/:id', requireRole('admin', 'dentist'), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .update({ ...req.body, updated_at: new Date() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ invoice: data });
});

// POST /api/invoices/:id/pay - Register payment
router.post('/:id/pay', requireRole('admin', 'dentist'), async (req, res) => {
  const { amount, payment_method } = req.body;
  const { data: invoice } = await supabaseAdmin.from('invoices').select('*').eq('id', req.params.id).single();

  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

  const newPaidAmount = Number(invoice.paid_amount) + Number(amount);
  const newStatus = newPaidAmount >= Number(invoice.total) ? 'paid' : 'partial';

  const { data, error } = await supabaseAdmin
    .from('invoices')
    .update({ paid_amount: newPaidAmount, status: newStatus, payment_method, updated_at: new Date() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ invoice: data });
});

// GET /api/invoices/treatments/catalog
router.get('/treatments/catalog', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('treatments')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('name');

  if (error) return res.status(400).json({ error: error.message });
  res.json({ treatments: data });
});

module.exports = router;
