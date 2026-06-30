import React, { useState, useEffect, useRef } from 'react';
import { evolutionApi } from '../services/api';
import SignatureCanvas from './SignatureCanvas';

const SURFACE_OPTIONS = [
  { value: '', label: '— Ninguna' },
  { value: 'O', label: 'O — Oclusal' },
  { value: 'M', label: 'M — Mesial' },
  { value: 'D', label: 'D — Distal' },
  { value: 'B', label: 'B — Bucal' },
  { value: 'L', label: 'L — Lingual/Palatino' },
  { value: 'V', label: 'V — Vestibular' },
  { value: 'MO', label: 'MO' },
  { value: 'DO', label: 'DO' },
  { value: 'MOD', label: 'MOD' },
  { value: 'BD', label: 'BD' },
  { value: 'MV', label: 'MV' },
];

const EMPTY_FORM = {
  visit_date: new Date().toISOString().slice(0, 10),
  tooth_number: '',
  tooth_surface: '',
  procedure_performed: '',
  abono: '',
  saldo: '',
  clinical_observations: '',
  materials_used: '',
  next_appointment_plan: '',
  photo_base64: null,
};

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function fmtMoney(val) {
  if (val === null || val === undefined || val === '') return '—';
  return Number(val).toLocaleString('es-CO');
}

function SignatureOverlay({ evo, onSave, onClose }) {
  const handleSave = async (dataUrl) => {
    try {
      await evolutionApi.update(evo.id, { firma_url: dataUrl });
      onSave(evo.id, dataUrl);
    } catch (e) {
      alert('Error al guardar firma: ' + e.message);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 500, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>✍ Firma del tratamiento</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--gray-400)', lineHeight: 1 }}>×</button>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginBottom: 16, background: 'var(--gray-50)', padding: '8px 12px', borderRadius: 6 }}>
          <strong>{evo.procedure_performed}</strong> — {fmtDate(evo.visit_date)}
          {evo.tooth_number && <span style={{ marginLeft: 8, color: 'var(--blue)' }}>· Diente {evo.tooth_number}</span>}
        </p>
        <SignatureCanvas onSave={handleSave} existingSignature={evo.firma_url} />
      </div>
    </div>
  );
}

function PhotoModal({ url, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <img src={url} alt="Foto clínica" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()} />
      <button onClick={onClose} style={{ position: 'fixed', top: 16, right: 20, background: 'none', border: 'none', color: '#fff', fontSize: '2rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
    </div>
  );
}

function EvolutionModal({ patientId, editing, onClose, onSaved }) {
  const [form, setForm] = useState(editing ? {
    visit_date: editing.visit_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    tooth_number: editing.tooth_number || '',
    tooth_surface: editing.tooth_surface || '',
    procedure_performed: editing.procedure_performed || '',
    abono: editing.abono ?? '',
    saldo: editing.saldo ?? '',
    clinical_observations: editing.clinical_observations || '',
    materials_used: editing.materials_used || '',
    next_appointment_plan: editing.next_appointment_plan || '',
    photo_base64: null,
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(editing?.photo_url || null);
  const fileRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('La foto no puede superar 5 MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => { set('photo_base64', ev.target.result); setPhotoPreview(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!form.procedure_performed.trim()) { alert('El tratamiento ejecutado es requerido'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.abono !== '' && payload.abono !== null) payload.abono = Number(payload.abono);
      else delete payload.abono;
      if (payload.saldo !== '' && payload.saldo !== null) payload.saldo = Number(payload.saldo);
      else delete payload.saldo;
      if (!payload.photo_base64) delete payload.photo_base64;

      if (editing) {
        const { evolution } = await evolutionApi.update(editing.id, payload);
        onSaved(evolution, 'update');
      } else {
        const { evolution } = await evolutionApi.create({ patient_id: patientId, ...payload });
        onSaved(evolution, 'create');
      }
      onClose();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680, boxShadow: '0 24px 64px rgba(0,0,0,0.15)', marginTop: 20 }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--gray-800)' }}>
            {editing ? '✏ Editar entrada' : '+ Nueva entrada de tratamiento'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--gray-400)', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Fecha + Diente + Superficie */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label required">Fecha</label>
              <input type="date" className="form-input" value={form.visit_date} onChange={e => set('visit_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Diente</label>
              <input type="text" className="form-input" placeholder="Ej: 14, 21" maxLength={4} value={form.tooth_number} onChange={e => set('tooth_number', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Sup (superficie)</label>
              <select className="form-select" value={form.tooth_surface} onChange={e => set('tooth_surface', e.target.value)}>
                {SURFACE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Tratamiento */}
          <div className="form-group">
            <label className="form-label required">Tratamiento ejecutado</label>
            <input type="text" className="form-input" placeholder="Ej: Resina compuesta clase II, Extracción dental..." value={form.procedure_performed} onChange={e => set('procedure_performed', e.target.value)} />
          </div>

          {/* Abono + Saldo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Abono</label>
              <input type="number" min="0" step="any" className="form-input" placeholder="0" value={form.abono} onChange={e => set('abono', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Saldo</label>
              <input type="number" min="0" step="any" className="form-input" placeholder="0" value={form.saldo} onChange={e => set('saldo', e.target.value)} />
            </div>
          </div>

          {/* Observaciones clínicas */}
          <div className="form-group">
            <label className="form-label">Observaciones clínicas</label>
            <textarea className="form-textarea" rows={2} placeholder="Hallazgos, evolución del tratamiento, estado del paciente..." value={form.clinical_observations} onChange={e => set('clinical_observations', e.target.value)} />
          </div>

          {/* Materiales */}
          <div className="form-group">
            <label className="form-label">Materiales utilizados</label>
            <input type="text" className="form-input" placeholder="Ej: Lidocaína 2%, Resina Z350, Ácido grabador..." value={form.materials_used} onChange={e => set('materials_used', e.target.value)} />
            <span style={{ fontSize: '0.74rem', color: 'var(--gray-400)', marginTop: 3, display: 'block' }}>Separar con comas</span>
          </div>

          {/* Plan próxima cita */}
          <div className="form-group">
            <label className="form-label">Plan próxima cita</label>
            <textarea className="form-textarea" rows={2} placeholder="Ej: Control en 7 días, continuar endodoncia, colocar corona..." value={form.next_appointment_plan} onChange={e => set('next_appointment_plan', e.target.value)} />
          </div>

          {/* Foto */}
          <div className="form-group">
            <label className="form-label">Foto clínica (opcional)</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div
                onClick={() => fileRef.current.click()}
                style={{ border: '2px dashed var(--gray-200)', borderRadius: 10, padding: '12px 20px', cursor: 'pointer', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.85rem', flex: photoPreview ? 0 : 1, minWidth: 120, transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--gray-200)'}
              >
                <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>📷</div>
                {photoPreview ? 'Cambiar' : 'Subir foto'}
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhoto} />
              </div>
              {photoPreview && (
                <div style={{ position: 'relative' }}>
                  <img src={photoPreview} alt="preview" style={{ height: 80, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--gray-200)' }} />
                  <button
                    onClick={() => { setPhotoPreview(null); set('photo_base64', null); if (fileRef.current) fileRef.current.value = ''; }}
                    style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >×</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} className="btn btn-outline">Cancelar</button>
          <button onClick={submit} disabled={saving} className="btn btn-primary">
            {saving ? 'Guardando...' : editing ? '✓ Guardar cambios' : '+ Registrar entrada'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EvolutionTimeline({ patientId }) {
  const [evolutions, setEvolutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [signingId, setSigningId] = useState(null);
  const [photoOpen, setPhotoOpen] = useState(null);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    evolutionApi.list(patientId)
      .then(({ evolutions: data }) => setEvolutions(data || []))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, [patientId]);

  const handleSaved = (evo, mode) => {
    if (mode === 'create') setEvolutions(prev => [...prev, evo]);
    else setEvolutions(prev => prev.map(e => e.id === evo.id ? { ...e, ...evo } : e));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta entrada de tratamiento?')) return;
    try {
      await evolutionApi.delete(id);
      setEvolutions(prev => prev.filter(e => e.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (e) { alert(e.message); }
  };

  const handleSignSave = (id, dataUrl) => {
    setEvolutions(prev => prev.map(e => e.id === id ? { ...e, firma_url: dataUrl } : e));
    setSigningId(null);
  };

  const openNew = () => { setEditing(null); setShowModal(true); };
  const openEdit = (evo) => { setEditing(evo); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  // Ordenar cronológico: más antigua primero (bitácora)
  const sorted = [...evolutions].sort((a, b) => new Date(a.visit_date) - new Date(b.visit_date));
  const signingEvo = signingId ? evolutions.find(e => e.id === signingId) : null;

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>;

  return (
    <div className="animate-fadein">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontWeight: 800, color: 'var(--gray-800)', fontSize: '1.05rem', marginBottom: 2 }}>
            Curso de tratamiento
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>
            {evolutions.length === 0 ? 'Sin registros' : `${evolutions.length} entrada${evolutions.length !== 1 ? 's' : ''} · orden cronológico`}
          </p>
        </div>
        <button onClick={openNew} className="btn btn-primary btn-sm">+ Nueva entrada</button>
      </div>

      {/* Tabla bitácora */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: 720 }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #f0fdf9 0%, #eff6ff 100%)', borderBottom: '2px solid var(--gray-200)' }}>
                {[
                  { label: 'Fecha', align: 'left' },
                  { label: 'Diente', align: 'center' },
                  { label: 'Sup', align: 'center' },
                  { label: 'Tratamiento ejecutado', align: 'left' },
                  { label: 'Abono', align: 'right' },
                  { label: 'Saldo', align: 'right' },
                  { label: 'Firma', align: 'center' },
                  { label: '', align: 'center' },
                ].map((h, i) => (
                  <th key={i} style={{ padding: '10px 14px', textAlign: h.align, fontWeight: 700, color: 'var(--gray-600)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--gray-400)' }}>
                    <div style={{ fontSize: '2.2rem', marginBottom: 10 }}>📋</div>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Sin entradas de tratamiento</div>
                    <p style={{ fontSize: '0.82rem', marginBottom: 20, color: 'var(--gray-400)' }}>Registra el curso de tratamiento de cada visita</p>
                    <button onClick={openNew} className="btn btn-primary btn-sm">Registrar primera entrada</button>
                  </td>
                </tr>
              ) : sorted.map((evo, idx) => (
                <React.Fragment key={evo.id}>
                  {/* Fila principal */}
                  <tr
                    onClick={() => setExpandedId(expandedId === evo.id ? null : evo.id)}
                    style={{
                      background: expandedId === evo.id ? '#f0fdf9' : (idx % 2 === 0 ? '#fff' : '#fafafa'),
                      borderBottom: expandedId === evo.id ? 'none' : '1px solid var(--gray-100)',
                      cursor: 'pointer',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { if (expandedId !== evo.id) e.currentTarget.style.background = '#f7fffe'; }}
                    onMouseLeave={e => { if (expandedId !== evo.id) e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'; }}
                  >
                    {/* Fecha */}
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'var(--gray-600)', fontWeight: 500, fontSize: '0.82rem' }}>
                      {fmtDate(evo.visit_date)}
                    </td>

                    {/* Diente */}
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {evo.tooth_number
                        ? <span style={{ fontFamily: 'monospace', background: 'var(--blue-light)', color: 'var(--blue)', padding: '2px 8px', borderRadius: 6, fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{evo.tooth_number}</span>
                        : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                    </td>

                    {/* Sup */}
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {evo.tooth_surface
                        ? <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--gray-700)', background: 'var(--gray-100)', padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>{evo.tooth_surface}</span>
                        : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                    </td>

                    {/* Tratamiento */}
                    <td style={{ padding: '10px 14px', color: 'var(--gray-800)', fontWeight: 500 }}>
                      <div style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {evo.procedure_performed}
                      </div>
                      {evo.dentist?.full_name && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 1 }}>
                          {evo.dentist.full_name}
                        </div>
                      )}
                    </td>

                    {/* Abono */}
                    <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap', color: evo.abono > 0 ? '#16a34a' : 'var(--gray-300)', fontWeight: evo.abono > 0 ? 600 : 400, fontFamily: 'monospace', fontSize: '0.82rem' }}>
                      {evo.abono > 0 ? `$ ${fmtMoney(evo.abono)}` : '—'}
                    </td>

                    {/* Saldo */}
                    <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap', color: evo.saldo > 0 ? '#dc2626' : 'var(--gray-300)', fontWeight: evo.saldo > 0 ? 600 : 400, fontFamily: 'monospace', fontSize: '0.82rem' }}>
                      {evo.saldo > 0 ? `$ ${fmtMoney(evo.saldo)}` : '—'}
                    </td>

                    {/* Firma */}
                    <td style={{ padding: '10px 14px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      {evo.firma_url ? (
                        <button
                          onClick={() => setSigningId(evo.id)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                        >
                          ✅ Firmado
                        </button>
                      ) : (
                        <button
                          onClick={() => setSigningId(evo.id)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--gray-50)', color: 'var(--gray-500)', border: '1px dashed var(--gray-300)', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          ✍ Firmar
                        </button>
                      )}
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '10px 10px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button onClick={() => openEdit(evo)} style={{ padding: '4px 8px', border: '1px solid var(--gray-200)', background: '#fff', borderRadius: 5, cursor: 'pointer', fontSize: '0.75rem', color: 'var(--gray-500)', lineHeight: 1 }}>✏</button>
                        <button onClick={() => handleDelete(evo.id)} style={{ padding: '4px 8px', border: 'none', background: '#fee2e2', borderRadius: 5, cursor: 'pointer', fontSize: '0.75rem', color: '#991b1b', lineHeight: 1 }}>✕</button>
                      </div>
                    </td>
                  </tr>

                  {/* Panel expandido con detalles */}
                  {expandedId === evo.id && (
                    <tr>
                      <td colSpan={8} style={{ padding: 0, background: '#f0fdf9', borderBottom: '2px solid #bbf7d0' }}>
                        <div style={{ padding: '14px 20px 16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                          {evo.clinical_observations && (
                            <div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: 5, letterSpacing: '0.05em' }}>Observaciones clínicas</div>
                              <div style={{ fontSize: '0.84rem', color: 'var(--gray-700)', lineHeight: 1.55, borderLeft: '3px solid var(--green)', paddingLeft: 10 }}>{evo.clinical_observations}</div>
                            </div>
                          )}
                          {evo.materials_used && (
                            <div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: 5, letterSpacing: '0.05em' }}>Materiales</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {evo.materials_used.split(',').map((m, i) => m.trim() && (
                                  <span key={i} style={{ fontSize: '0.75rem', background: 'var(--blue-light)', color: 'var(--blue)', padding: '2px 9px', borderRadius: 999, fontWeight: 500 }}>{m.trim()}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {evo.next_appointment_plan && (
                            <div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: 5, letterSpacing: '0.05em' }}>Plan próxima cita</div>
                              <div style={{ fontSize: '0.84rem', color: '#78350f', background: '#fffbeb', padding: '7px 11px', borderRadius: 6, border: '1px solid #fde68a', lineHeight: 1.5 }}>📅 {evo.next_appointment_plan}</div>
                            </div>
                          )}
                          {evo.photo_url && (
                            <div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: 5, letterSpacing: '0.05em' }}>Foto clínica</div>
                              <img src={evo.photo_url} alt="Foto clínica" onClick={() => setPhotoOpen(evo.photo_url)} style={{ height: 80, borderRadius: 8, cursor: 'zoom-in', objectFit: 'cover', border: '2px solid var(--gray-200)', display: 'block' }} />
                            </div>
                          )}
                          {!evo.clinical_observations && !evo.materials_used && !evo.next_appointment_plan && !evo.photo_url && (
                            <div style={{ color: 'var(--gray-400)', fontSize: '0.82rem', fontStyle: 'italic', gridColumn: '1 / -1' }}>Sin detalles adicionales registrados</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer: botón agregar */}
        {sorted.length > 0 && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--gray-100)', background: '#fafafa', display: 'flex', justifyContent: 'center' }}>
            <button onClick={openNew} className="btn btn-outline btn-sm" style={{ width: '100%', maxWidth: 300 }}>
              + Agregar entrada
            </button>
          </div>
        )}
      </div>

      {/* Modales */}
      {showModal && (
        <EvolutionModal patientId={patientId} editing={editing} onClose={closeModal} onSaved={handleSaved} />
      )}
      {signingEvo && (
        <SignatureOverlay evo={signingEvo} onSave={handleSignSave} onClose={() => setSigningId(null)} />
      )}
      {photoOpen && <PhotoModal url={photoOpen} onClose={() => setPhotoOpen(null)} />}
    </div>
  );
}
