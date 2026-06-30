import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { invoicesApi, patientsApi } from '../services/api';

const STATUS_BADGE = {
  pending: 'badge-orange',
  paid: 'badge-green',
  partial: 'badge-blue',
  cancelled: 'badge-gray'
};
const STATUS_LABEL = { pending: 'Pendiente', paid: 'Pagada', partial: 'Parcial', cancelled: 'Cancelada' };

function InvoiceModal({ patients, treatments, onClose, onCreated, initialPatient }) {
  const [patient, setPatient] = useState(initialPatient || null);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: 0, discount: 0, treatment_id: null, tooth_number: '' }]);
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [payMethod, setPayMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!search) { setFiltered([]); return; }
    const q = search.toLowerCase();
    setFiltered(patients.filter(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) || (p.patient_number || '').toLowerCase().includes(q)).slice(0, 5));
  }, [search, patients]);

  const addItem = () => setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, discount: 0, treatment_id: null, tooth_number: '' }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const setItem = (i, k, v) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const selectTreatment = (i, t) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, description: t.name, unit_price: t.default_price, treatment_id: t.id } : it));
  };

  const subtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price) - Number(i.discount || 0), 0);
  const taxAmt = subtotal * (Number(taxRate) / 100);
  const total = subtotal + taxAmt - Number(discount);

  const handleSubmit = async () => {
    if (!patient) { setError('Selecciona un paciente'); return; }
    if (items.some(i => !i.description)) { setError('Todos los items necesitan descripción'); return; }
    setLoading(true);
    try {
      const { invoice } = await invoicesApi.create({
        patient_id: patient.id,
        items, notes, tax_rate: taxRate, discount, payment_method: payMethod
      });
      onCreated(invoice);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay modal-xl">
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">💳 Nueva factura</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon">✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>⚠ {error}</div>}

          {/* Patient */}
          <div className="form-group" style={{ marginBottom: 16, position: 'relative' }}>
            <label className="form-label required">Paciente</label>
            {patient ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1.5px solid var(--green)', borderRadius: 8, background: 'var(--green-light)' }}>
                <span style={{ flex: 1, fontWeight: 500 }}>{patient.first_name} {patient.last_name} · {patient.patient_number}</span>
                <button type="button" onClick={() => { setPatient(null); setSearch(''); }} className="btn btn-ghost btn-sm">✕</button>
              </div>
            ) : (
              <div>
                <input className="form-input" placeholder="Buscar paciente..." value={search} onChange={e => setSearch(e.target.value)} />
                {filtered.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--gray-200)', borderRadius: 8, zIndex: 100, boxShadow: 'var(--shadow-lg)' }}>
                    {filtered.map(p => (
                      <div key={p.id} onClick={() => { setPatient(p); setSearch(''); }}
                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--gray-50)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                        <div style={{ fontWeight: 500 }}>{p.first_name} {p.last_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{p.patient_number}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Items */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="form-label" style={{ margin: 0 }}>Servicios / Tratamientos</label>
              <button type="button" onClick={addItem} className="btn btn-outline btn-sm">+ Agregar</button>
            </div>

            <div style={{ border: '1px solid var(--gray-200)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 80px 80px 32px', gap: 0, background: 'var(--gray-50)', padding: '6px 8px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>
                <span>Descripción</span><span>Tratamiento</span><span>Cant.</span><span>Precio</span><span>Total</span><span></span>
              </div>
              {items.map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 80px 80px 32px', gap: 4, padding: '6px 8px', borderTop: '1px solid var(--gray-100)', alignItems: 'center' }}>
                  <input className="form-input" style={{ padding: '5px 8px', fontSize: '0.85rem' }} value={item.description} onChange={e => setItem(i, 'description', e.target.value)} placeholder="Descripción..." />
                  <select className="form-select" style={{ padding: '5px 8px', fontSize: '0.8rem' }} onChange={e => { const t = treatments.find(t => t.id === e.target.value); if (t) selectTreatment(i, t); }}>
                    <option value="">Catálogo</option>
                    {treatments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <input type="number" className="form-input" style={{ padding: '5px 8px', fontSize: '0.85rem' }} min={1} value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} />
                  <input type="number" className="form-input" style={{ padding: '5px 8px', fontSize: '0.85rem' }} min={0} step="0.01" value={item.unit_price} onChange={e => setItem(i, 'unit_price', e.target.value)} />
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-700)', padding: '0 4px' }}>
                    ${(Number(item.quantity) * Number(item.unit_price)).toFixed(0)}
                  </div>
                  <button type="button" onClick={() => removeItem(i)} className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--red)' }} disabled={items.length === 1}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Totals + notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }}>
            <div className="form-group">
              <label className="form-label">Notas</label>
              <textarea className="form-textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones, términos de pago..." />
              <label className="form-label" style={{ marginTop: 8 }}>Método de pago</label>
              <select className="form-select" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
                <option value="insurance">Seguro</option>
              </select>
            </div>

            <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem', color: 'var(--gray-600)' }}>
                <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--gray-500)' }}>IVA %</span>
                <input type="number" min={0} max={100} step={0.1} value={taxRate} onChange={e => setTaxRate(e.target.value)} style={{ width: 70, padding: '3px 6px', border: '1px solid var(--gray-200)', borderRadius: 4, textAlign: 'right', fontSize: '0.85rem' }} />
              </div>
              {taxAmt > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                  <span>IVA</span><span>${taxAmt.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--gray-500)' }}>Descuento $</span>
                <input type="number" min={0} step={0.01} value={discount} onChange={e => setDiscount(e.target.value)} style={{ width: 70, padding: '3px 6px', border: '1px solid var(--gray-200)', borderRadius: 4, textAlign: 'right', fontSize: '0.85rem' }} />
              </div>
              <div style={{ borderTop: '2px solid var(--gray-200)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.2rem', color: 'var(--gray-800)' }}>
                <span>TOTAL</span><span style={{ color: 'var(--green)' }}>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-outline">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="btn btn-primary">
            {loading ? 'Creando...' : '✓ Crear factura'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PayModal({ invoice, onClose, onPaid }) {
  const balance = Number(invoice.total) - Number(invoice.paid_amount);
  const [amount, setAmount] = useState(balance.toFixed(2));
  const [method, setMethod] = useState('cash');
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const { invoice: updated } = await invoicesApi.pay(invoice.id, { amount: Number(amount), payment_method: method });
      onPaid(updated);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay modal-sm">
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">💵 Registrar pago</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon">✕</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 12, padding: 12, background: 'var(--gray-50)', borderRadius: 8, fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total factura</span><strong>${Number(invoice.total).toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Ya pagado</span><span style={{ color: 'var(--green)' }}>${Number(invoice.paid_amount).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>Saldo</span><span style={{ color: 'var(--red)' }}>${balance.toFixed(2)}</span>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Monto a pagar</label>
            <input type="number" className="form-input" value={amount} onChange={e => setAmount(e.target.value)} min={0.01} max={balance} step={0.01} />
          </div>
          <div className="form-group">
            <label className="form-label">Método de pago</label>
            <select className="form-select" value={method} onChange={e => setMethod(e.target.value)}>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
              <option value="insurance">Seguro</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-outline">Cancelar</button>
          <button onClick={handlePay} disabled={loading} className="btn btn-primary">
            {loading ? '...' : `✓ Registrar $${amount}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Billing() {
  const location = useLocation();
  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState(null);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, ...(statusFilter ? { status: statusFilter } : {}) };
      const [inv, pats, treats] = await Promise.all([
        invoicesApi.list(params),
        patientsApi.list({ limit: 200 }),
        invoicesApi.treatments()
      ]);
      setInvoices(inv.invoices || []);
      setTotal(inv.total || 0);
      setPatients(pats.patients || []);
      setTreatments(treats.treatments || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (location.state?.openNew) { setShowNew(true); window.history.replaceState({}, ''); }
  }, [location.state]);

  const handlePaid = (updated) => {
    setInvoices(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i));
    setPayingInvoice(null);
  };

  const totalPending = invoices.filter(i => ['pending', 'partial'].includes(i.status)).reduce((s, i) => s + Number(i.total) - Number(i.paid_amount), 0);
  const totalMonth = invoices.filter(i => i.status !== 'cancelled').reduce((s, i) => s + Number(i.paid_amount), 0);

  return (
    <div className="animate-fadein">
      <div className="page-header">
        <div>
          <h1 className="page-title">💳 Facturación</h1>
          <p className="page-subtitle">{total} facturas · ${totalMonth.toFixed(0)} cobrado · ${totalPending.toFixed(0)} pendiente</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn btn-primary">+ Nueva factura</button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)', fontWeight: 500 }}>Filtrar:</span>
          {[['', 'Todas'], ['pending', 'Pendientes'], ['partial', 'Parciales'], ['paid', 'Pagadas'], ['cancelled', 'Canceladas']].map(([v, l]) => (
            <button key={v} onClick={() => { setStatusFilter(v); setPage(1); }}
              className="btn btn-sm"
              style={{ background: statusFilter === v ? 'var(--green)' : 'white', color: statusFilter === v ? 'white' : 'var(--gray-600)', border: `1px solid ${statusFilter === v ? 'var(--green)' : 'var(--gray-200)'}` }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : invoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💳</div>
            <div className="empty-state-text">No hay facturas</div>
            <button onClick={() => setShowNew(true)} className="btn btn-primary" style={{ marginTop: 16 }}>Crear primera factura</button>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>N° Factura</th>
                  <th>Paciente</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Pagado</th>
                  <th>Saldo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const balance = Number(inv.total) - Number(inv.paid_amount);
                  return (
                    <tr key={inv.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>{inv.invoice_number}</td>
                      <td style={{ fontWeight: 500 }}>
                        {inv.patients?.first_name} {inv.patients?.last_name}
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{inv.patients?.patient_number}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                        {new Date(inv.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                      </td>
                      <td style={{ fontWeight: 700 }}>${Number(inv.total).toFixed(2)}</td>
                      <td style={{ color: 'var(--green)', fontWeight: 600 }}>${Number(inv.paid_amount).toFixed(2)}</td>
                      <td style={{ color: balance > 0 ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>
                        ${balance.toFixed(2)}
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[inv.status]}`}>{STATUS_LABEL[inv.status]}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {['pending', 'partial'].includes(inv.status) && (
                            <button onClick={() => setPayingInvoice(inv)} className="btn btn-primary btn-sm">💵 Pagar</button>
                          )}
                          <button onClick={() => window.print()} className="btn btn-ghost btn-sm" title="Imprimir">🖨</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {total > LIMIT && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 0', borderTop: '1px solid var(--gray-100)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Página {page}</span>
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
        <InvoiceModal
          patients={patients}
          treatments={treatments}
          initialPatient={location.state?.patient}
          onClose={() => setShowNew(false)}
          onCreated={(inv) => { setInvoices(prev => [inv, ...prev]); setShowNew(false); }}
        />
      )}
      {payingInvoice && (
        <PayModal invoice={payingInvoice} onClose={() => setPayingInvoice(null)} onPaid={handlePaid} />
      )}
    </div>
  );
}
