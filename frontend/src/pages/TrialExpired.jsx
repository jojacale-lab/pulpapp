import React from 'react';
import { useAuth } from '../context/AuthContext';

const WA_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '573001234567';
const WA_MSG = encodeURIComponent(
  '¡Hola! Mi período de prueba de PulpApp venció. Me gustaría activar mi suscripción. 🦷'
);

export default function TrialExpired() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f1f3d 0%, #185fa5 50%, #1a9e75 100%)',
      padding: 24,
    }}>
      <div style={{
        background: 'white',
        borderRadius: 20,
        padding: '48px 40px',
        maxWidth: 460,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
      }}>
        {/* Icono */}
        <div style={{ fontSize: '4rem', marginBottom: 16 }}>⏰</div>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', marginBottom: 10 }}>
          Tu período de prueba ha terminado
        </h1>

        {user?.full_name && (
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: 8 }}>
            Hola, <strong>{user.full_name}</strong>.
          </p>
        )}

        <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 32 }}>
          Los 30 días de prueba gratuita de PulpApp han concluido.
          Para seguir gestionando tu consultorio sin interrupciones,
          activa tu suscripción contactándonos directamente.
        </p>

        {/* Botón WhatsApp */}
        <a
          href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            background: '#25d366',
            color: 'white',
            textDecoration: 'none',
            borderRadius: 12,
            padding: '14px 28px',
            fontWeight: 700,
            fontSize: '1rem',
            marginBottom: 16,
            transition: 'opacity 0.15s',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.549 4.099 1.51 5.822L.057 23.082a.75.75 0 0 0 .917.908l5.396-1.425A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.65-.519-5.15-1.42l-.367-.22-3.81 1.006 1.012-3.72-.24-.38A10 10 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
          Contactar por WhatsApp
        </a>

        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '11px',
            background: 'transparent',
            border: '1.5px solid #e2e8f0',
            borderRadius: 10,
            color: '#94a3b8',
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          Cerrar sesión
        </button>

        <p style={{ marginTop: 24, fontSize: '0.75rem', color: '#cbd5e1' }}>
          © PulpApp — Sistema de Gestión Odontológica
        </p>
      </div>
    </div>
  );
}
