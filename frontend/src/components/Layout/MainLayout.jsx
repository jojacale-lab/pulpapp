import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--gray-50)' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{
        flex: 1,
        marginLeft: 'var(--sidebar-width)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        minWidth: 0
      }}>
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main style={{ flex: 1, padding: '24px', maxWidth: '100%', overflow: 'hidden' }}>
          <Outlet />
        </main>
        <footer style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--gray-100)',
          fontSize: '0.75rem',
          color: 'var(--gray-400)',
          textAlign: 'center',
          background: 'white'
        }}>
          PulpApp v1.0 — Sistema de Gestión Odontológica
        </footer>
      </div>
    </div>
  );
}
