import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import '../styles/MainLayout.css';

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="main-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <div className="main-shell glass-panel">
          <header className="shell-topbar">
            <div className="shell-title">
              <span>Adaptive Study Studio</span>
              <h1>Quizly Workspace</h1>
            </div>
            <div className="shell-status">
              <span className="shell-status-dot" aria-hidden="true"></span>
              Live quiz generation active
            </div>
          </header>

          <header className="mobile-header">
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <h1 className="mobile-logo">Quizly Workspace</h1>
            <div className="shell-status">
              <span className="shell-status-dot" aria-hidden="true"></span>
              Live
            </div>
          </header>

          <div className="content-wrapper">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
