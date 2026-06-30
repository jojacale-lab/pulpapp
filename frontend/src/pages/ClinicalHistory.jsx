import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clinicalApi, patientsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

function NewRecordModal({ patientId, onClose, onCreated }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    patient_id: patientId,
    visit_date: new Date().toISOString().slice(0, 16),
    chief_complaint: '',
    intraoral_findings: '',
    extraoral_findings: '',
    diagnosis: '',
    treatment_performed: '',
    treatment_plan: '',
    medications_prescribed: '',
    next_visit_instructions: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.chief_complaint) { setError('El motivo de consulta es requerido'); return; }
    setLoading(true);
    try {
      const { record } = await clinicalApi.create(form);
      onCreated(record);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay modal-xl">
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">📋 Nueva consulta clínica</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>⚠ {error}</div>}

            <div className="form-grid" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label required">Fecha y hora</label>
                <input type="datetime-local" className="form-input" value={form.visit_date} onChange={e => set('visit_date', e.target.value)} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label required">Motivo de consulta</label>
              <input className="form-input" value={form.chief_complaint} onChange={e => set('chief_complaint', e.target.value)} placeholder="¿Por qué acude el paciente?" required />
            </div>

            <div className="form-grid" style={{ marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label">Hallazgos intraorales</label>
                <textarea className="form-textarea" rows={3} value={form.intraoral_findings} onChange={e => set('intraoral_findings', e.target.value)} placeholder="Examinación dentro de la boca..." />
              </div>
              <div className="form-group">
                <label className="form-label">Hallazgos extraorales</label>
                <textarea className="form-textarea" rows={3} value={form.extraoral_findings} onChange={e => set('extraoral_findings', e.target.value)} placeholder="Examinación fuera de la boca, ganglios, ATM..." />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Diagnóstico</label>
              <textarea className="form-textarea" rows={2} value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} placeholder="Diagnóstico definitivo o diferencial..." />
            </div>

            <div className="form-grid" style={{ marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label">Tratamiento realizado</label>
                <textarea className="form-textarea" rows={3} value={form.treatment_performed} onChange={e => set('treatment_performed', e.target.value)} placeholder="¿Qué se realizó en esta cita?" />
              </div>
              <div className="form-group">
                <label className="form-label">Plan de tratamiento</label>
                <textarea className="form-textarea" rows={3} value={form.treatment_plan} onChange={e => set('treatment_plan', e.target.value)} placeholder="Tratamientos futuros planificados..." />
              </div>
            </div>

            <div className="form-grid" style={{ marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label">Medicamentos recetados</label>
                <textarea className="form-textarea" rows={2} value={form.medications_prescribed} onChange={e => set('medications_prescribed', e.target.value)} placeholder="Nombre, dosis, frecuencia..." />
              </div>
              <div className="form-group">
                <label className="form-label">Instrucciones para próxima cita</label>
                <textarea className="form-textarea" rows={2} value={form.next_visit_instructions} onChange={e => set('next_visit_instructions', e.target.value)} placeholder="Indicaciones postoperatorias, próxima cita..." />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notas adicionales</label>
              <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Observaciones generales..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-outline">Cancelar</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Guardando...' : '✓ Guardar consulta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const RecordCard = ({ record, onExpand, expanded }) => {
  const date = new Date(record.visit_date).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = new Date(record.visit_date).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="card card-sm" style={{ borderLeft: '4px solid var(--green)', cursor: 'pointer' }} onClick={onExpand}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--green)', fontSize: '0.85rem', textTransform: 'capitalize' }}>{date} • {time}</div>
          <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--gray-800)', marginTop: 2 }}>{record.chief_complaint}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>
            Dr. {record.user_profiles?.full_name || 'N/A'}
          </div>
        </div>
        <span style={{ fontSize: '1rem', color: 'var(--gray-400)' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--gray-100)' }} onClick={e => e.stopPropagation()}>
          {[
            { label: 'Hallazgos intraorales', value: record.intraoral_findings },
            { label: 'Hallazgos extraorales', value: record.extraoral_findings },
            { label: 'Diagnóstico', value: record.diagnosis, bold: true },
            { label: 'Tratamiento realizado', value: record.treatment_performed, bold: true },
            { label: 'Plan de tratamiento', value: record.treatment_plan },
            { label: 'Medicamentos recetados', value: record.medications_prescribed },
            { label: 'Instrucciones', value: record.next_visit_instructions },
            { label: 'Notas', value: record.notes },
          ].filter(f => f.value).map((f, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{f.label}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--gray-700)', fontWeight: f.bold ? 500 : 400 }}>{f.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function ClinicalHistory() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { isDentist } = useAuth();
  const [patient, setPatient] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ patient: p }, { records: r }] = await Promise.all([
        patientsApi.get(patientId),
        clinicalApi.list(patientId)
      ]);
      setPatient(p);
      setRecords(r || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const filtered = records.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.chief_complaint?.toLowerCase().includes(q) ||
      r.diagnosis?.toLowerCase().includes(q) ||
      r.treatment_performed?.toLowerCase().includes(q);
  });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>;

  return (
    <div className="animate-fadein">
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => navigate(`/patients/${patientId}`)} className="btn btn-ghost btn-sm">
          ← Volver al paciente
        </button>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Historia Clínica</h1>
          <p className="page-subtitle">
            {patient?.first_name} {patient?.last_name} · {patient?.patient_number} · {records.length} registro{records.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isDentist && (
          <button onClick={() => setShowNew(true)} className="btn btn-primary">+ Nueva consulta</button>
        )}
      </div>

      {/* Patient summary */}
      <div className="card" style={{ marginBottom: 16, background: 'var(--blue-light)', border: '1px solid var(--blue-mid)' }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--gray-700)' }}>
          <span><strong>Paciente:</strong> {patient?.first_name} {patient?.last_name}</span>
          <span><strong>N°:</strong> {patient?.patient_number}</span>
          {patient?.date_of_birth && <span><strong>Edad:</strong> {Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 3600 * 1000))} años</span>}
          {patient?.blood_type && <span style={{ color: 'var(--red)', fontWeight: 600 }}>🩸 {patient.blood_type}</span>}
        </div>
      </div>

      {/* Search */}
      {records.length > 3 && (
        <div className="search-bar" style={{ marginBottom: 16 }}>
          <span className="search-icon">🔍</span>
          <input className="form-input" placeholder="Buscar en historia clínica..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {/* Records */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">{search ? 'Sin resultados' : 'Sin registros clínicos'}</div>
            {!search && isDentist && (
              <button onClick={() => setShowNew(true)} className="btn btn-primary" style={{ marginTop: 16 }}>
                Agregar primera consulta
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(r => (
            <RecordCard
              key={r.id}
              record={r}
              expanded={expanded === r.id}
              onExpand={() => setExpanded(expanded === r.id ? null : r.id)}
            />
          ))}
        </div>
      )}

      {showNew && (
        <NewRecordModal
          patientId={patientId}
          onClose={() => setShowNew(false)}
          onCreated={(record) => { setRecords(prev => [record, ...prev]); setShowNew(false); setExpanded(record.id); }}
        />
      )}
    </div>
  );
}
