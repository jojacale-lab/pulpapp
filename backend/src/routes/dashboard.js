const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay())).toISOString();

  const [patients, todayApps, monthRevenue, pendingInvoices, weekApps] = await Promise.all([
    supabaseAdmin.from('patients').select('id', { count: 'exact' }).eq('is_active', true),
    supabaseAdmin.from('appointments')
      .select('id, status', { count: 'exact' })
      .gte('start_time', startOfDay).lte('start_time', endOfDay),
    supabaseAdmin.from('invoices')
      .select('total, paid_amount')
      .gte('created_at', startOfMonth)
      .neq('status', 'cancelled'),
    supabaseAdmin.from('invoices').select('id', { count: 'exact' }).eq('status', 'pending'),
    supabaseAdmin.from('appointments')
      .select('id, status')
      .gte('start_time', startOfWeek)
  ]);

  const monthTotal = monthRevenue.data?.reduce((s, i) => s + Number(i.paid_amount), 0) || 0;

  const todayByStatus = {};
  todayApps.data?.forEach(a => {
    todayByStatus[a.status] = (todayByStatus[a.status] || 0) + 1;
  });

  res.json({
    total_patients: patients.count || 0,
    today_appointments: todayApps.count || 0,
    today_by_status: todayByStatus,
    month_revenue: monthTotal,
    pending_invoices: pendingInvoices.count || 0,
    week_appointments: weekApps.count || 0
  });
});

// GET /api/dashboard/today-appointments
router.get('/today-appointments', async (req, res) => {
  const today = new Date();
  const start = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const end = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select(`*, patients(first_name, last_name, phone, mobile)`)
    .gte('start_time', start)
    .lte('start_time', end)
    .order('start_time');

  if (error) return res.status(400).json({ error: error.message });
  res.json({ appointments: data });
});

// GET /api/dashboard/recent-patients
router.get('/recent-patients', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('patients')
    .select('id, patient_number, first_name, last_name, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ patients: data });
});

// GET /api/dashboard/revenue-chart
router.get('/revenue-chart', async (req, res) => {
  const months = [];
  const today = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data } = await supabaseAdmin
      .from('invoices')
      .select('total, paid_amount')
      .gte('created_at', start)
      .lte('created_at', end)
      .neq('status', 'cancelled');

    const revenue = data?.reduce((s, i) => s + Number(i.paid_amount), 0) || 0;
    months.push({
      month: d.toLocaleString('es', { month: 'short', year: '2-digit' }),
      revenue
    });
  }

  res.json({ chart: months });
});

module.exports = router;
