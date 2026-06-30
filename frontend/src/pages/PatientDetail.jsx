import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patientsApi, odontogramApi, clinicalApi, treatmentPlanApi, medicationOrderApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Odontogram from '../components/Odontogram/Odontogram';
import SignatureCanvas from '../components/SignatureCanvas';
import EvolutionTimeline from '../components/EvolutionTimeline';
import ConfirmModal from '../components/ConfirmModal';

const TABS = ['Información', 'Historia médica', 'Odontograma', 'Evolución', 'Historia clínica', 'Firma'];

const ANTECEDENTES = [
  ['has_cardiovascular',    'Cardiovasculares'],
  ['has_coagulopathy',      'Alt. Coagulación'],
  ['has_hypertension',      'Hipertensión'],
  ['has_hepatitis',         'Hepatitis'],
  ['has_diabetes',          'Diabetes'],
  ['has_epilepsy',          'Epilepsia'],
  ['has_gastritis',         'Gastritis'],
  ['has_asthma',            'Asma'],
  ['has_cholesterol',       'Colesterol'],
  ['has_allergy_flag',      'Alergias'],
  ['has_sinusitis',         'Sinusitis'],
  ['has_other_antecedents', 'Otros'],
];

const HEALTH_HABITS = [
  'Cepillado 3 veces al día',
  'Uso de seda dental diaria',
  'Enjuague bucal antibacterial',
  'Renovar cepillo cada 3 meses',
  'Visitar odontólogo 2 veces al año',
  'Reducir consumo de azúcares',
  'Beber suficiente agua',
];

const TP_STATUS = {
  pending:     { label: 'Pendiente',   bg: 'var(--gray-100)',  color: 'var(--gray-500)' },
  in_progress: { label: 'En curso',    bg: 'var(--blue-light)',color: 'var(--blue)' },
  done:        { label: 'Finalizado',  bg: '#dcfce7',          color: '#15803d' },
};

// ─── Helpers UI ───────────────────────────────────────────────────────────────

const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--gray-50)' }}>
    <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem', minWidth: 140, flexShrink: 0 }}>{label}</span>
    <span style={{ color: 'var(--gray-800)', fontSize: '0.85rem', fontWeight: 500 }}>{value || '—'}</span>
  </div>
);

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--gray-500)', borderBottom: '2px solid var(--gray-100)', paddingBottom: 6, marginBottom: 12, marginTop: 4 }}>
    {children}
  </div>
);

const RadioGroup = ({ name, value, onChange, yesLabel = 'Sí', noLabel = 'No' }) => (
  <div style={{ display: 'flex', gap: 20, marginBottom: 8 }}>
    {[{ v: true, l: yesLabel }, { v: false, l: noLabel }].map(({ v, l }) => (
      <label key={String(v)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.88rem', fontWeight: value === v ? 600 : 400, color: value === v ? 'var(--gray-800)' : 'var(--gray-500)' }}>
        <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} style={{ accentColor: 'var(--green)', width: 15, height: 15 }} />
        {l}
      </label>
    ))}
  </div>
);

// ─── Plan de tratamiento ───────────────────────────────────────────────────────

function TreatmentPlansTable({ patientId, phase }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ tooth_number: '', procedure: '', estimated_cost: '', status: 'pending', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    treatmentPlanApi.list(patientId, phase ? { phase } : undefined)
      .then(({ plans: d }) => setPlans(d || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [patientId, phase]);

  const addPlan = async () => {
    if (!form.procedure.trim()) { alert('El tratamiento es requerido'); return; }
    setSaving(true);
    try {
      const { plan } = await treatmentPlanApi.create({
        patient_id: patientId, ...form,
        phase: phase || 'operatoria',
        estimated_cost: Number(form.estimated_cost) || 0,
      });
      setPlans(p => [...p, plan]);
      setForm({ tooth_number: '', procedure: '', estimated_cost: '', status: 'pending', notes: '' });
      setAdding(false);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      await treatmentPlanApi.update(id, { status });
      setPlans(p => p.map(x => x.id === id ? { ...x, status } : x));
    } catch (e) { alert(e.message); }
  };

  const removePlan = async (id) => {
    if (!window.confirm('¿Eliminar este ítem?')) return;
    try {
      await treatmentPlanApi.delete(id);
      setPlans(p => p.filter(x => x.id !== id));
    } catch (e) { alert(e.message); }
  };

  if (loading) return <div style={{ padding: 16, color: 'var(--gray-400)', fontSize: '0.82rem' }}>Cargando...</div>;

  return (
    <div>
      <div style={{ overflowX: 'auto', border: '1px solid var(--gray-200)', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
              {['Diente', 'Tratamiento', 'Costo Est.', 'Estado', ''].map((h, i) => (
                <th key={i} style={{ padding: '8px 12px', textAlign: i === 2 ? 'right' : 'left', fontWeight: 600, color: 'var(--gray-500)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.82rem' }}>Sin ítems en el plan de tratamiento</td></tr>
            ) : plans.map(p => {
              const st = TP_STATUS[p.status] || TP_STATUS.pending;
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  <td style={{ padding: '9px 12px' }}>
                    {p.tooth_number
                      ? <span style={{ fontFamily: 'monospace', background: 'var(--blue-light)', color: 'var(--blue)', padding: '2px 7px', borderRadius: 5, fontWeight: 700, fontSize: '0.8rem' }}>{p.tooth_number}</span>
                      : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                  </td>
                  <td style={{ padding: '9px 12px', color: 'var(--gray-800)', fontWeight: 500 }}>
                    {p.procedure}
                    {p.notes && <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 2 }}>{p.notes}</div>}
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--gray-600)', fontSize: '0.82rem' }}>
                    {p.estimated_cost > 0 ? `$ ${Number(p.estimated_cost).toLocaleString('es-CO')}` : '—'}
                  </td>
                  <td style={{ padding: '9px 12px' }}>
                    <select
                      value={p.status}
                      onChange={e => updateStatus(p.id, e.target.value)}
                      style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: 6, border: `1.5px solid ${st.bg}`, background: st.bg, color: st.color, fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                    >
                      <option value="pending">Pendiente</option>
                      <option value="in_progress">En curso</option>
                      <option value="done">Finalizado</option>
                    </select>
                  </td>
                  <td style={{ padding: '9px 8px' }}>
                    <button onClick={() => removePlan(p.id)} style={{ padding: '3px 8px', border: 'none', background: '#fee2e2', borderRadius: 5, cursor: 'pointer', fontSize: '0.75rem', color: '#991b1b' }}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {adding ? (
        <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 8, padding: 14, marginTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 130px 130px', gap: 10, marginBottom: 10 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Diente</label>
              <input className="form-input" placeholder="14" maxLength={4} value={form.tooth_number} onChange={e => setForm(f => ({ ...f, tooth_number: e.target.value }))} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label required">Tratamiento</label>
              <input className="form-input" placeholder="Descripción del procedimiento..." value={form.procedure} onChange={e => setForm(f => ({ ...f, procedure: e.target.value }))} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Costo Est.</label>
              <input type="number" min="0" className="form-input" placeholder="0" value={form.estimated_cost} onChange={e => setForm(f => ({ ...f, estimated_cost: e.target.value }))} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Estado</label>
              <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="pending">Pendiente</option>
                <option value="in_progress">En curso</option>
                <option value="done">Finalizado</option>
              </select>
            </div>
          </div>
          <div className="form-group" style={{ margin: '0 0 10px 0' }}>
            <label className="form-label">Notas</label>
            <input className="form-input" placeholder="Observaciones opcionales..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setAdding(false)} className="btn btn-outline btn-sm">Cancelar</button>
            <button onClick={addPlan} disabled={saving} className="btn btn-primary btn-sm">{saving ? 'Guardando...' : '✓ Agregar'}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="btn btn-outline btn-sm" style={{ marginTop: 8, width: '100%' }}>
          + Agregar ítem al plan
        </button>
      )}
    </div>
  );
}

// ─── Orden de medicamentos ─────────────────────────────────────────────────────

function MedicationOrdersTable({ patientId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ medication: '', formula: '', frequency: '', duration: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    medicationOrderApi.list(patientId)
      .then(({ orders: d }) => setOrders(d || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [patientId]);

  const addOrder = async () => {
    if (!form.medication.trim()) { alert('El medicamento es requerido'); return; }
    setSaving(true);
    try {
      const { order } = await medicationOrderApi.create({ patient_id: patientId, ...form });
      setOrders(o => [...o, order]);
      setForm({ medication: '', formula: '', frequency: '', duration: '' });
      setAdding(false);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const removeOrder = async (id) => {
    if (!window.confirm('¿Eliminar esta orden?')) return;
    try {
      await medicationOrderApi.delete(id);
      setOrders(o => o.filter(x => x.id !== id));
    } catch (e) { alert(e.message); }
  };

  if (loading) return <div style={{ padding: 16, color: 'var(--gray-400)', fontSize: '0.82rem' }}>Cargando...</div>;

  return (
    <div>
      <div style={{ overflowX: 'auto', border: '1px solid var(--gray-200)', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
              {['Medicamento', 'Fórmula', 'Frecuencia', 'Tiempo de consumo', ''].map((h, i) => (
                <th key={i} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-500)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.82rem' }}>Sin órdenes de medicamentos</td></tr>
            ) : orders.map(o => (
              <tr key={o.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                <td style={{ padding: '9px 12px', color: 'var(--gray-800)', fontWeight: 600 }}>{o.medication}</td>
                <td style={{ padding: '9px 12px', color: 'var(--gray-600)' }}>{o.formula || '—'}</td>
                <td style={{ padding: '9px 12px', color: 'var(--gray-600)' }}>{o.frequency || '—'}</td>
                <td style={{ padding: '9px 12px', color: 'var(--gray-600)' }}>{o.duration || '—'}</td>
                <td style={{ padding: '9px 8px' }}>
                  <button onClick={() => removeOrder(o.id)} style={{ padding: '3px 8px', border: 'none', background: '#fee2e2', borderRadius: 5, cursor: 'pointer', fontSize: '0.75rem', color: '#991b1b' }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding ? (
        <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 8, padding: 14, marginTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            {[
              { key: 'medication', label: 'Medicamento', required: true, placeholder: 'Nombre del medicamento' },
              { key: 'formula',   label: 'Fórmula',    placeholder: 'Ej: 500mg, 10mg/5ml' },
              { key: 'frequency', label: 'Frecuencia', placeholder: 'Ej: Cada 8 horas' },
              { key: 'duration',  label: 'Tiempo de consumo', placeholder: 'Ej: 7 días' },
            ].map(f => (
              <div key={f.key} className="form-group" style={{ margin: 0 }}>
                <label className={`form-label ${f.required ? 'required' : ''}`}>{f.label}</label>
                <input className="form-input" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setAdding(false)} className="btn btn-outline btn-sm">Cancelar</button>
            <button onClick={addOrder} disabled={saving} className="btn btn-primary btn-sm">{saving ? 'Guardando...' : '✓ Agregar'}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="btn btn-outline btn-sm" style={{ marginTop: 8, width: '100%' }}>
          + Agregar medicamento
        </button>
      )}
    </div>
  );
}

// ─── PatientDetail principal ───────────────────────────────────────────────────

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDentist } = useAuth();
  const [tab, setTab] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [patient, setPatient] = useState(null);
  const [medHistory, setMedHistory] = useState({});
  const [teeth, setTeeth] = useState([]);
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingInfo, setEditingInfo] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [medForm, setMedForm] = useState({});
  const [savingMed, setSavingMed] = useState(false);
  const [showExtraHistory, setShowExtraHistory] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ patient: p, medical_history }, teethData, recs, statsData] = await Promise.all([
        patientsApi.get(id),
        odontogramApi.get(id),
        clinicalApi.list(id),
        patientsApi.stats(id),
      ]);
      setPatient(p);
      setMedHistory(medical_history || {});
      setMedForm(medical_history || {});
      setEditForm(p);
      setTeeth(teethData.teeth || []);
      setRecords(recs.records || []);
      setStats(statsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const saveInfo = async () => {
    setSaving(true);
    try {
      const { patient: updated } = await patientsApi.update(id, editForm);
      setPatient(updated);
      setEditingInfo(false);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const saveMedHistory = async () => {
    setSavingMed(true);
    try {
      await patientsApi.updateMedicalHistory(id, medForm);
      setMedHistory(medForm);
      alert('Historia médica guardada');
    } catch (e) { alert(e.message); }
    finally { setSavingMed(false); }
  };

  const handleToothUpdate = async (toothNum, data) => {
    await odontogramApi.updateTooth(id, toothNum, data);
    const updated = await odontogramApi.get(id);
    setTeeth(updated.teeth || []);
  };

  const saveSignature = async (dataUrl) => {
    try {
      await patientsApi.updateMedicalHistory(id, { patient_signature: dataUrl, signed_at: new Date().toISOString() });
      alert('Firma guardada exitosamente');
    } catch (e) { alert(e.message); }
  };

  const toggleHabit = (habit) => {
    const current = medForm.health_habits_recommended || '';
    const lines = current.split('\n').map(l => l.trim()).filter(Boolean);
    const idx = lines.indexOf(habit);
    if (idx >= 0) lines.splice(idx, 1);
    else lines.push(habit);
    setMedForm(p => ({ ...p, health_habits_recommended: lines.join('\n') }));
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await patientsApi.delete(id);
      navigate('/patients');
    } catch (e) { alert(e.message); }
    finally { setDeleting(false); }
  };

  const calcAge = (dob) => {
    if (!dob) return null;
    return Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 3600 * 1000));
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>;
  if (!patient) return <div className="alert alert-error">Paciente no encontrado</div>;

  const age = calcAge(patient.date_of_birth);
  const habitsLines = (medForm.health_habits_recommended || '').split('\n').map(l => l.trim()).filter(Boolean);

  return (
    <div className="animate-fadein">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => navigate('/patients')} className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}>
          ← Volver a pacientes
        </button>
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div className="avatar avatar-lg" style={{ background: 'var(--blue-light)', color: 'var(--blue)', fontSize: '1.4rem' }}>
              {patient.first_name[0]}{patient.last_name[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gray-800)' }}>
                  {patient.first_name} {patient.last_name}
                </h1>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'var(--gray-100)', padding: '2px 8px', borderRadius: 999 }}>
                  {patient.patient_number}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                {age && <span>🎂 {age} años</span>}
                {patient.national_id && <span>🪪 {patient.national_id}</span>}
                {(patient.mobile || patient.phone) && <span>📱 {patient.mobile || patient.phone}</span>}
                {patient.blood_type && <span style={{ color: 'var(--red)', fontWeight: 600 }}>🩸 {patient.blood_type}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
              <button onClick={() => navigate(`/clinical-history/${id}`)} className="btn btn-primary btn-sm">📋 Historia clínica</button>
              <button onClick={() => navigate('/appointments', { state: { patient } })} className="btn btn-blue btn-sm">📅 Nueva cita</button>
              <button onClick={() => navigate('/billing', { state: { patient } })} className="btn btn-outline btn-sm">💳 Factura</button>
            </div>
          </div>

          {stats && (
            <div style={{ display: 'flex', gap: 24, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--gray-100)', flexWrap: 'wrap' }}>
              {[
                { label: 'Visitas',        value: stats.total_visits },
                { label: 'Citas',          value: stats.total_appointments },
                { label: 'Total facturado',value: `$${Number(stats.total_billed).toFixed(0)}` },
                { label: 'Total pagado',   value: `$${Number(stats.total_paid).toFixed(0)}`, color: 'var(--green)' },
                { label: 'Saldo',          value: `$${Number(stats.balance).toFixed(0)}`, color: stats.balance > 0 ? 'var(--red)' : 'var(--green)' },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: s.color || 'var(--gray-800)' }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map((t, i) => (
          <button key={i} className={`tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {/* ── Tab 0: Información ─────────────────────────────────────────────── */}
      {tab === 0 && (
        <div className="card animate-fadein">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700 }}>Datos del paciente</h3>
            {!editingInfo
              ? <button onClick={() => setEditingInfo(true)} className="btn btn-outline btn-sm">✏ Editar</button>
              : <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setEditingInfo(false)} className="btn btn-outline btn-sm">Cancelar</button>
                  <button onClick={saveInfo} disabled={saving} className="btn btn-primary btn-sm">{saving ? 'Guardando...' : '✓ Guardar'}</button>
                </div>
            }
          </div>

          {editingInfo ? (
            <div className="form-grid">
              {[
                { key: 'first_name', label: 'Nombre', required: true },
                { key: 'last_name',  label: 'Apellido', required: true },
                { key: 'national_id', label: 'Cédula / DNI' },
                { key: 'date_of_birth', label: 'Fecha de nacimiento', type: 'date' },
                { key: 'email', label: 'Correo', type: 'email' },
                { key: 'phone', label: 'Teléfono' },
                { key: 'mobile', label: 'Celular' },
                { key: 'city', label: 'Ciudad' },
                { key: 'address', label: 'Dirección' },
                { key: 'occupation', label: 'Ocupación' },
                { key: 'insurance_provider', label: 'Seguro' },
                { key: 'insurance_number', label: 'N° seguro' },
                { key: 'emergency_contact_name', label: 'Contacto emergencia' },
                { key: 'emergency_contact_phone', label: 'Tel. emergencia' },
              ].map(f => (
                <div key={f.key} className="form-group">
                  <label className={`form-label ${f.required ? 'required' : ''}`}>{f.label}</label>
                  <input type={f.type || 'text'} className="form-input" value={editForm[f.key] || ''} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Género</label>
                <select className="form-select" value={editForm.gender || 'M'} onChange={e => setEditForm(p => ({ ...p, gender: e.target.value }))}>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="O">Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipo de sangre</label>
                <select className="form-select" value={editForm.blood_type || ''} onChange={e => setEditForm(p => ({ ...p, blood_type: e.target.value }))}>
                  <option value="">No especificado</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Notas</label>
                <textarea className="form-textarea" value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
          ) : (
            <div style={{ columns: 2, columnGap: 40 }}>
              <InfoRow label="Número de paciente"  value={patient.patient_number} />
              <InfoRow label="Nombre completo"     value={`${patient.first_name} ${patient.last_name}`} />
              <InfoRow label="Cédula / DNI"        value={patient.national_id} />
              <InfoRow label="Fecha de nacimiento" value={patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString('es') : null} />
              <InfoRow label="Edad"                value={age ? `${age} años` : null} />
              <InfoRow label="Género"              value={{ M: 'Masculino', F: 'Femenino', O: 'Otro' }[patient.gender]} />
              <InfoRow label="Tipo de sangre"      value={patient.blood_type} />
              <InfoRow label="Correo"              value={patient.email} />
              <InfoRow label="Teléfono"            value={patient.phone} />
              <InfoRow label="Celular"             value={patient.mobile} />
              <InfoRow label="Dirección"           value={patient.address} />
              <InfoRow label="Ciudad"              value={patient.city} />
              <InfoRow label="Ocupación"           value={patient.occupation} />
              <InfoRow label="Seguro médico"       value={patient.insurance_provider} />
              <InfoRow label="N° de seguro"        value={patient.insurance_number} />
              <InfoRow label="Contacto emergencia" value={patient.emergency_contact_name} />
              <InfoRow label="Tel. emergencia"     value={patient.emergency_contact_phone} />
              <InfoRow label="Referido por"        value={patient.referred_by} />
              {patient.notes && <InfoRow label="Notas" value={patient.notes} />}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 1: Historia médica ─────────────────────────────────────────── */}
      {tab === 1 && (
        <div className="card animate-fadein">
          {/* Header con botón guardar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 style={{ fontWeight: 700 }}>Historia médica</h3>
            <button onClick={saveMedHistory} disabled={savingMed} className="btn btn-primary btn-sm">
              {savingMed ? 'Guardando...' : '✓ Guardar cambios'}
            </button>
          </div>

          {/* ── Motivo de consulta ──────────────────────────────────────────── */}
          <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '2px solid #6ee7b7', borderRadius: 12, padding: 18, marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: '1.1rem' }}>🦷</span>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Motivo de consulta
              </span>
              <span style={{ fontSize: '0.72rem', background: '#bbf7d0', color: '#166534', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>
                Campo principal
              </span>
            </div>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="¿Por qué viene el paciente hoy? Ej: Dolor en molar superior derecho desde hace 3 días, sensibilidad al frío, fractura de diente..."
              value={medForm.motivo_consulta || ''}
              onChange={e => setMedForm(p => ({ ...p, motivo_consulta: e.target.value }))}
              style={{ background: 'white', border: '1.5px solid #a7f3d0', fontSize: '0.9rem' }}
            />
          </div>

          {/* ── 1. Antecedentes ─────────────────────────────────────────────── */}
          <SectionTitle>1. Antecedentes médicos</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
            {ANTECEDENTES.map(([key, label]) => {
              const active = !!medForm[key];
              return (
                <label
                  key={key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    border: `1.5px solid ${active ? '#fca5a5' : 'var(--gray-200)'}`,
                    background: active ? '#fff5f5' : '#fff',
                    borderRadius: 8, padding: '9px 12px', cursor: 'pointer',
                    transition: 'all 0.15s', fontSize: '0.84rem',
                    color: active ? '#991b1b' : 'var(--gray-700)',
                    fontWeight: active ? 600 : 400,
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={e => setMedForm(p => ({ ...p, [key]: e.target.checked }))}
                    style={{ accentColor: '#ef4444', width: 15, height: 15, flexShrink: 0 }}
                  />
                  {label}
                </label>
              );
            })}
          </div>

          {/* ── 2. Medicación + Embarazo ────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            {/* Medicado */}
            <div style={{ background: 'var(--gray-50)', borderRadius: 10, padding: 16, border: '1px solid var(--gray-200)' }}>
              <SectionTitle>2. ¿Paciente medicado actualmente?</SectionTitle>
              <RadioGroup
                name="is_medicated"
                value={medForm.is_medicated === true ? true : false}
                onChange={v => setMedForm(p => ({ ...p, is_medicated: v, ...(v ? {} : { medications_which: '' }) }))}
              />
              {medForm.is_medicated && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">¿Cuál?</label>
                  <input
                    className="form-input"
                    placeholder="Nombre del/los medicamento(s)..."
                    value={medForm.medications_which || ''}
                    onChange={e => setMedForm(p => ({ ...p, medications_which: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {/* Embarazo */}
            <div style={{ background: 'var(--gray-50)', borderRadius: 10, padding: 16, border: '1px solid var(--gray-200)' }}>
              <SectionTitle>3. ¿Paciente en embarazo?</SectionTitle>
              <RadioGroup
                name="is_pregnant"
                value={medForm.is_pregnant === true ? true : false}
                onChange={v => setMedForm(p => ({ ...p, is_pregnant: v, ...(v ? {} : { pregnancy_weeks: null }) }))}
              />
              {medForm.is_pregnant && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">N° de semanas</label>
                  <input
                    type="number" min="1" max="42"
                    className="form-input"
                    placeholder="Semanas de gestación..."
                    value={medForm.pregnancy_weeks || ''}
                    onChange={e => setMedForm(p => ({ ...p, pregnancy_weeks: e.target.value ? Number(e.target.value) : null }))}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── 4. Higiene oral ─────────────────────────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <SectionTitle>4. Frecuencia y hábitos de higiene oral</SectionTitle>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Ej: Cepilla 2 veces al día, no usa seda dental, usa enjuague esporádicamente..."
              value={medForm.oral_hygiene_habits || ''}
              onChange={e => setMedForm(p => ({ ...p, oral_hygiene_habits: e.target.value }))}
            />
          </div>

          {/* ── 5. Observaciones del paciente ───────────────────────────────── */}
          <div style={{ marginBottom: 28 }}>
            <SectionTitle>5. Observaciones suministradas por el paciente</SectionTitle>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Motivo de consulta, síntomas, preocupaciones, historia reportada por el paciente..."
              value={medForm.patient_observations || ''}
              onChange={e => setMedForm(p => ({ ...p, patient_observations: e.target.value }))}
            />
          </div>

          {/* Guardar (repetido abajo para comodidad) */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
            <button onClick={saveMedHistory} disabled={savingMed} className="btn btn-primary btn-sm">
              {savingMed ? 'Guardando...' : '✓ Guardar historia médica'}
            </button>
          </div>

          {/* Separador */}
          <div style={{ borderTop: '2px solid var(--gray-100)', marginBottom: 28 }} />

          {/* ── 6. Plan de tratamiento ──────────────────────────────────────── */}
          <div style={{ marginBottom: 28 }}>
            <SectionTitle>6. Plan de tratamiento</SectionTitle>

            {/* Fase 1: Higiénica */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <div style={{ background: '#ecfdf5', border: '1.5px solid #6ee7b7', borderRadius: 8, padding: '6px 14px', fontWeight: 700, fontSize: '0.82rem', color: '#065f46', whiteSpace: 'nowrap' }}>
                  🧹 Fase 1 — Higiénica
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>Profilaxis, detartraje, control de placa, instrucción de higiene oral</span>
              </div>
              <TreatmentPlansTable patientId={id} phase="higienica" />
            </div>

            {/* Fase 2: Operatoria */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <div style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 8, padding: '6px 14px', fontWeight: 700, fontSize: '0.82rem', color: '#1e40af', whiteSpace: 'nowrap' }}>
                  🔧 Fase 2 — Operatoria
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>Obturaciones, extracciones, endodoncias, coronas, prótesis, implantes</span>
              </div>
              <TreatmentPlansTable patientId={id} phase="operatoria" />
            </div>
          </div>

          {/* ── 7. Hábitos recomendados ─────────────────────────────────────── */}
          <div style={{ marginBottom: 28 }}>
            <SectionTitle>7. Hábitos de salud oral recomendados</SectionTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {HEALTH_HABITS.map(habit => {
                const active = habitsLines.includes(habit);
                return (
                  <button
                    key={habit}
                    type="button"
                    onClick={() => toggleHabit(habit)}
                    style={{
                      padding: '5px 13px', borderRadius: 999, fontSize: '0.8rem', cursor: 'pointer',
                      border: `1.5px solid ${active ? 'var(--green)' : 'var(--gray-200)'}`,
                      background: active ? '#f0fdf9' : '#fff',
                      color: active ? '#15803d' : 'var(--gray-600)',
                      fontWeight: active ? 600 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    {active ? '✓ ' : '+ '}{habit}
                  </button>
                );
              })}
            </div>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Haz clic en las sugerencias para agregarlas, o escribe recomendaciones personalizadas..."
              value={medForm.health_habits_recommended || ''}
              onChange={e => setMedForm(p => ({ ...p, health_habits_recommended: e.target.value }))}
            />
            {habitsLines.length > 0 && (
              <button
                onClick={saveMedHistory}
                disabled={savingMed}
                className="btn btn-primary btn-sm"
                style={{ marginTop: 8 }}
              >
                {savingMed ? 'Guardando...' : '✓ Guardar recomendaciones'}
              </button>
            )}
          </div>

          {/* ── 8. Orden de medicamentos ────────────────────────────────────── */}
          <div style={{ marginBottom: 28 }}>
            <SectionTitle>8. Orden de medicamentos</SectionTitle>
            <MedicationOrdersTable patientId={id} />
          </div>

          {/* ── Información médica adicional (colapsible) ───────────────────── */}
          <div style={{ borderTop: '1px dashed var(--gray-200)', paddingTop: 16 }}>
            <button
              onClick={() => setShowExtraHistory(v => !v)}
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', justifyContent: 'center', color: 'var(--gray-500)' }}
            >
              {showExtraHistory ? '▲ Ocultar' : '▼ Ver'} información médica adicional (alergias, hábitos, historial dental)
            </button>

            {showExtraHistory && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 20 }}>
                <div>
                  <div className="section-title">Otras condiciones sistémicas</div>
                  {[
                    ['has_heart_disease',   'Enfermedad cardíaca'],
                    ['has_hiv',             'VIH/SIDA'],
                    ['has_kidney_disease',  'Enfermedad renal'],
                    ['has_thyroid_disease', 'Enfermedad tiroidea'],
                    ['has_osteoporosis',    'Osteoporosis'],
                  ].map(([key, label]) => (
                    <label key={key} className="checkbox-item" style={{ margin: '4px 0' }}>
                      <input type="checkbox" checked={!!medForm[key]} onChange={e => setMedForm(p => ({ ...p, [key]: e.target.checked }))} />
                      {label}
                    </label>
                  ))}
                  <div className="form-group" style={{ marginTop: 12 }}>
                    <label className="form-label">Otras condiciones</label>
                    <textarea className="form-textarea" rows={2} value={medForm.other_conditions || ''} onChange={e => setMedForm(p => ({ ...p, other_conditions: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Anticoagulantes</label>
                    <input className="form-input" value={medForm.anticoagulants || ''} onChange={e => setMedForm(p => ({ ...p, anticoagulants: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <div className="section-title">Alergias específicas</div>
                  {[
                    ['has_penicillin_allergy',  'Penicilina'],
                    ['has_aspirin_allergy',     'Aspirina'],
                    ['has_latex_allergy',       'Látex'],
                    ['has_anesthesia_allergy',  'Anestesia local'],
                    ['has_ibuprofen_allergy',   'Ibuprofeno'],
                  ].map(([key, label]) => (
                    <label key={key} className="checkbox-item" style={{ margin: '4px 0' }}>
                      <input type="checkbox" checked={!!medForm[key]} onChange={e => setMedForm(p => ({ ...p, [key]: e.target.checked }))} />
                      Alergia a {label}
                    </label>
                  ))}
                  <div className="form-group" style={{ marginTop: 8 }}>
                    <label className="form-label">Otras alergias</label>
                    <input className="form-input" value={medForm.other_allergies || ''} onChange={e => setMedForm(p => ({ ...p, other_allergies: e.target.value }))} />
                  </div>

                  <div className="section-title" style={{ marginTop: 20 }}>Hábitos</div>
                  {[
                    ['smokes',           'Fuma'],
                    ['drinks_alcohol',   'Consume alcohol'],
                    ['teeth_grinding',   'Bruxismo (rechina dientes)'],
                    ['nail_biting',      'Come uñas'],
                    ['has_dental_anxiety','Ansiedad dental'],
                  ].map(([key, label]) => (
                    <label key={key} className="checkbox-item" style={{ margin: '4px 0' }}>
                      <input type="checkbox" checked={!!medForm[key]} onChange={e => setMedForm(p => ({ ...p, [key]: e.target.checked }))} />
                      {label}
                    </label>
                  ))}

                  <div className="section-title" style={{ marginTop: 20 }}>Historial dental</div>
                  <div className="form-group">
                    <label className="form-label">Última visita dental</label>
                    <input type="date" className="form-input" value={medForm.last_dental_visit || ''} onChange={e => setMedForm(p => ({ ...p, last_dental_visit: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Problemas dentales previos</label>
                    <textarea className="form-textarea" rows={2} value={medForm.previous_dental_issues || ''} onChange={e => setMedForm(p => ({ ...p, previous_dental_issues: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lactando</label>
                    <label className="checkbox-item">
                      <input type="checkbox" checked={!!medForm.is_breastfeeding} onChange={e => setMedForm(p => ({ ...p, is_breastfeeding: e.target.checked }))} />
                      Sí, actualmente lactando
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 2: Odontograma ────────────────────────────────────────────── */}
      {tab === 2 && (
        <div className="card animate-fadein">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700 }}>🦷 Odontograma</h3>
            <button onClick={() => navigate(`/clinical-history/${id}`)} className="btn btn-outline btn-sm">
              Ver historia clínica
            </button>
          </div>
          <Odontogram patientId={id} teethData={teeth} onUpdate={handleToothUpdate} />
        </div>
      )}

      {/* ── Tab 3: Evolución ─────────────────────────────────────────────── */}
      {tab === 3 && (
        <EvolutionTimeline patientId={id} />
      )}

      {/* ── Tab 4: Historia clínica ──────────────────────────────────────── */}
      {tab === 4 && (
        <div className="animate-fadein">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700 }}>📋 Historia clínica</h3>
            <button onClick={() => navigate(`/clinical-history/${id}`)} className="btn btn-primary btn-sm">
              + Nueva consulta
            </button>
          </div>
          {records.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-text">Sin registros clínicos</div>
                <button onClick={() => navigate(`/clinical-history/${id}`)} className="btn btn-primary" style={{ marginTop: 16 }}>
                  Agregar primera consulta
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {records.slice(0, 5).map(r => (
                <div key={r.id} className="card card-sm">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, color: 'var(--green)', fontSize: '0.9rem' }}>
                      {new Date(r.visit_date).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>{r.user_profiles?.full_name}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--gray-700)' }}><strong>Motivo:</strong> {r.chief_complaint}</div>
                  {r.diagnosis && <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginTop: 4 }}><strong>Diagnóstico:</strong> {r.diagnosis}</div>}
                  {r.treatment_performed && <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginTop: 4 }}><strong>Tratamiento:</strong> {r.treatment_performed}</div>}
                </div>
              ))}
              {records.length > 5 && (
                <button onClick={() => navigate(`/clinical-history/${id}`)} className="btn btn-outline w-full">
                  Ver todos ({records.length}) registros →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 5: Firma ─────────────────────────────────────────────────── */}
      {tab === 5 && (
        <div className="card animate-fadein">
          <h3 style={{ fontWeight: 700, marginBottom: 20 }}>✍ Consentimiento y firma del paciente</h3>
          <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: 16, marginBottom: 20, fontSize: '0.85rem', color: 'var(--gray-600)' }}>
            <strong>Declaración de consentimiento:</strong> El paciente declara que la información proporcionada es verdadera y completa, autoriza al profesional a realizar los tratamientos necesarios, y acepta los términos de atención del consultorio.
          </div>
          <SignatureCanvas onSave={saveSignature} existingSignature={medHistory?.patient_signature} />
          {medHistory?.signed_at && (
            <div className="alert alert-success" style={{ marginTop: 12 }}>
              ✓ Firmado el {new Date(medHistory.signed_at).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      )}

      {/* ── Zona de peligro ──────────────────────────────────────────────── */}
      {isDentist && (
        <div style={{ marginTop: 32, borderTop: '2px dashed #fecaca', paddingTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                Zona de peligro
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>
                Elimina al paciente y todos sus registros de forma permanente.
              </div>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              style={{
                padding: '10px 20px', borderRadius: 10, border: '2px solid #dc2626',
                background: 'white', color: '#dc2626', fontWeight: 700,
                fontSize: '0.9rem', cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: 8, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#dc2626'; }}
            >
              🗑️ Eliminar paciente
            </button>
          </div>
        </div>
      )}

      {showDeleteModal && patient && (
        <ConfirmModal
          title={`¿Eliminar a ${patient.first_name} ${patient.last_name}?`}
          message={`¿Estás seguro de eliminar a ${patient.first_name} ${patient.last_name}? Esta acción eliminará todos sus registros, historia clínica, odontograma y evoluciones permanentemente y no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          loading={deleting}
        />
      )}
    </div>
  );
}
