import React from 'react';

export default function ConfirmModal({ title, message, onConfirm, onCancel, confirmLabel = 'Sí, eliminar', loading = false }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: 16, padding: '32px 28px',
          maxWidth: 460, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          animation: 'fadeIn 0.15s ease',
        }}
      >
        {/* Ícono */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: '50%',
            background: '#fee2e2', fontSize: '1.6rem',
          }}>🗑️</div>
        </div>

        {/* Título */}
        <h3 style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.15rem', color: '#1e293b', marginBottom: 12 }}>
          {title}
        </h3>

        {/* Mensaje */}
        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6, marginBottom: 28 }}>
          {message}
        </p>

        {/* Botones */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1, padding: '11px', borderRadius: 10,
              border: '1.5px solid #e2e8f0', background: 'white',
              color: '#64748b', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, padding: '11px', borderRadius: 10,
              border: 'none', background: loading ? '#fca5a5' : '#dc2626',
              color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Eliminando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
