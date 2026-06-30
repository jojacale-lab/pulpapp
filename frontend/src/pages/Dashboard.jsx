import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ label, value, icon, color, sub, onClick }) => (
  <div className="stat-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.15s, box-shadow 0.15s' }}
    onMouseEnter={e => onClick && (e.currentTarget.style.transform = 'translateY(-2px)')}
    onMouseLeave={e => onClick && (e.currentTarget.style.transform = '')}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={{ color }}>{value}</div>
        {sub && <div className="stat-change">{sub}</div>}
      </div>
      <div className="stat-icon" style={{ background: color + '18', color }}>
        {icon}
      </div>
    </div>
  </div>
);

const AppointmentRow = ({ apt }) => {
  const time = new Date(apt.start_time).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  const status = {
    scheduled: { label: 'Programada', cls: 'badge-blue' },
    confirmed: { label: 'Confirmada', cls: 'badge-green' },
    completed: { label: 'Completada', cls: 'badge-gray' },
    cancelled: { label: 'Cancelada', cls: 'badge-red' },
    no_show: { label: 'No asistió', cls: 'badge-orange' },
  }[apt.status] || { label: apt.status, cls: 'badge-gray' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--gray-50)' }}>
      <div style={{
        width: 48, textAlign: 'center', flexShrink: 0,
        background: 'var(--green-light)', borderRadius: 8, padding: '6px 4px'
      }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--green)', fontWeight: 700 }}>{time}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--gray-800)' }}>
          {apt.patients?.first_name} {apt.patients?.last_name}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{apt.title}</div>
      </div>
      <span className={`badge ${status.cls}`}>{status.label}</span>
    </div>
  );
};

const RevenueBar = ({ data }) => {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.revenue), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--gray-500)' }}>
            ${d.revenue > 0 ? (d.revenue >= 1000 ? (d.revenue / 1000).toFixed(1) + 'k' : d.revenue) : '0'}
          </div>
          <div style={{
            width: '100%', minHeight: 4,
            height: `${Math.max((d.revenue / max) * 90, 4)}px`,
            background: i === data.length - 1 ? 'var(--green)' : 'var(--green-mid)',
            borderRadius: '4px 4px 0 0',
            transition: 'height 0.5s ease'
          }} />
          <div style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>{d.month}</div>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [todayApts, setTodayApts] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, apts, patients, chart] = await Promise.all([
          dashboardApi.stats(),
          dashboardApi.todayAppointments(),
          dashboardApi.recentPatients(),
          dashboardApi.revenueChart()
        ]);
        setStats(s);
        setTodayApts(apts.appointments || []);
        setRecentPatients(patients.patients || []);
        setChartData(chart.chart || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="animate-fadein">
      {/* Greeting */}
      <div style={{
        background: 'linear-gradient(135deg, var(--green) 0%, var(--blue) 100%)',
        borderRadius: 16, padding: '24px 28px', marginBottom: 24, color: 'white',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', right: -20, top: -20, fontSize: '6rem', opacity: 0.1 }}>🦷</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>
          {greeting}, Dr. {user?.full_name?.split(' ')[0]}
        </h2>
        <p style={{ opacity: 0.85, fontSize: '0.95rem' }}>
          Hoy tienes <strong>{todayApts.length}</strong> cita{todayApts.length !== 1 ? 's' : ''} programada{todayApts.length !== 1 ? 's' : ''}.
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard
          label="Total pacientes"
          value={stats?.total_patients?.toLocaleString() || '—'}
          icon="👥"
          color="var(--blue)"
          onClick={() => navigate('/patients')}
        />
        <StatCard
          label="Citas hoy"
          value={stats?.today_appointments || '0'}
          icon="📅"
          color="var(--green)"
          sub={`${stats?.today_by_status?.completed || 0} completadas`}
          onClick={() => navigate('/appointments')}
        />
        <StatCard
          label="Ingreso del mes"
          value={`$${(stats?.month_revenue || 0).toLocaleString('es', { minimumFractionDigits: 0 })}`}
          icon="💰"
          color="#d97706"
          onClick={() => navigate('/billing')}
        />
        <StatCard
          label="Facturas pendientes"
          value={stats?.pending_invoices || '0'}
          icon="📄"
          color="var(--red)"
          onClick={() => navigate('/billing')}
        />
      </div>

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Today appointments */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>📅 Citas de hoy</h3>
            <button onClick={() => navigate('/appointments')} className="btn btn-outline btn-sm">
              Ver agenda
            </button>
          </div>
          {todayApts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-text">No hay citas para hoy</div>
              <div className="empty-state-sub">¡Buen día de descanso!</div>
            </div>
          ) : (
            <div>
              {todayApts.map(apt => <AppointmentRow key={apt.id} apt={apt} />)}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Revenue chart */}
          <div className="card">
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 16 }}>💰 Ingresos (6 meses)</h3>
            <RevenueBar data={chartData} />
          </div>

          {/* Recent patients */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>👥 Pacientes recientes</h3>
              <button onClick={() => navigate('/patients')} className="btn btn-ghost btn-sm">Ver todos</button>
            </div>
            {recentPatients.map(p => (
              <div key={p.id}
                onClick={() => navigate(`/patients/${p.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--gray-50)', cursor: 'pointer' }}>
                <div className="avatar">
                  {p.first_name[0]}{p.last_name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--gray-800)' }}>
                    {p.first_name} {p.last_name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{p.patient_number}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="card">
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 12 }}>⚡ Acciones rápidas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => navigate('/patients', { state: { openNew: true } })} className="btn btn-primary w-full">
                + Nuevo paciente
              </button>
              <button onClick={() => navigate('/appointments', { state: { openNew: true } })} className="btn btn-blue w-full">
                + Nueva cita
              </button>
              <button onClick={() => navigate('/ai-assistant')} className="btn btn-outline w-full">
                🤖 Abrir PulpIA
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
