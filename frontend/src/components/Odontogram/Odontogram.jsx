import React, { useState, useEffect } from 'react';

// FDI — Adulto
const ADULT_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const ADULT_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

// FDI — Pediátrico (temporales)
const PEDI_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const PEDI_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

const STATUS_CONFIG = {
  healthy:    { color: '#ffffff', border: '#94a3b8', label: 'Sano',      emoji: '✓' },
  caries:     { color: '#fca5a5', border: '#ef4444', label: 'Caries',    emoji: '🔴' },
  filled:     { color: '#d1d5db', border: '#6b7280', label: 'Obturado',  emoji: '⬜' },
  crown:      { color: '#fde68a', border: '#d97706', label: 'Corona',    emoji: '👑' },
  extraction: { color: '#e5e7eb', border: '#374151', label: 'Extracción',emoji: '✖' },
  root_canal: { color: '#bfdbfe', border: '#2563eb', label: 'Endodoncia',emoji: '🔵' },
  bridge:     { color: '#fed7aa', border: '#ea580c', label: 'Puente',    emoji: '🌉' },
  implant:    { color: '#bbf7d0', border: '#16a34a', label: 'Implante',  emoji: '⚙' },
  fracture:   { color: '#fecaca', border: '#dc2626', label: 'Fractura',  emoji: '⚡' },
  abscess:    { color: '#f87171', border: '#b91c1c', label: 'Absceso',   emoji: '🔥' },
  missing:    { color: '#f9fafb', border: '#9ca3af', label: 'Ausente',   emoji: '—' },
  impacted:   { color: '#e9d5ff', border: '#7c3aed', label: 'Retenido',  emoji: '📍' },
  watch:      { color: '#fef3c7', border: '#d97706', label: 'Vigilancia',emoji: '👁' },
};

function toothType(n) {
  // Pediátrico
  if (n >= 51 && n <= 55) { const d = n - 50; return d <= 2 ? 'incisor' : d === 3 ? 'canine' : 'molar'; }
  if (n >= 61 && n <= 65) { const d = n - 60; return d <= 2 ? 'incisor' : d === 3 ? 'canine' : 'molar'; }
  if (n >= 71 && n <= 75) { const d = n - 70; return d <= 2 ? 'incisor' : d === 3 ? 'canine' : 'molar'; }
  if (n >= 81 && n <= 85) { const d = n - 80; return d <= 2 ? 'incisor' : d === 3 ? 'canine' : 'molar'; }
  // Adulto
  const d = n % 10;
  if (d === 1 || d === 2) return 'incisor';
  if (d === 3) return 'canine';
  if (d === 4 || d === 5) return 'premolar';
  return 'molar';
}

function Tooth({ number, data, onClick, isSelected, small = false }) {
  const status = data?.status || 'healthy';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.healthy;
  const type = toothType(number);
  const base = small ? 0.82 : 1;
  const w = Math.round(base * (type === 'molar' ? 36 : type === 'premolar' ? 30 : 26));

  return (
    <div
      onClick={() => onClick(number)}
      className="tooltip-wrapper"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}
    >
      <div style={{ fontSize: small ? '0.55rem' : '0.6rem', color: 'var(--gray-400)', fontWeight: 500 }}>{number}</div>
      <div
        style={{
          width: w, height: w + 4,
          background: cfg.color,
          border: `2px solid ${isSelected ? 'var(--blue)' : cfg.border}`,
          borderRadius: type === 'incisor' ? '6px 6px 4px 4px' : type === 'canine' ? '8px 8px 4px 4px' : '6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.65rem',
          transition: 'all 0.15s',
          boxShadow: isSelected ? '0 0 0 3px rgba(24,95,165,0.3)' : 'none',
        }}
      >
        {status === 'extraction' ? (
          <span style={{ fontSize: '0.9rem', color: '#374151', fontWeight: 800 }}>×</span>
        ) : status === 'missing' ? (
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>—</span>
        ) : (
          <div style={{
            width: '55%', height: '55%',
            background: data?.surface_occlusal && data.surface_occlusal !== 'healthy'
              ? STATUS_CONFIG[data.surface_occlusal]?.color || cfg.color
              : 'rgba(0,0,0,0.07)',
            borderRadius: '3px'
          }} />
        )}
      </div>
      <div className="tooltip-text">{number} — {cfg.label}</div>
    </div>
  );
}

export default function Odontogram({ patientId, teethData = [], onUpdate, readOnly = false }) {
  const [teeth, setTeeth] = useState({});
  const [selected, setSelected] = useState(null);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('adulto'); // 'adulto' | 'pediatrico'

  const upperTeeth = mode === 'adulto' ? ADULT_UPPER : PEDI_UPPER;
  const lowerTeeth = mode === 'adulto' ? ADULT_LOWER : PEDI_LOWER;

  useEffect(() => {
    const map = {};
    teethData.forEach(t => { map[t.tooth_number] = t; });
    setTeeth(map);
  }, [teethData]);

  const handleClick = (num) => {
    if (readOnly) return;
    setSelected(num);
    setEditData(teeth[num] || { tooth_number: num, status: 'healthy', notes: '' });
  };

  const handleSave = async () => {
    if (!onUpdate || !selected) return;
    setSaving(true);
    try {
      await onUpdate(selected, editData);
      setTeeth(prev => ({ ...prev, [selected]: { ...editData, tooth_number: selected } }));
      setSelected(null);
    } catch (e) {
      alert('Error al guardar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const isPediatric = mode === 'pediatrico';

  return (
    <div style={{ fontFamily: 'inherit' }}>
      {/* Toggle Adulto / Pediátrico */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 10, padding: 3, gap: 2 }}>
          <button
            onClick={() => { setMode('adulto'); setSelected(null); }}
            style={{ padding: '6px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.18s',
              background: mode === 'adulto' ? '#fff' : 'transparent',
              color: mode === 'adulto' ? 'var(--gray-800)' : 'var(--gray-500)',
              boxShadow: mode === 'adulto' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            🦷 Adulto (FDI 11–48)
          </button>
          <button
            onClick={() => { setMode('pediatrico'); setSelected(null); }}
            style={{ padding: '6px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.18s',
              background: mode === 'pediatrico' ? '#fff' : 'transparent',
              color: mode === 'pediatrico' ? 'var(--gray-800)' : 'var(--gray-500)',
              boxShadow: mode === 'pediatrico' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            🍼 Pediátrico (FDI 51–85)
          </button>
        </div>
        {isPediatric && (
          <span style={{ fontSize: '0.75rem', color: '#7c3aed', background: '#ede9fe', padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>
            Dentición temporal
          </span>
        )}
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: 'var(--gray-600)' }}>
            <div style={{ width: 12, height: 12, background: cfg.color, border: `1.5px solid ${cfg.border}`, borderRadius: 3 }} />
            {cfg.label}
          </div>
        ))}
      </div>

      {/* Odontograma */}
      <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 12, padding: '16px 12px', overflowX: 'auto' }}>
        {/* Superior */}
        <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Maxilar superior {isPediatric && '(temporal)'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: isPediatric ? 5 : 3, flexWrap: 'nowrap', paddingBottom: 8, borderBottom: '2px dashed var(--gray-300)' }}>
          {upperTeeth.map(n => (
            <Tooth key={n} number={n} data={teeth[n]} onClick={handleClick} isSelected={selected === n} small={isPediatric} />
          ))}
        </div>

        {/* Línea media */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, margin: '4px 0', fontSize: '0.65rem', color: 'var(--gray-400)' }}>
          <span>Derecha</span>
          <div style={{ flex: 1, height: 1, background: 'var(--gray-300)', maxWidth: 80 }} />
          <span style={{ fontWeight: 700 }}>⬆ LÍNEA MEDIA ⬆</span>
          <div style={{ flex: 1, height: 1, background: 'var(--gray-300)', maxWidth: 80 }} />
          <span>Izquierda</span>
        </div>

        {/* Inferior */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: isPediatric ? 5 : 3, flexWrap: 'nowrap', paddingTop: 8, borderTop: '2px dashed var(--gray-300)' }}>
          {lowerTeeth.map(n => (
            <Tooth key={n} number={n} data={teeth[n]} onClick={handleClick} isSelected={selected === n} small={isPediatric} />
          ))}
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 8 }}>
          Maxilar inferior {isPediatric && '(temporal)'}
        </div>
      </div>

      {/* Panel de edición */}
      {selected && !readOnly && editData && (
        <div style={{ marginTop: 16, background: 'white', border: '1.5px solid var(--blue-mid)', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontWeight: 700, color: 'var(--blue)', fontSize: '0.95rem' }}>
              Diente #{selected} {isPediatric && <span style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 600 }}>· temporal</span>}
            </h3>
            <button onClick={() => setSelected(null)} className="btn btn-ghost btn-sm">✕</button>
          </div>

          <div className="form-grid" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label">Estado principal</label>
              <select className="form-select" value={editData.status || 'healthy'} onChange={e => setEditData(p => ({ ...p, status: e.target.value }))}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.emoji} {v.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Superficie oclusal/incisal</label>
              <select className="form-select" value={editData.surface_occlusal || 'healthy'} onChange={e => setEditData(p => ({ ...p, surface_occlusal: e.target.value }))}>
                <option value="healthy">Sana</option>
                <option value="caries">Caries</option>
                <option value="filled">Obturada</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Superficie mesial</label>
              <select className="form-select" value={editData.surface_mesial || 'healthy'} onChange={e => setEditData(p => ({ ...p, surface_mesial: e.target.value }))}>
                <option value="healthy">Sana</option>
                <option value="caries">Caries</option>
                <option value="filled">Obturada</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Superficie distal</label>
              <select className="form-select" value={editData.surface_distal || 'healthy'} onChange={e => setEditData(p => ({ ...p, surface_distal: e.target.value }))}>
                <option value="healthy">Sana</option>
                <option value="caries">Caries</option>
                <option value="filled">Obturada</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Superficie bucal/labial</label>
              <select className="form-select" value={editData.surface_buccal || 'healthy'} onChange={e => setEditData(p => ({ ...p, surface_buccal: e.target.value }))}>
                <option value="healthy">Sana</option>
                <option value="caries">Caries</option>
                <option value="filled">Obturada</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Superficie lingual/palatina</label>
              <select className="form-select" value={editData.surface_lingual || 'healthy'} onChange={e => setEditData(p => ({ ...p, surface_lingual: e.target.value }))}>
                <option value="healthy">Sana</option>
                <option value="caries">Caries</option>
                <option value="filled">Obturada</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Notas del diente</label>
            <textarea className="form-textarea" rows={2} value={editData.notes || ''} onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))} placeholder="Observaciones específicas..." />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setSelected(null)} className="btn btn-outline btn-sm">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm">
              {saving ? 'Guardando...' : '✓ Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
