import { useState } from 'react';
import { api } from '../api/client';

export default function MLAdvisor({ healthData }) {
  const [selectedAxe, setSelectedAxe] = useState(null);
  const [showContext, setShowContext] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState({});

  if (!healthData) return null;

  const { axes = {}, summary = {} } = healthData;
  const axesOrder = ['Axe1', 'Axe2', 'Axe3', 'TB1', 'TB2', 'TB3'];
  const status = summary.status || 'OPTIMAL';
  const anomalyCount = summary.active_anomalies || 0;

  const handleFeedback = async (axe, type, probability) => {
    try {
      await api.submitMLFeedback(axe, type, probability);
      setFeedbackStatus(prev => ({
        ...prev,
        [axe]: type === 'validated' ? 'CONFIRMED' : 'FALSE_ALARM'
      }));
    } catch (err) {
      console.error("Failed to submit feedback", err);
    }
  };

  return (
    <div className="ml-advisor">
      <div className="ml-advisor-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
        {/* Left: Status & Actions */}
        <div className="ml-status-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div className="status-label">CURRENT_ML_STATUS</div>
            <div className={`status-value ${anomalyCount > 0 ? 'alert' : ''}`}>
              {status}
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af' }}>
              <span>ACTIVE_ANOMALIES</span>
              <span style={{ color: anomalyCount > 0 ? '#ef4444' : '#00ff41', fontWeight: 700 }}>
                {String(anomalyCount).padStart(2, '0')}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af' }}>
              <span>SEV_CRITICAL</span>
              <span style={{ color: '#00ff41', fontWeight: 700 }}>00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af' }}>
              <span>CONTAINMENT</span>
              <span style={{ color: '#00ff41', fontWeight: 700 }}>STABLE</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af' }}>
              <span>MODEL_LOADED</span>
              <span style={{ color: summary.model_loaded ? '#00ff41' : '#f59e0b', fontWeight: 700 }}>
                {summary.model_loaded ? 'YES' : 'NO'}
              </span>
            </div>
          </div>

          <button 
            onClick={() => setShowContext(!showContext)}
            style={{
              background: showContext ? 'rgba(56,189,248,0.2)' : 'linear-gradient(135deg, rgba(56,189,248,0.1), rgba(129,140,248,0.1))',
              border: '1px solid #38BDF8',
              color: '#38BDF8',
              padding: '10px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: showContext ? '0 0 15px rgba(56,189,248,0.3)' : 'none'
            }}
            onMouseOver={e => e.currentTarget.style.boxShadow = '0 0 15px rgba(56,189,248,0.4)'}
            onMouseOut={e => e.currentTarget.style.boxShadow = showContext ? '0 0 15px rgba(56,189,248,0.3)' : 'none'}
          >
            {showContext ? 'Hide ML Context' : 'Explain ML Context'}
          </button>
        </div>

        {/* Right: Inference */}
        <div className="ml-inference" style={{ position: 'relative' }}>
          <div className="inference-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span className="inference-label" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#38BDF8' }}>◉</span> AI_INFERENCE_ENGINE
            </span>
            <span className="module-tag" style={{ fontSize: '10px', background: 'var(--bg-input, #1E293B)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-secondary)' }}>MODULE_02_RF</span>
          </div>

          {showContext ? (
            <div style={{
              background: 'var(--bg-primary)', border: '1px solid #38BDF8', borderRadius: '8px',
              padding: '16px', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '16px',
              boxShadow: '0 0 20px rgba(56,189,248,0.1)'
            }}>
              <h4 style={{ color: '#38BDF8', margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>System Context & Diagnostics</h4>
              <p style={{ margin: '0 0 8px 0', lineHeight: 1.5 }}>
                The AI inference engine evaluates the operational health of all loading axes by processing real-time telemetry, 
                historical fault rates, and uptime statistics through a Random Forest classification model.
              </p>
              <p style={{ margin: 0, lineHeight: 1.5 }}>
                A risk score below 30% indicates optimal structural stability. <strong style={{ color: 'var(--text-primary)' }}>Click on any axis below</strong> to reveal detailed predictive insights 
                generated by the diagnostics layer.
              </p>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>Primary Vector Analysis</div>
              <div style={{
                background: 'var(--bg-primary)', 
                borderLeft: '3px solid #34D399', borderRadius: '0 8px 8px 0',
                padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px'
              }}>
                Predictive axis-reliability scan over H+48 horizon.<br />
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Pattern match: <span style={{ color: '#34D399' }}>'STABLE_ROTATION_V3'</span> @ 94.2% confidence.</span>
              </div>
            </>
          )}

          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Secondary Indicators (Axes_Health)</span>
            <span style={{ color: '#38BDF8' }}>Click cards for insights & feedback</span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {axesOrder.map(axe => {
              const data = axes[axe] || { probability: 0.05, insight: 'No data', risk_history: [] };
              const isSelected = selectedAxe === axe;
              const isDanger = data.probability > 0.5;
              const isWarning = data.probability > 0.3;
              const color = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#34D399';
              const feedback = feedbackStatus[axe];
              
              return (
                <div 
                  key={axe} 
                  onClick={() => setSelectedAxe(isSelected ? null : axe)}
                  style={{
                    background: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-primary)',
                    border: `1px solid ${isSelected ? color : 'var(--border)'}`,
                    borderRadius: '8px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseOver={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-light)'; }}
                  onMouseOut={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  {/* Subtle background glow for selected items */}
                  {isSelected && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(circle at center, ${color}20 0%, transparent 70%)`, pointerEvents: 'none' }} />}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', position: 'relative' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{axe}</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: color }}>{(data.probability * 100).toFixed(1)}%</span>
                  </div>
                  
                  <div className="risk-bar" style={{ height: '6px', background: 'var(--bg-input, #080C14)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div className="risk-bar-fill" style={{
                      width: `${data.probability * 100}%`,
                      background: color,
                      height: '100%',
                      boxShadow: `0 0 10px ${color}`
                    }} />
                  </div>

                  {/* Sparkline for historical trend */}
                  {data.risk_history && data.risk_history.length > 0 && (
                    <div style={{ height: '16px', width: '100%', margin: '4px 0 8px 0', opacity: 0.7 }}>
                      <svg viewBox="0 0 100 20" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                        <path
                          d={data.risk_history.map((val, idx) => {
                            const x = (idx / (data.risk_history.length - 1)) * 100;
                            const y = 20 - (val * 18 + 1);
                            return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                          }).join(' ')}
                          fill="none"
                          stroke={color}
                          strokeWidth="1.5"
                        />
                        <circle
                          cx="100"
                          cy={20 - (data.risk_history[data.risk_history.length - 1] * 18 + 1)}
                          r="2.5"
                          fill={color}
                        />
                      </svg>
                    </div>
                  )}
                  
                  {isSelected && (
                    <div style={{ 
                      marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border-light)',
                      fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4, position: 'relative'
                    }}>
                      <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>AI Insight:</strong>
                      <span style={{ fontFamily: 'monospace' }}>{data.insight}</span>

                      {/* Human-in-the-loop feedback buttons */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        {feedback ? (
                          <div style={{ 
                            flex: 1, 
                            textAlign: 'center', 
                            padding: '6px', 
                            background: feedback === 'CONFIRMED' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${feedback === 'CONFIRMED' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            color: feedback === 'CONFIRMED' ? '#34d399' : '#ef4444',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '9px',
                            letterSpacing: '1px'
                          }}>
                            {feedback} REGISTERED
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFeedback(axe, 'validated', data.probability);
                              }}
                              style={{
                                flex: 1,
                                background: 'rgba(52, 211, 153, 0.08)',
                                border: '1px solid rgba(52, 211, 153, 0.4)',
                                color: '#34d399',
                                padding: '6px',
                                borderRadius: '4px',
                                fontSize: '9px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={e => e.currentTarget.style.background = 'rgba(52, 211, 153, 0.2)'}
                              onMouseOut={e => e.currentTarget.style.background = 'rgba(52, 211, 153, 0.08)'}
                            >
                              ✔️ VALIDATE
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFeedback(axe, 'false_alarm', data.probability);
                              }}
                              style={{
                                flex: 1,
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                color: '#ef4444',
                                padding: '6px',
                                borderRadius: '4px',
                                fontSize: '9px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                              onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                            >
                              ❌ FALSE ALARM
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="recommendation-box" style={{ 
            marginTop: '20px', background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.2)', 
            borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <div style={{ background: 'rgba(52,211,153,0.1)', padding: '8px', borderRadius: '50%', color: '#34D399', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#34D399', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '2px' }}>Operational Recommendation</div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                {summary.action_plan || "ALLOCATE_PRIORITY_LOTS > AXES_RISK < 20%"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
