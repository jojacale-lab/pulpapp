import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PAGE_TITLES = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Resumen del consultorio' },
  '/patients': { title: 'Pacientes', subtitle: 'Gestión de pacientes' },
  '/appointments': { title: 'Agenda', subtitle: 'Gestión de citas' },
  '/billing': { title: 'Facturación', subtitle: 'Facturas y pagos' },
  '/ai-assistant': { title: 'PulpIA', subtitle: 'Asistente con inteligencia artificial' },
};

export default function Header({ onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const pathKey = Object.keys(PAGE_TITLES).find(k => location.pathname.startsWith(k));
  const pageInfo = PAGE_TITLES[pathKey] || { title: 'PulpApp', subtitle: '' };

  const now = new Date();
  const dateStr = now.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <header style={{
      height: 'var(--header-height)',
      background: 'white',
      borderBottom: '1px solid var(--gray-100)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 30,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      <button
        onClick={onMenuClick}
        className="btn btn-ghost btn-icon no-print"
        style={{ display: 'none' }}
        aria-label="Menú"
      >
        ☰
      </button>

      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-800)', lineHeight: 1 }}>
          {pageInfo.title}
        </h1>
        <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 2, lineHeight: 1 }}>
          {pageInfo.subtitle}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ textAlign: 'right', display: 'none' }} className="date-display">
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textTransform: 'capitalize' }}>
            {dateStr}
          </div>
        </div>

        <button
          onClick={() => navigate('/patients', { state: { openNew: true } })}
          className="btn btn-primary btn-sm"
          title="Nuevo paciente"
        >
          + Nuevo paciente
        </button>

        <div
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--green-light)', color: 'var(--green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
            border: '2px solid var(--green-mid)'
          }}
          title={user?.full_name}
        >
          {user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'}
        </div>
      </div>
    </header>
  );
}
