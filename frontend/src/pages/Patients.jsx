import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { patientsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

const GENDERS = { M: 'Masculino', F: 'Femenino', O: 'Otro' };

function NewPatientModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', mobile: '',
    date_of_birth: '', gender: 'M', national_id: '', address: '', city: '',
    occupation: '', blood_type: '', referred_by: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name) { setError('Nombre y apellido son requeridos'); return; }
    setLoading(true);
    try {
      const { patient } = await patientsApi.create(form);
      onCreated(patient);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay modal-lg">
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">👤 Nuevo paciente</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠ {error}</div>}
            <div className="section-title">Datos personales</div>
            <div className="form-grid" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label required">Nombre</label>
                <input className="form-input" value={form.first_name} onChange={e => set('first_name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label required">Apellido</label>
                <input className="form-input" value={form.last_name} onChange={e => set('last_name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Cédula / DNI</label>
                <input className="form-input" value={form.national_id} onChange={e => set('national_id', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha de nacimiento</label>
                <input type="date" className="form-input" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Género</label>
                <select className="form-select" value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="O">Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipo de sangre</label>
                <select className="form-select" value={form.blood_type} onChange={e => set('blood_type', e.target.value)}>
                  <option value="">No especificado</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="section-title">Contacto</div>
            <div className="form-grid" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Correo electrónico</label>
                <input type="email" className="form-input" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Celular</label>
                <input className="form-input" value={form.mobile} onChange={e => set('mobile', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Ciudad</label>
                <input className="form-input" value={form.city} onChange={e => set('city', e.target.value)} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Dirección</label>
                <input className="form-input" value={form.address} onChange={e => set('address', e.target.value)} />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Ocupación</label>
                <input className="form-input" value={form.occupation} onChange={e => set('occupation', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Referido por</label>
                <input className="form-input" value={form.referred_by} onChange={e => set('referred_by', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-outline">Cancelar</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Guardando...' : '✓ Crear paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Patients() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDentist } = useAuth();
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { patients: data, total: t } = await patientsApi.list({ search, page, limit: LIMIT });
      setPatients(data || []);
      setTotal(t || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (location.state?.openNew) { setShowNew(true); window.history.replaceState({}, ''); }
  }, [location.state]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await patientsApi.delete(deleteTarget.id);
      setPatients(prev => prev.filter(p => p.id !== deleteTarget.id));
      setTotal(t => t - 1);
      setDeleteTarget(null);
    } catch (e) { alert(e.message); }
    finally { setDeleting(false); }
  };

  const calcAge = (dob) => {
    if (!dob) return '—';
    return Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 3600 * 1000)) + ' años';
  };

  return (
    <div className="animate-fadein">
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Pacientes</h1>
          <p className="page-subtitle">{total} paciente{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn btn-primary">+ Nuevo paciente</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por nombre, cédula o número de paciente..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" />
          </div>
        ) : patients.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-text">{search ? 'Sin resultados para tu búsqueda' : 'No hay pacientes aún'}</div>
            {!search && <button onClick={() => setShowNew(true)} className="btn btn-primary" style={{ marginTop: 16 }}>Registrar primer paciente</button>}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>N° Paciente</th>
                  <th>Nombre completo</th>
                  <th>Cédula</th>
                  <th>Edad</th>
                  <th>Género</th>
                  <th>Teléfono</th>
                  <th>Ciudad</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.id} onClick={() => navigate(`/patients/${p.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'var(--gray-100)', padding: '2px 6px', borderRadius: 4 }}>
                        {p.patient_number}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar" style={{ width: 30, height: 30, fontSize: '0.75rem' }}>
                          {p.first_name[0]}{p.last_name[0]}
                        </div>
                        <span style={{ fontWeight: 500 }}>{p.first_name} {p.last_name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>{p.national_id || '—'}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>{calcAge(p.date_of_birth)}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>{GENDERS[p.gender] || '—'}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>{p.mobile || p.phone || '—'}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>{p.city || '—'}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <button onClick={() => navigate(`/patients/${p.id}`)} className="btn btn-outline btn-sm">Ver</button>
                        <button onClick={() => navigate(`/appointments`, { state: { patient: p } })} className="btn btn-ghost btn-sm" title="Nueva cita">📅</button>
                        {isDentist && (
                          <button
                            onClick={() => setDeleteTarget(p)}
                            title="Eliminar paciente"
                            style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', fontSize: '0.95rem', lineHeight: 1, transition: 'background 0.15s' }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {total > LIMIT && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 0', borderTop: '1px solid var(--gray-100)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                  Mostrando {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} de {total}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-outline btn-sm">← Anterior</button>
                  <button disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)} className="btn btn-outline btn-sm">Siguiente →</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showNew && (
        <NewPatientModal
          onClose={() => setShowNew(false)}
          onCreated={(patient) => { setShowNew(false); navigate(`/patients/${patient.id}`); }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title={`¿Eliminar a ${deleteTarget.first_name} ${deleteTarget.last_name}?`}
          message={`¿Estás seguro de eliminar a ${deleteTarget.first_name} ${deleteTarget.last_name}? Esta acción eliminará todos sus registros, historia clínica, odontograma y evoluciones permanentemente y no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
