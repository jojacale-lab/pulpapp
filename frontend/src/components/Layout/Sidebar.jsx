import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/patients', label: 'Pacientes', icon: '👥' },
  { path: '/appointments', label: 'Agenda', icon: '📅' },
  { path: '/billing', label: 'Facturación', icon: '💳' },
  { path: '/ai-assistant', label: 'PulpIA', icon: '🤖', badge: 'IA' },
];

const LOGO = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 20px 0' }}>
    <div style={{
      width: 38, height: 38, background: 'var(--green)', borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1.3rem', flexShrink: 0
    }}>🦷</div>
    <div>
      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'white', lineHeight: 1 }}>PulpApp</div>
      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Gestión Dental</div>
    </div>
  </div>
);

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, isAdmin, isOwner } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/login');
  };

  const initials = user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '??';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 40, display: 'none'
          }}
          className="mobile-overlay"
        />
      )}

      <aside style={{
        width: 'var(--sidebar-width)',
        background: 'linear-gradient(180deg, #0f1f3d 0%, #185fa5 100%)',
        height: '100vh',
        position: 'fixed',
        left: 0, top: 0,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        transition: 'transform 0.3s ease',
        overflowY: 'auto',
      }}>
        <LOGO />

        <div style={{ padding: '16px 12px', marginTop: 8 }}>
          {/* User card */}
          <div style={{
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 16
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--green)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.9rem', flexShrink: 0
            }}>{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.full_name}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                {isOwner && '⭐ '}
                {user?.role === 'admin' ? 'Administrador' : user?.role === 'dentist' ? 'Odontólogo' : 'Asistente'}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 8px', marginBottom: 6 }}>
              MENÚ PRINCIPAL
            </div>
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  transition: 'all 0.15s',
                  background: isActive ? 'rgba(26, 158, 117, 0.3)' : 'transparent',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
                  borderLeft: isActive ? '3px solid var(--green)' : '3px solid transparent',
                })}
              >
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span style={{
                    background: 'var(--green)', color: 'white',
                    fontSize: '0.6rem', padding: '1px 5px',
                    borderRadius: 999, fontWeight: 700
                  }}>{item.badge}</span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom section */}
        <div style={{ marginTop: 'auto', padding: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {isOwner && (
            <>
              <NavLink
                to="/admin"
                onClick={onClose}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 8, textDecoration: 'none',
                  fontSize: '0.85rem', fontWeight: 600, marginBottom: 6,
                  background: isActive ? 'rgba(234,179,8,0.25)' : 'rgba(234,179,8,0.1)',
                  color: '#fde68a',
                  border: '1px solid rgba(234,179,8,0.25)',
                })}
              >
                <span>👑</span>
                <span>Panel de Admin</span>
              </NavLink>
              <div style={{
                background: 'rgba(26,158,117,0.2)',
                border: '1px solid rgba(26,158,117,0.4)',
                borderRadius: 8, padding: '8px 12px',
                color: 'var(--green-mid)', fontSize: '0.75rem',
                marginBottom: 8, textAlign: 'center'
              }}>
                ⭐ Acceso Premium Gratuito
              </div>
            </>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px', background: 'rgba(255,255,255,0.05)',
              border: 'none', borderRadius: 8, color: 'rgba(255,255,255,0.55)',
              cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.15s'
            }}
          >
            <span>🚪</span>
            <span>{loggingOut ? 'Cerrando...' : 'Cerrar sesión'}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
