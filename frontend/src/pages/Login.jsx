import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ email: '', password: '', full_name: '', clinic_name: '', license_number: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Nombre, correo y contraseña son obligatorios');
      return;
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      await authApi.register({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        clinic_name: form.clinic_name,
        license_number: form.license_number,
      });
      setSuccess('Cuenta creada exitosamente. Ya puedes iniciar sesión.');
      setMode('login');
      setForm(p => ({ ...p, password: '', full_name: '', clinic_name: '', license_number: '' }));
    } catch (err) {
      setError(err.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #0f1f3d 0%, #185fa5 50%, #1a9e75 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background decorations */}
      <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
      <div style={{ position: 'absolute', bottom: '-80px', left: '-80px', width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

      {/* Left panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'white' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: '5rem', marginBottom: 16 }}>🦷</div>
          <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: 8, lineHeight: 1 }}>PulpApp</h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.8, marginBottom: 32 }}>
            Sistema de Gestión Odontológica
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: '👥', text: 'Gestión completa de pacientes' },
              { icon: '🦷', text: 'Odontograma interactivo' },
              { icon: '📅', text: 'Agenda de citas' },
              { icon: '💳', text: 'Facturación integrada' },
              { icon: '🤖', text: 'Asistente IA dental (PulpIA)' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: 0.85 }}>
                <span style={{ fontSize: '1.2rem' }}>{f.icon}</span>
                <span style={{ fontSize: '0.95rem' }}>{f.text}</span>
              </div>
            ))}
          </div>
          {mode === 'register' && (
            <div style={{ marginTop: 32, background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 20px', fontSize: '0.85rem', opacity: 0.9, lineHeight: 1.6 }}>
              🎁 <strong>30 días gratis</strong><br />
              Sin tarjeta de crédito. Acceso completo a todas las funciones durante tu período de prueba.
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width: 440, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)', overflowY: 'auto' }}>
        <div style={{ width: '100%' }}>

          {/* Tabs login/registro */}
          <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 10, padding: 4, marginBottom: 28, gap: 4 }}>
            {[['login', 'Iniciar sesión'], ['register', 'Crear cuenta']].map(([m, l]) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', transition: 'all 0.18s', background: mode === m ? 'white' : 'transparent', color: mode === m ? 'var(--gray-800)' : 'var(--gray-500)', boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}
              >
                {l}
              </button>
            ))}
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠ {error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>✓ {success}</div>}

          {/* ── LOGIN ──────────────────────────────────────── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 24, textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gray-800)', marginBottom: 4 }}>Bienvenido</h2>
                <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>Ingresa tus credenciales para continuar</p>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label required">Correo electrónico</label>
                <input type="email" className="form-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="usuario@clinica.com" autoComplete="email" required />
              </div>

              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label required">Contraseña</label>
                <input type="password" className="form-input" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full" style={{ justifyContent: 'center', fontSize: '1rem' }}>
                {loading ? <><div className="spinner-sm" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />Iniciando sesión...</> : 'Iniciar sesión'}
              </button>

              <p style={{ marginTop: 20, textAlign: 'center', fontSize: '0.82rem', color: 'var(--gray-400)' }}>
                ¿No tienes cuenta?{' '}
                <button type="button" onClick={() => setMode('register')} style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>
                  Regístrate gratis
                </button>
              </p>
            </form>
          )}

          {/* ── REGISTRO ────────────────────────────────────── */}
          {mode === 'register' && (
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: 20, textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-800)', marginBottom: 4 }}>Crear cuenta</h2>
                <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>30 días de prueba gratuita — sin tarjeta</p>
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label required">Nombre completo</label>
                <input type="text" className="form-input" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Dr. Juan Pérez" required />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label required">Correo electrónico</label>
                <input type="email" className="form-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="doctor@consultorio.com" autoComplete="email" required />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label required">Contraseña</label>
                <input type="password" className="form-input" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Mínimo 6 caracteres" autoComplete="new-password" required />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">
                  Nombre del consultorio
                  <span style={{ marginLeft: 6, fontSize: '0.72rem', color: 'var(--gray-400)', fontWeight: 400 }}>opcional</span>
                </label>
                <input type="text" className="form-input" value={form.clinic_name} onChange={e => set('clinic_name', e.target.value)} placeholder="Consultorio Dental Sonrisa" />
              </div>

              <div className="form-group" style={{ marginBottom: 22 }}>
                <label className="form-label">
                  N° de registro profesional
                  <span style={{ marginLeft: 6, fontSize: '0.72rem', color: 'var(--gray-400)', fontWeight: 400 }}>opcional</span>
                </label>
                <input type="text" className="form-input" value={form.license_number} onChange={e => set('license_number', e.target.value)} placeholder="Ej: RCOD-12345" />
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full" style={{ justifyContent: 'center', fontSize: '1rem' }}>
                {loading ? <><div className="spinner-sm" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />Creando cuenta...</> : '🚀 Crear cuenta gratis'}
              </button>

              <p style={{ marginTop: 12, textAlign: 'center', fontSize: '0.75rem', color: 'var(--gray-400)', lineHeight: 1.5 }}>
                Al registrarte aceptas los términos de uso de PulpApp.<br />
                Después del período de prueba, contacta al administrador para continuar.
              </p>
            </form>
          )}

          <p style={{ marginTop: 24, textAlign: 'center', fontSize: '0.72rem', color: 'var(--gray-300)' }}>
            © 2024 PulpApp — Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
