import React, { useMemo, useState } from 'react';
import './ModernGantt.css';

const QUAIS = ['1N', '1BIS', '1TER', '2N', '2BIS', '2TER'];

const STATUS_CONFIG = {
  ACC_PREP:     { label: 'Accostage & Prép', icon: '',  cssKey: 'acc_prep',     badgeBg: '#4a3800', badgeColor: '#FFD700' },
  CHARGEMENT:   { label: 'Chargement',       icon: '',  cssKey: 'chargement',   badgeBg: '#1c4a1c', badgeColor: '#90EE90' },
  FINITION:     { label: 'Finition',         icon: '',  cssKey: 'finition',     badgeBg: '#3a2200', badgeColor: '#FF8C00' },
  CTE_FC:       { label: 'CTE & FC',         icon: '',  cssKey: 'cte_fc',       badgeBg: '#0d1e4a', badgeColor: '#7ca3ff' },
  ATTENTE_AXE:  { label: 'Attente Axe',      icon: '',  cssKey: 'attente_axe',  badgeBg: '#252015', badgeColor: '#FFFFE0' },
  ATTENTE_QUAI: { label: 'Attente Quai',     icon: '',  cssKey: 'attente_quai', badgeBg: '#2a1f0d', badgeColor: '#FFDEAD' },
  REACCOSTAGE:  { label: 'Ré-accostage',     icon: '',  cssKey: 'reaccostage',  badgeBg: '#3a3000', badgeColor: '#FFD700' },
  RADE:         { label: 'En Rade',          icon: '',  cssKey: 'rade',         badgeBg: '#1a1a1a', badgeColor: '#6b6b6b' },
};

const LEGEND_ITEMS = [
  { cssKey: 'chargement',   color: '#90EE90', label: 'Chargement' },
  { cssKey: 'acc_prep',     color: '#FFD700', label: 'Accostage / Prép' },
  { cssKey: 'attente_axe',  color: '#FFFFE0', label: 'Attente Axe' },
  { cssKey: 'attente_quai', color: '#FFDEAD', label: 'Attente Quai' },
  { cssKey: 'finition',     color: '#FF8C00', label: 'Finition' },
  { cssKey: 'cte_fc',       color: '#4169E1', label: 'CTE & FC' },
  { cssKey: 'reaccostage',  color: '#e5c700', label: 'Ré-accostage' },
  { cssKey: 'rade',         color: '#374151', label: 'En Rade' },
];

export default function ModernGantt({ lots, horizon }) {
  const [selectedBlock, setSelectedBlock] = useState(null);
  const hours = useMemo(() => Array.from({ length: horizon }, (_, i) => i), [horizon]);
  const headerHours = useMemo(() => hours.filter(h => h % 2 === 0), [hours]);
  const formatHour = (h) => `${String((7 + h) % 24).padStart(2, '0')}:00`;

  const quaiBlocks = useMemo(() => {
    const map = {};
    QUAIS.forEach(q => (map[q] = []));
    const scheduled = (lots || []).filter(l => l.scheduled && l.quai && l.quai !== '—');
    scheduled.forEach(lot => {
      const q = lot.quai;
      if (!map[q]) return;
      const tl = lot.timeline || {};
      let cur = null;
      for (let i = 0; i < horizon; i++) {
        const cell = tl[String(i)];
        const st = cell?.status || 'IDLE';
        const skip = ['IDLE', 'QUAI_LIBRE', 'ACHEVE', 'EPUISEMENT', 'LIBRE'].includes(st);
        if (skip) {
          if (cur) { map[q].push({ ...cur, end: i }); cur = null; }
          continue;
        }
        if (!cur) {
          cur = { status: st, start: i, vessel: lot.navire, grade: lot.qualite, quai: q, td: lot.td };
        } else if (cur.status !== st || cur.vessel !== lot.navire) {
          map[q].push({ ...cur, end: i });
          cur = { status: st, start: i, vessel: lot.navire, grade: lot.qualite, quai: q, td: lot.td };
        }
      }
      if (cur) map[q].push({ ...cur, end: horizon });
    });
    return map;
  }, [lots, horizon]);

  return (
    <div className="modern-gantt-wrapper">
      <div className="mg-section-title">VUE_CONTINUE — PLANIFICATION_JOURNALIERE</div>

      <div className="modern-gantt-container">
        {/* Header */}
        <div className="modern-gantt-header">
          <div className="mg-col-label">Infrastructure</div>
          <div className="mg-timeline-header">
            {headerHours.map(h => (
              <div key={h} className="mg-time-tick" style={{ left: `${(h / horizon) * 100}%` }}>
                {formatHour(h)}
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        <div className="mg-rows-container">
          {QUAIS.map(quai => {
            const blocks = quaiBlocks[quai] || [];
            const active = blocks.length > 0;
            return (
              <div key={quai} className="mg-row">
                <div className="mg-row-label">
                  <span className="mg-row-label-badge" style={{ opacity: active ? 1 : 0.35 }}>
                    QUAI {quai}
                  </span>
                </div>
                <div className="mg-timeline-track">
                  {headerHours.map(h => (
                    <div key={`g-${h}`} className="mg-grid-line" style={{ left: `${(h / horizon) * 100}%` }} />
                  ))}
                  {!active && <div className="mg-track-empty-label">LIBRE</div>}
                  {blocks.map((b, i) => {
                    const left = (b.start / horizon) * 100;
                    const width = ((b.end - b.start) / horizon) * 100;
                    const cfg = STATUS_CONFIG[b.status] || { label: b.status, icon: '·', cssKey: 'rade' };
                    return (
                      <div
                        key={`${quai}-${i}`}
                        className={`mg-block mg-status-${cfg.cssKey}`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        onClick={() => setSelectedBlock(b)}
                        title={`${b.vessel} · ${cfg.label} · ${b.end - b.start}h`}
                      >
                        <span className="mg-block-icon">{cfg.icon}</span>
                        <span className="mg-block-text">{b.vessel} — {cfg.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mg-legend">
          {LEGEND_ITEMS.map(l => (
            <div key={l.cssKey} className="mg-legend-item">
              <div className="mg-legend-dot" style={{ background: l.color }} />
              <span>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal ── */}
      {selectedBlock && (() => {
        const cfg = STATUS_CONFIG[selectedBlock.status] || STATUS_CONFIG.RADE;
        const durationH = selectedBlock.end - selectedBlock.start;
        const posStart  = (selectedBlock.start / horizon) * 100;
        const posWidth  = (durationH / horizon) * 100;
        return (
          <div className="mg-modal-overlay" onClick={() => setSelectedBlock(null)}>
            <div className="mg-modal-card" onClick={e => e.stopPropagation()}>
              <div className="mg-modal-top">
                <div>
                  <h2 className="mg-modal-vessel-name">{selectedBlock.vessel}</h2>
                  <div className="mg-modal-vessel-sub">
                    QUAI_{selectedBlock.quai} &nbsp;·&nbsp; GRADE: {selectedBlock.grade || 'N/A'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span
                    className="mg-status-badge"
                    style={{ background: cfg.badgeBg, color: cfg.badgeColor }}
                  >
                    {cfg.icon} {cfg.label}
                  </span>
                  <button className="mg-modal-close" onClick={() => setSelectedBlock(null)}>✕</button>
                </div>
              </div>

              <div className="mg-modal-body">
                <div className="mg-stats-grid">
                  <div className="mg-stat-box">
                    <span className="mg-stat-label">Heure Début</span>
                    <span className="mg-stat-value accent">{formatHour(selectedBlock.start)}</span>
                  </div>
                  <div className="mg-stat-box">
                    <span className="mg-stat-label">Heure Fin</span>
                    <span className="mg-stat-value accent">{formatHour(selectedBlock.end)}</span>
                  </div>
                  <div className="mg-stat-box">
                    <span className="mg-stat-label">Durée</span>
                    <span className="mg-stat-value green">{durationH}H</span>
                  </div>
                  <div className="mg-stat-box">
                    <span className="mg-stat-label">Tonnage Déclaré</span>
                    <span className="mg-stat-value orange">
                      {selectedBlock.td ? `${selectedBlock.td.toLocaleString()} T` : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="mg-progress-wrap">
                  <div className="mg-progress-label">Position dans l'Horizon de Planification</div>
                  <div className="mg-progress-track">
                    <div
                      className="mg-progress-fill"
                      style={{
                        marginLeft: `${posStart}%`,
                        width: `${posWidth}%`,
                        background: cfg.badgeColor,
                      }}
                    />
                  </div>
                  <div className="mg-progress-times">
                    <span>H+0 ({formatHour(0)})</span>
                    <span>H+{horizon} ({formatHour(horizon)})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
