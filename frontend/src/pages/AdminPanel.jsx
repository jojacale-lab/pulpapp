import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';

const STATUS_CFG = {
  free:     { label: 'Gratuito',    bg: '#dcfce7', color: '#166534' },
  active:   { label: 'Activo',      bg: '#dbeafe', color: '#1e40af' },
  trial:    { label: 'Prueba',      bg: '#fef3c7', color: '#92400e' },
  inactive: { label: 'Inactivo',    bg: '#fee2e2', color: '#991b1b' },
};

const ROLE_LABELS = { admin: 'Admin', dentist: 'Odontólogo', assistant: 'Asistente' };

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.listUsers()
      .then(({ users: d }) => setUsers(d || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleActive = async (user) => {
    setSaving(user.id);
    try {
      const { user: updated } = await adminApi.updateUser(user.id, { is_active: !user.is_active });
      setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
    } catch (e) { alert(e.message); }
    finally { setSaving(null); }
  };

  const activateSubscription = async (user) => {
    setSaving(user.id);
    try {
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);
      const { user: updated } = await adminApi.updateUser(user.id, {
        subscription_status: 'active',
        subscription_end_date: endDate.toISOString(),
        is_active: true,
      });
      setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
    } catch (e) { alert(e.message); }
    finally { setSaving(null); }
  };

  const revokeSubscription = async (user) => {
    if (!window.confirm(`¿Revocar acceso a ${user.full_name}?`)) return;
    setSaving(user.id);
    try {
      const { user: updated } = await adminApi.updateUser(user.id, {
        subscription_status: 'inactive',
        is_active: false,
      });
      setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
    } catch (e) { alert(e.message); }
    finally { setSaving(null); }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="animate-fadein">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-800)', marginBottom: 4 }}>
          👑 Panel de Administración
        </h1>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
          Gestión de usuarios y suscripciones de PulpApp
        </p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total usuarios',  value: users.length,                                              color: 'var(--blue)' },
          { label: 'Activos',         value: users.filter(u => u.is_active).length,                    color: '#16a34a' },
          { label: 'En prueba',       value: users.filter(u => u.subscription_status === 'trial').length, color: '#d97706' },
          { label: 'Vencidos',        value: users.filter(u => !u.is_active || u.subscription_status === 'inactive').length, color: '#dc2626' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabla de usuarios */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-100)', fontWeight: 700, color: 'var(--gray-700)' }}>
          Usuarios registrados ({users.length})
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                {['Usuario', 'Consultorio', 'Rol', 'Suscripción', 'Vencimiento', 'Estado', 'Acciones'].map((h, i) => (
                  <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-500)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const st = STATUS_CFG[user.subscription_status] || STATUS_CFG.inactive;
                const days = daysLeft(user.subscription_end_date);
                const isOwnerRow = ['jojacale@gmail.com', 'sica2121@gmail.com'].includes(user.email);
                const isBusy = saving === user.id;

                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--gray-100)', background: isOwnerRow ? '#fefce8' : 'white' }}>
                    {/* Usuario */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isOwnerRow && <span title="Dueño del sistema">👑</span>}
                        {user.full_name || '—'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{user.email}</div>
                    </td>

                    {/* Consultorio */}
                    <td style={{ padding: '12px 16px', color: 'var(--gray-600)' }}>
                      {user.clinic_name || <span style={{ color: 'var(--gray-300)' }}>—</span>}
                    </td>

                    {/* Rol */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '0.75rem', background: 'var(--gray-100)', color: 'var(--gray-600)', padding: '3px 8px', borderRadius: 999, fontWeight: 600 }}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>

                    {/* Suscripción */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '0.75rem', background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 999, fontWeight: 600 }}>
                        {st.label}
                      </span>
                    </td>

                    {/* Vencimiento */}
                    <td style={{ padding: '12px 16px', color: 'var(--gray-600)', whiteSpace: 'nowrap' }}>
                      {user.subscription_status === 'free' ? (
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>Sin vencimiento</span>
                      ) : days !== null ? (
                        <span style={{ color: days < 0 ? '#dc2626' : days < 7 ? '#d97706' : 'var(--gray-600)', fontWeight: days < 7 ? 600 : 400 }}>
                          {days < 0 ? `Venció hace ${Math.abs(days)}d` : `${days}d restantes`}
                          <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{fmtDate(user.subscription_end_date)}</div>
                        </span>
                      ) : '—'}
                    </td>

                    {/* Estado activo */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 999, fontWeight: 600, background: user.is_active ? '#dcfce7' : '#fee2e2', color: user.is_active ? '#166534' : '#991b1b' }}>
                        {user.is_active ? '✓ Activo' : '✕ Bloqueado'}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '12px 16px' }}>
                      {isOwnerRow ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Propietario</span>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                          {user.subscription_status !== 'active' && user.subscription_status !== 'free' && (
                            <button
                              onClick={() => activateSubscription(user)}
                              disabled={isBusy}
                              style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: 6, border: 'none', background: '#dbeafe', color: '#1e40af', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                            >
                              {isBusy ? '...' : '✓ Activar'}
                            </button>
                          )}
                          <button
                            onClick={() => toggleActive(user)}
                            disabled={isBusy}
                            style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: 6, border: 'none', background: user.is_active ? '#fee2e2' : '#dcfce7', color: user.is_active ? '#991b1b' : '#166534', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                          >
                            {isBusy ? '...' : user.is_active ? 'Bloquear' : 'Desbloquear'}
                          </button>
                          {user.is_active && (
                            <button
                              onClick={() => revokeSubscription(user)}
                              disabled={isBusy}
                              style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: 6, border: 'none', background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                            >
                              {isBusy ? '...' : 'Revocar'}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
