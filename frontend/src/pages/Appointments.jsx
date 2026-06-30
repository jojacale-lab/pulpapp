import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { appointmentsApi, patientsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_MAP = {
  scheduled: { label: 'Programada', cls: 'badge-blue', color: '#185fa5' },
  confirmed: { label: 'Confirmada', cls: 'badge-green', color: '#1a9e75' },
  completed: { label: 'Completada', cls: 'badge-gray', color: '#6b7280' },
  cancelled: { label: 'Cancelada', cls: 'badge-red', color: '#ef4444' },
  no_show: { label: 'No asistió', cls: 'badge-orange', color: '#f97316' },
};

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7am to 6pm

function AppointmentModal({ apt, patients, onClose, onSave, user }) {
  const [form, setForm] = useState(apt || {
    patient_id: '', title: '', treatment_type: '',
    start_time: '', end_time: '', status: 'scheduled',
    notes: '', color: '#1a9e75'
  });
  const [search, setSearch] = useState('');
  const [filteredPats, setFilteredPats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!search) { setFilteredPats([]); return; }
    const q = search.toLowerCase();
    setFilteredPats(patients.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.national_id || '').includes(q)
    ).slice(0, 5));
  }, [search, patients]);

  const selectedPatient = patients.find(p => p.id === form.patient_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patient_id || !form.start_time || !form.title) {
      setError('Paciente, título y hora son requeridos'); return;
    }
    setLoading(true);
    try {
      await onSave(form);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay modal-md">
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">📅 {apt ? 'Editar cita' : 'Nueva cita'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>⚠ {error}</div>}

            {/* Patient search */}
            <div className="form-group" style={{ marginBottom: 12, position: 'relative' }}>
              <label className="form-label required">Paciente</label>
              {selectedPatient ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1.5px solid var(--green)', borderRadius: 8, background: 'var(--green-light)' }}>
                  <span style={{ flex: 1, fontWeight: 500, color: 'var(--gray-800)' }}>
                    {selectedPatient.first_name} {selectedPatient.last_name}
                  </span>
                  <button type="button" onClick={() => { set('patient_id', ''); setSearch(''); }} className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }}>✕</button>
                </div>
              ) : (
                <div>
                  <input className="form-input" placeholder="Buscar paciente..." value={search} onChange={e => setSearch(e.target.value)} />
                  {filteredPats.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--gray-200)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 100 }}>
                      {filteredPats.map(p => (
                        <div key={p.id} onClick={() => { set('patient_id', p.id); setSearch(''); }}
                          style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--gray-50)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                          <div style={{ fontWeight: 500 }}>{p.first_name} {p.last_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{p.patient_number} · {p.national_id}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label required">Motivo / Tratamiento</label>
              <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ej: Limpieza dental, Consulta, Extracción..." required />
            </div>

            <div className="form-grid" style={{ marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label required">Inicio</label>
                <input type="datetime-local" className="form-input" value={form.start_time} onChange={e => { set('start_time', e.target.value); if (!form.end_time) set('end_time', new Date(new Date(e.target.value).getTime() + 30 * 60000).toISOString().slice(0, 16)); }} required />
              </div>
              <div className="form-group">
                <label className="form-label required">Fin</label>
                <input type="datetime-local" className="form-input" value={form.end_time} onChange={e => set('end_time', e.target.value)} required />
              </div>
            </div>

            <div className="form-grid" style={{ marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Color</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={form.color || '#1a9e75'} onChange={e => set('color', e.target.value)} style={{ width: 40, height: 36, padding: 2, border: '1.5px solid var(--gray-200)', borderRadius: 6, cursor: 'pointer' }} />
                  {['#1a9e75', '#185fa5', '#d97706', '#ef4444', '#7c3aed'].map(c => (
                    <div key={c} onClick={() => set('color', c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '2px solid var(--gray-800)' : '2px solid transparent' }} />
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notas</label>
              <textarea className="form-textarea" rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Instrucciones, observaciones..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-outline">Cancelar</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Guardando...' : apt ? '✓ Actualizar' : '✓ Crear cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Appointments() {
  const location = useLocation();
  const { user } = useAuth();
  const [view, setView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editApt, setEditApt] = useState(null);
  const [selected, setSelected] = useState(null);

  const getWeekDates = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return Array.from({ length: 7 }, (_, i) => {
      const nd = new Date(monday);
      nd.setDate(monday.getDate() + i);
      return nd;
    });
  };

  const weekDays = getWeekDates(currentDate);
  const startOfWeek = new Date(weekDays[0]); startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(weekDays[6]); endOfWeek.setHours(23, 59, 59, 999);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [apts, pats] = await Promise.all([
        appointmentsApi.list({ start: startOfWeek.toISOString(), end: endOfWeek.toISOString() }),
        patientsApi.list({ limit: 200 })
      ]);
      setAppointments(apts.appointments || []);
      setPatients(pats.patients || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [currentDate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (location.state?.openNew || location.state?.patient) {
      setShowModal(true);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const handleSave = async (form) => {
    if (editApt) {
      await appointmentsApi.update(editApt.id, form);
    } else {
      await appointmentsApi.create(form);
    }
    setShowModal(false);
    setEditApt(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Cancelar esta cita?')) return;
    await appointmentsApi.delete(id);
    setSelected(null);
    load();
  };

  const getAptForSlot = (day, hour) => {
    const dayStr = day.toDateString();
    return appointments.filter(a => {
      const d = new Date(a.start_time);
      return d.toDateString() === dayStr && d.getHours() === hour;
    });
  };

  const today = new Date();

  return (
    <div className="animate-fadein">
      <div className="page-header">
        <div>
          <h1 className="page-title">📅 Agenda</h1>
          <p className="page-subtitle">
            {weekDays[0].toLocaleDateString('es', { month: 'long', day: 'numeric' })} –{' '}
            {weekDays[6].toLocaleDateString('es', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setCurrentDate(today)} className="btn btn-outline btn-sm">Hoy</button>
          <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }} className="btn btn-outline btn-sm">← Anterior</button>
          <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }} className="btn btn-outline btn-sm">Siguiente →</button>
          <button onClick={() => { setEditApt(null); setShowModal(true); }} className="btn btn-primary">+ Nueva cita</button>
        </div>
      </div>

      {/* Status legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_MAP).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--gray-600)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: v.color }} />
            {v.label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)', borderBottom: '2px solid var(--gray-200)', background: 'var(--gray-50)' }}>
          <div style={{ padding: '10px 6px', textAlign: 'center', fontSize: '0.7rem', color: 'var(--gray-400)' }}>Hora</div>
          {weekDays.map((d, i) => {
            const isToday = d.toDateString() === today.toDateString();
            return (
              <div key={i} style={{ padding: '10px 4px', textAlign: 'center', borderLeft: '1px solid var(--gray-200)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', textTransform: 'uppercase' }}>
                  {d.toLocaleDateString('es', { weekday: 'short' })}
                </div>
                <div style={{
                  fontSize: '1.1rem', fontWeight: 700,
                  color: isToday ? 'white' : 'var(--gray-700)',
                  background: isToday ? 'var(--green)' : 'transparent',
                  width: 28, height: 28, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '2px auto 0'
                }}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time slots */}
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : (
            HOURS.map(hour => (
              <div key={hour} style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)', borderBottom: '1px solid var(--gray-100)', minHeight: 60 }}>
                <div style={{ padding: '4px 4px 0', fontSize: '0.7rem', color: 'var(--gray-400)', textAlign: 'right', paddingRight: 8, paddingTop: 6, flexShrink: 0 }}>
                  {hour}:00
                </div>
                {weekDays.map((day, di) => {
                  const slotApts = getAptForSlot(day, hour);
                  return (
                    <div key={di} style={{ borderLeft: '1px solid var(--gray-100)', padding: '2px', minHeight: 60, position: 'relative' }}
                      onDoubleClick={() => {
                        const dt = new Date(day);
                        dt.setHours(hour, 0, 0, 0);
                        const end = new Date(dt.getTime() + 30 * 60000);
                        const toISO = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                        setEditApt(null);
                        setShowModal(true);
                      }}>
                      {slotApts.map(apt => (
                        <div key={apt.id}
                          onClick={() => setSelected(selected?.id === apt.id ? null : apt)}
                          style={{
                            background: apt.color || '#1a9e75',
                            color: 'white', borderRadius: 4, padding: '2px 5px',
                            fontSize: '0.72rem', cursor: 'pointer', marginBottom: 2,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            opacity: ['cancelled', 'no_show'].includes(apt.status) ? 0.5 : 1
                          }}>
                          <div style={{ fontWeight: 600 }}>
                            {new Date(apt.start_time).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })} {apt.patients?.first_name} {apt.patients?.last_name?.[0]}.
                          </div>
                          <div style={{ opacity: 0.85 }}>{apt.title}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Selected appointment detail */}
      {selected && (
        <div className="card" style={{ marginTop: 16, borderLeft: `4px solid ${selected.color || 'var(--green)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-800)' }}>
                {selected.patients?.first_name} {selected.patients?.last_name}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--gray-600)', marginTop: 2 }}>{selected.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 4 }}>
                📅 {new Date(selected.start_time).toLocaleString('es', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                {' → '}{new Date(selected.end_time).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
              </div>
              {selected.notes && <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 4 }}>📝 {selected.notes}</div>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className={`badge ${STATUS_MAP[selected.status]?.cls}`}>{STATUS_MAP[selected.status]?.label}</span>
              <button onClick={() => { setEditApt(selected); setShowModal(true); setSelected(null); }} className="btn btn-outline btn-sm">✏ Editar</button>
              <button onClick={() => handleDelete(selected.id)} className="btn btn-danger btn-sm">✕ Cancelar</button>
              <button onClick={() => setSelected(null)} className="btn btn-ghost btn-sm">✕</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <AppointmentModal
          apt={editApt}
          patients={patients}
          user={user}
          onClose={() => { setShowModal(false); setEditApt(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
