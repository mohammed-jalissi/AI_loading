import React, { useState } from 'react';

export default function WeeklyWeather({ forecasts = [] }) {
  const [showTelemetry, setShowTelemetry] = useState(false);

  if (!forecasts || forecasts.length === 0) return null;

  // Group by day
  const daily = {};
  forecasts.forEach(f => {
    const d = new Date(f.datetime);
    const dateStr = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    if (!daily[dateStr]) {
      daily[dateStr] = {
        label: dateStr,
        temp_min: f.temp,
        temp_max: f.temp,
        vent_max: f.vent_kmh,
        pluie_sum: f.pluie_mm,
        descriptions: [f.description],
        icon: f.description.includes('pluie') ? '🌧️' : f.description.includes('nuag') ? '☁️' : '☀️'
      };
    } else {
      daily[dateStr].temp_min = Math.min(daily[dateStr].temp_min, f.temp);
      daily[dateStr].temp_max = Math.max(daily[dateStr].temp_max, f.temp);
      daily[dateStr].vent_max = Math.max(daily[dateStr].vent_max, f.vent_kmh);
      daily[dateStr].pluie_sum += f.pluie_mm;
      daily[dateStr].descriptions.push(f.description);
    }
  });

  const days = Object.values(daily).slice(0, 7);
  
  // Calculate general operation status based on wind
  const maxWindWeek = Math.max(...days.map(d => d.vent_max));
  const isAlert = maxWindWeek >= 50;

  return (
    <div className="weekly-weather" style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '24px',
      marginTop: '24px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #1E293B', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '8px', height: '8px', borderRadius: '50%', 
            background: isAlert ? '#ef4444' : '#38BDF8',
            boxShadow: `0 0 10px ${isAlert ? '#ef4444' : '#38BDF8'}`
          }}></div>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚡ METEO_TELEMETRY <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>// H+120</span>
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ 
            fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '4px',
            background: isAlert ? 'rgba(239, 68, 68, 0.1)' : 'rgba(56, 189, 248, 0.1)',
            color: isAlert ? '#ef4444' : '#38BDF8', border: `1px solid ${isAlert ? 'rgba(239, 68, 68, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`
          }}>
            {isAlert ? 'WARNING: HIGH WINDS' : 'STATUS: CLEAR'}
          </span>
          <span style={{ fontSize: '10px', background: 'var(--bg-input, #1E293B)', padding: '4px 8px', borderRadius: '4px', color: 'var(--text-secondary)', fontWeight: 600 }}>MODULE_03_WX</span>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
        {days.map((day, i) => {
          const isDangerWind = day.vent_max >= 50;
          const isWarningWind = day.vent_max >= 35 && day.vent_max < 50;
          const windColor = isDangerWind ? '#ef4444' : isWarningWind ? '#f59e0b' : '#34D399';
          
          return (
            <div key={i} className="weather-day-card" style={{
              background: 'var(--bg-secondary)',
              border: `1px solid ${isDangerWind ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
              borderRadius: '8px',
              padding: '16px',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.2s',
              cursor: 'pointer'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
            onClick={() => setShowTelemetry(!showTelemetry)}
            >
              {isDangerWind && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#ef4444', boxShadow: '0 0 10px #ef4444' }} />}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {day.label.split(' ')[0]} <span style={{ color: 'var(--text-muted)' }}>{day.label.split(' ')[1]}</span>
                </div>
                <div style={{ fontSize: '20px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>{day.icon}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
                <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>{Math.round(day.temp_max)}°</span>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>/ {Math.round(day.temp_min)}°</span>
              </div>

              {/* Mini Telemetry Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    <span>Wind</span>
                    <span style={{ color: windColor, fontWeight: 700 }}>{Math.round(day.vent_max)} km/h</span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--bg-input, #080C14)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (day.vent_max / 70) * 100)}%`, height: '100%', background: windColor }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    <span>Rain</span>
                    <span style={{ color: '#38BDF8', fontWeight: 700 }}>{day.pluie_sum.toFixed(1)} mm</span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--bg-input, #080C14)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (day.pluie_sum / 20) * 100)}%`, height: '100%', background: '#38BDF8' }} />
                  </div>
                </div>
              </div>

              {showTelemetry && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border-light)', fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.4 }}>
                  Pred: {day.descriptions[0]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Advanced Telemetry Box */}
      {showTelemetry && (
        <div style={{ 
          marginTop: '20px', padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px',
          display: 'flex', gap: '16px', alignItems: 'flex-start'
        }}>
          <div style={{ color: '#38BDF8', background: 'rgba(56,189,248,0.1)', padding: '10px', borderRadius: '8px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#38BDF8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Impact Analysis</div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
              {isAlert 
                ? "Weather patterns indicate structural risks within the H+120 horizon. Winds exceeding operational thresholds (50 km/h) are detected. Scheduler will automatically enforce rade-deferral protocols during high-wind windows."
                : "Weather patterns are stable within the H+120 horizon. No significant wind or precipitation anomalies detected. Port operations can proceed at maximum capacity."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
