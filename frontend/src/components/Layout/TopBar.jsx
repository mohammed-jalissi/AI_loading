import { useState, useRef, useEffect } from 'react';

const THEME_COLORS = ['#d4ff00', '#D97706', '#AD1457', '#5D4037', '#00BCD4', '#455A64', '#EF9A9A', '#90A4AE'];

export default function TopBar({ activeTab, setActiveTab, tabs, mode, setMode, themeMode, toggleTheme, themeColor, setThemeColor }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <span style={{ cursor: 'pointer', fontSize: 16, color: '#6b7280', flexShrink: 0 }}>◂</span>
        <div className="topbar-tabs" style={{ flex: 1, overflowX: 'auto', scrollbarWidth: 'none', display: 'flex' }}>
          {tabs.map(tab => (
            <button key={tab.id} className={`topbar-tab ${activeTab === tab.id ? 'active' : ''}`}
              style={{ flexShrink: 0, padding: '8px 12px', fontSize: '10px' }}
              onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="topbar-right" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
        
        {/* Color Picker Dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button 
            className="theme-toggle-btn"
            onClick={() => setIsOpen(!isOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span style={{ 
              width: '10px', 
              height: '10px', 
              borderRadius: '50%', 
              backgroundColor: themeColor || '#AD1457',
              display: 'inline-block',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }} />
            <span>PALETTE</span>
          </button>
          
          {isOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '6px',
              background: themeMode === 'light' ? '#ffffff' : '#141414',
              border: `1px solid ${themeMode === 'light' ? '#cbd5e1' : '#2a2a2a'}`,
              borderRadius: '4px',
              padding: '8px',
              display: 'flex',
              gap: '6px',
              zIndex: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}>
              {THEME_COLORS.map(color => (
                <div
                  key={color}
                  onClick={() => {
                    setThemeColor(color);
                    setIsOpen(false);
                  }}
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    cursor: 'pointer',
                    border: themeColor === color ? `2px solid ${themeMode === 'light' ? '#111827' : '#ffffff'}` : '2px solid transparent',
                    boxShadow: themeColor === color ? `0 0 0 1px ${color}` : 'none',
                    opacity: themeColor === color ? 1 : 0.7
                  }}
                  title={color}
                />
              ))}
            </div>
          )}
        </div>

        <button 
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={themeMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          <span className="theme-toggle-icon">
            {themeMode === 'light' ? '🌙' : '☀️'}
          </span>
          {themeMode === 'light' ? 'DARK' : 'LIGHT'}
        </button>

        <div 
          className={`mode-badge ${mode === 'ultra' ? 'ultra' : 'standard'}`}
          onClick={() => setMode(mode === 'ultra' ? 'standard' : 'ultra')}
          style={{ 
            fontSize: '9px', 
            padding: '2px 8px', 
            borderRadius: '10px', 
            cursor: 'pointer',
            border: '1px solid',
            fontWeight: '800',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            background: mode === 'ultra' ? 'var(--accent-yellow)' : 'transparent',
            borderColor: 'var(--accent-yellow)',
            color: mode === 'ultra' ? 'var(--bg-primary)' : 'var(--accent-yellow)'
          }}
        >
          {mode === 'ultra' ? 'ULTRA MODE' : 'STANDARD'}
        </div>
        <span style={{ cursor: 'pointer' }}>🔄</span>
        <span style={{ cursor: 'pointer' }}>🔔</span>
        <span style={{ cursor: 'pointer' }}>⚙️</span>
        <span style={{ color: 'var(--accent-yellow)', fontWeight: 600 }}>DEPLOY</span>
        <span style={{ cursor: 'pointer' }}>⋮</span>
      </div>
    </div>
  );
}

