import { useMemo, useState } from 'react';

const QUAIS = ['1N', '1BIS', '1TER', '2N', '2BIS', '2TER'];

const STATUS_STYLE = {
  CHARGEMENT:   { bg: '#16a34a', color: '#fff',     label: 'Chargement' },
  ACC_PREP:     { bg: '#ca8a04', color: '#000',     label: 'Accostage / Prép' },
  REACCOSTAGE:  { bg: '#eab308', color: '#000',     label: 'Ré-accostage' },
  ATTENTE_AXE:  { bg: '#d4d48a', color: '#444',     label: 'Attente Axe' },
  ATTENTE_QUAI: { bg: '#92400e', color: '#fff',     label: 'Attente Quai' },
  FINITION:     { bg: '#ea580c', color: '#fff',     label: 'Finition' },
  CTE_FC:       { bg: '#2563eb', color: '#fff',     label: 'CTE & FC' },
  RADE:         { bg: '#374151', color: '#9ca3af',  label: 'En Rade', striped: true },
  ACHEVE:       { bg: '#6366f1', color: '#fff',     label: 'Achevé' },
  IDLE:         { bg: '#1a1a1a', color: '#333',     label: '' },
  LIBRE:        { bg: 'transparent', color: 'transparent', label: '' },
  RADE_HIDDEN:  { bg: 'transparent', color: 'transparent', label: '' },
  QUAI_LIBRE:   { bg: '#1e293b', color: '#475569',  label: 'Quai libre' },
  EN_ATTENTE:   { bg: '#fffacd', color: '#888800',  label: 'En attente' },
  STOCK_EPUISE: { bg: '#4a2500', color: '#ff8c00',  label: 'Stock épuisé' },
  EPUISEMENT:   { bg: '#4a2500', color: '#ff8c00',  label: 'Stock épuisé' },
};

const LEGEND_ITEMS = [
  { key: 'CHARGEMENT',   label: 'Chargement' },
  { key: 'ACC_PREP',     label: 'Accostage / Prép' },
  { key: 'ATTENTE_AXE',  label: 'Attente Axe' },
  { key: 'ATTENTE_QUAI', label: 'Attente Quai' },
  { key: 'FINITION',     label: 'Finition' },
  { key: 'CTE_FC',       label: 'CTE & FC' },
  { key: 'REACCOSTAGE',  label: 'Ré-accostage' },
  { key: 'RADE',         label: 'En Rade' },
];

// ── DETAIL POPUP ────────────────────────────────────────────────────
function SegmentPopup({ seg, quai, totalHours, hours, onClose }) {
  if (!seg) return null;

  const style = STATUS_STYLE[seg.status] || STATUS_STYLE.IDLE;
  const startHr = (7 + (hours[seg.start] ?? seg.start)) % 24;
  const endHr   = (7 + (hours[Math.min(seg.end, totalHours) - 1] ?? seg.end)) % 24;
  const durationH = seg.end - seg.start;
  const startPct  = (seg.start / totalHours) * 100;
  const endPct    = (seg.end / totalHours) * 100;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)',
    }} onClick={onClose}>
      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '28px 32px',
          minWidth: '380px',
          maxWidth: '500px',
          fontFamily: "'JetBrains Mono', monospace",
          boxShadow: '0 0 40px rgba(0,0,0,0.9)',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '2px' }}>
              {seg.navire}
            </div>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
              QUAI_{quai} — GRADE: {seg.qualite || '—'}&nbsp;&nbsp;{seg.destination || 'JORF'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: style.striped ? '#374151' : style.bg,
              color: style.color === '#000' ? '#000' : '#fff',
              fontSize: '10px', fontWeight: 700,
              padding: '4px 10px', borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.1)',
              letterSpacing: '1px',
            }}>
              {style.label.toUpperCase()}
            </span>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: '1px solid #444', color: '#888', width: '26px', height: '26px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #2a2a2a', marginBottom: '20px' }} />

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'HEURE DÉBUT', value: `${String(startHr).padStart(2,'0')}:00`, color: '#4ade80' },
            { label: 'HEURE FIN',   value: `${String(endHr).padStart(2,'0')}:00`,   color: '#4ade80' },
            { label: 'DURÉE',       value: `${durationH}H`,                          color: '#facc15' },
            { label: 'TONNAGE DÉCLARÉ', value: seg.td ? `${(seg.td).toLocaleString()} T` : '—', color: '#fb923c' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#111', borderRadius: '6px', padding: '12px 16px' }}>
              <div style={{ fontSize: '9px', color: '#555', letterSpacing: '1px', marginBottom: '6px' }}>{stat.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Timeline position bar */}
        <div style={{ background: '#111', borderRadius: '6px', padding: '12px 16px' }}>
          <div style={{ fontSize: '9px', color: '#555', letterSpacing: '1px', marginBottom: '10px' }}>
            POSITION DANS L'HORIZON DE PLANIFICATION
          </div>
          <div style={{ background: '#0a0a0a', borderRadius: '4px', height: '10px', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute',
              left: `${startPct}%`,
              width: `${endPct - startPct}%`,
              height: '100%',
              background: style.striped ? '#374151' : style.bg,
              borderRadius: '3px',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '9px', color: '#555' }}>
            <span>H+0 (07:00)</span>
            <span>H+{totalHours} (07:00)</span>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── VUE CONTINUE ─────────────────────────────────────────────────────
function ContinuousGantt({ lots, hours }) {
  const totalHours = hours.length;
  const [selectedSeg, setSelectedSeg] = useState(null);
  const [selectedQuai, setSelectedQuai] = useState(null);

  const byQuai = useMemo(() => {
    const map = {};
    QUAIS.forEach(q => { map[q] = []; });
    (lots || []).forEach(s => {
      const q = s.quai || '—';
      if (map[q]) map[q].push(s);
    });
    return map;
  }, [lots]);

  // Build lot lookup by quai/navire
  const lotLookup = useMemo(() => {
    const m = {};
    (lots || []).forEach(s => { m[`${s.quai}__${s.navire}`] = s; });
    return m;
  }, [lots]);

  const buildSegments = (quaiLots) => {
    const segments = [];
    if (!quaiLots.length) return segments;
    for (let i = 0; i < totalHours; i++) {
      const hr = hours[i];
      let activeSt = 'IDLE';
      let activeNavire = '';
      for (const s of quaiLots) {
        const cell = s.timeline?.[String(hr)];
        if (cell && !['IDLE', 'LIBRE', 'RADE_HIDDEN'].includes(cell.status)) {
          activeSt = cell.status;
          activeNavire = s.navire;
          break;
        }
      }
      const last = segments[segments.length - 1];
      if (last && last.status === activeSt && last.navire === activeNavire) {
        last.end = i + 1;
      } else {
        segments.push({ status: activeSt, navire: activeNavire, start: i, end: i + 1 });
      }
    }
    return segments;
  };

  const ticks = useMemo(() => {
    const t = [];
    for (let i = 0; i <= totalHours; i += 2) {
      const hr = (7 + (hours[i] ?? i)) % 24;
      t.push({ idx: i, label: `${String(hr).padStart(2,'0')}:00` });
    }
    return t;
  }, [hours, totalHours]);

  const handleBlockClick = (seg, quai) => {
    if (['IDLE', 'LIBRE', 'RADE_HIDDEN'].includes(seg.status) || !seg.navire) return;
    const lot = lotLookup[`${quai}__${seg.navire}`];
    setSelectedSeg({ ...seg, td: lot?.td, qualite: lot?.qualite, destination: lot?.destination });
    setSelectedQuai(quai);
  };

  return (
    <>
      {selectedSeg && (
        <SegmentPopup
          seg={selectedSeg}
          quai={selectedQuai}
          totalHours={totalHours}
          hours={hours}
          onClose={() => setSelectedSeg(null)}
        />
      )}

      <div style={{
        background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px',
        padding: '20px', fontFamily: "'JetBrains Mono','Courier New',monospace",
        overflowX: 'auto', minWidth: '500px',
      }}>
        {/* Header */}
        <div style={{ color: '#a3e635', fontSize: '12px', fontWeight: 700, marginBottom: '20px', letterSpacing: '1px' }}>
          // VUE_CONTINUE — PLANIFICATION_JOURNALIERE
        </div>

        {/* Ruler */}
        <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '6px' }}>
          <div style={{ width: '116px', flexShrink: 0, fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginRight: '16px' }}>
            INFRASTRUCTURE
          </div>
          <div style={{ flex: 1, position: 'relative', height: '26px', borderBottom: '1px solid #2a2a2a' }}>
            {ticks.map((t, idx) => (
              <div key={idx} style={{
                position: 'absolute', left: `${(t.idx / totalHours) * 100}%`,
                transform: 'translateX(-50%)', fontSize: '9px', color: '#555',
                bottom: '4px', whiteSpace: 'nowrap',
              }}>
                {t.label}
              </div>
            ))}
          </div>
        </div>

        {/* Quai rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          {QUAIS.map(q => {
            const quaiLots = byQuai[q] || [];
            const hasActivity = quaiLots.some(s =>
              hours.some(hr => {
                const st = s.timeline?.[String(hr)]?.status;
                return st && !['IDLE', 'LIBRE', 'RADE_HIDDEN'].includes(st);
              })
            );
            const segments = buildSegments(quaiLots);

            return (
              <div key={q} style={{ display: 'flex', alignItems: 'center', height: '40px' }}>
                {/* Label */}
                <div style={{
                  width: '100px', flexShrink: 0, marginRight: '16px',
                  background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: '4px',
                  color: '#bbb', fontSize: '10px', fontWeight: 700, textAlign: 'center',
                  padding: '11px 0', letterSpacing: '1px',
                }}>
                  QUAI {q}
                </div>

                {/* Timeline bar */}
                <div style={{
                  flex: 1, height: '100%', position: 'relative',
                  background: '#161616', borderRadius: '4px',
                  border: '1px solid #222', overflow: 'hidden',
                }}>
                  {!hasActivity ? (
                    <div style={{
                      width: '100%', height: '100%',
                      background: 'repeating-linear-gradient(90deg,#161616 0px,#161616 18px,#1a1a1a 18px,#1a1a1a 20px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', color: '#2a2a2a',
                    }}>
                      — Quai libre —
                    </div>
                  ) : (
                    segments.map((seg, i) => {
                      const style = STATUS_STYLE[seg.status] || STATUS_STYLE.IDLE;
                      const left  = `${(seg.start / totalHours) * 100}%`;
                      const width = `${((seg.end - seg.start) / totalHours) * 100}%`;
                      const isBlank = ['IDLE', 'LIBRE', 'RADE_HIDDEN'].includes(seg.status);

                      if (isBlank) {
                        return (
                          <div key={i} style={{
                            position: 'absolute', left, width, height: '100%',
                            background: 'repeating-linear-gradient(90deg,#161616 0,#161616 18px,#1a1a1a 18px,#1a1a1a 20px)',
                          }} />
                        );
                      }

                      let label = '';
                      if (seg.status === 'CHARGEMENT')   label = `${seg.navire} — Chargement`;
                      else if (seg.status === 'ACC_PREP') label = `${seg.navire.substring(0,10)} —`;
                      else if (seg.status === 'ATTENTE_QUAI') label = `${seg.navire} — Attente Quai`;
                      else if (seg.status === 'RADE')     label = `${seg.navire} — En Rade`;
                      else if (seg.status === 'FINITION') label = `${seg.navire.substring(0,5)} —`;
                      else label = style.label;

                      return (
                        <div
                          key={i}
                          title={`${seg.navire} · ${style.label} · cliquer pour détails`}
                          onClick={() => handleBlockClick(seg, q)}
                          style={{
                            position: 'absolute', left, width, height: '100%',
                            display: 'flex', alignItems: 'center', padding: '0 6px',
                            fontSize: '10px', fontWeight: 700,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            color: style.color,
                            background: style.striped
                              ? 'repeating-linear-gradient(45deg,#374151,#374151 5px,#4b5563 5px,#4b5563 10px)'
                              : style.bg,
                            borderRight: '1px solid rgba(0,0,0,0.35)',
                            cursor: 'pointer',
                            transition: 'filter 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.2)'; }}
                          onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; }}
                        >
                          {label}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '16px',
          marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #2a2a2a',
        }}>
          {LEGEND_ITEMS.map(item => {
            const s = STATUS_STYLE[item.key];
            return (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#777' }}>
                <div style={{
                  width: '10px', height: '10px', borderRadius: '2px', flexShrink: 0,
                  background: item.key === 'RADE'
                    ? 'repeating-linear-gradient(45deg,#374151,#374151 4px,#4b5563 4px,#4b5563 8px)'
                    : s.bg,
                }} />
                {item.label}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}


// ── CLASSIC TABLE VIEW ──────────────────────────────────────────────
const CELL_BG = {
  IDLE:         { bg: 'var(--gantt-bg-idle,#1A1F2E)', color: 'var(--gantt-color-idle,#3A4050)', label: '' },
  ACC_PREP:     { bg: 'var(--gantt-bg-acc,#FFD700)',  color: 'var(--gantt-color-acc,#333)',     label: 'Accostage & prép.' },
  CHARGEMENT:   { bg: 'var(--gantt-bg-load,#90EE90)', color: 'var(--gantt-color-load,#000)',    label: '__VAL__' },
  FINITION:     { bg: 'var(--gantt-bg-fin,#FF8C00)',  color: 'var(--gantt-color-fin,#FFF)',     label: 'Finition' },
  CTE_FC:       { bg: 'var(--gantt-bg-cte,#4169E1)',  color: 'var(--gantt-color-cte,#FFF)',     label: 'CTE, FC & app.' },
  ATTENTE_AXE:  { bg: 'var(--gantt-bg-wait-axe,#FFFFE0)',  color: 'var(--gantt-color-wait-axe,#666600)',  label: 'Att. axe' },
  ATTENTE_QUAI: { bg: 'var(--gantt-bg-wait-quai,#FFDEAD)', color: 'var(--gantt-color-wait-quai,#884400)', label: 'Att. quai' },
  REACCOSTAGE:  { bg: 'var(--gantt-bg-acc,#FFD700)',  color: 'var(--gantt-color-acc,#333)',     label: 'Ré-accostage' },
  QUAI_LIBRE:   { bg: 'var(--gantt-bg-quai-libre,#1E293B)', color: 'var(--gantt-color-quai-libre,#475569)', label: 'Quai libre' },
  ACHEVE:       { bg: 'var(--gantt-bg-acheve,#D0D0FF)', color: 'var(--gantt-color-acheve,#4444AA)', label: 'Achevé' },
  LIBRE:        { bg: 'transparent', color: 'transparent', label: '' },
  RADE_HIDDEN:  { bg: 'transparent', color: 'transparent', label: '' },
  RADE:         { bg: 'var(--gantt-bg-rade,#374151)', color: 'var(--gantt-color-rade,#94A3B8)', label: 'En rade' },
  EN_ATTENTE:   { bg: 'var(--gantt-bg-en-attente,#FFFACD)', color: 'var(--gantt-color-en-attente,#888800)', label: 'En attente' },
  EPUISEMENT:   { bg: 'var(--gantt-bg-epuisement,#4a2500)', color: 'var(--gantt-color-epuisement,#ff8c00)', label: 'Stock épuisé' },
  STOCK_EPUISE: { bg: 'var(--gantt-bg-epuisement,#4a2500)', color: 'var(--gantt-color-epuisement,#ff8c00)', label: 'Stock épuisé' },
};

function ClassicGantt({ lots, baseLots, hours, posteTotals }) {
  const nCols = hours.length + 1;
  const byQuai = useMemo(() => {
    const map = {};
    QUAIS.forEach(q => { map[q] = []; });
    (lots || []).forEach(s => {
      const q = s.quai || '—';
      if (map[q]) map[q].push(s);
    });
    return map;
  }, [lots]);

  const p1 = posteTotals?.P1 || 0;
  const p2 = posteTotals?.P2 || 0;
  const p3 = posteTotals?.P3 || 0;
  const total = p1 + p2 + p3;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="gantt-table">
        <thead>
          <tr>
            {['QUAI','VESSEL','T_D','GRADE'].map(c => <th key={c}>{c}</th>)}
            {hours.map(hr => (
              <th key={hr} style={{ minWidth: 38 }}>{String((7+hr)%24).padStart(2,'0')}H</th>
            ))}
            <th style={{ minWidth: 38 }}>{String((7+hours[hours.length-1]+1)%24).padStart(2,'0')}H</th>
            {['LOADED','AXE U','AXE P','GRUE','HALL'].map(c => <th key={c}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {QUAIS.map(q => {
            const allQlots = byQuai[q] || [];
            const filteredLots = allQlots.filter(s =>
              hours.some(hr => !['IDLE','LIBRE','RADE_HIDDEN'].includes(s.timeline?.[String(hr)]?.status || 'IDLE'))
            );

            if (filteredLots.length === 0) return [
              <tr key={`${q}-empty`}>
                <td className="quai-cell">{q}</td>
                <td colSpan={3} style={{ background: 'var(--gantt-bg-idle,#1A1F2E)', color: '#475569' }}>—</td>
                <td colSpan={nCols} style={{ background: 'var(--gantt-bg-quai-libre,#1E293B)', color: '#475569', fontSize: '10px', textAlign: 'center' }}>Quai libre</td>
                <td colSpan={5} style={{ background: 'var(--gantt-bg-idle,#1A1F2E)', color: '#475569' }}>—</td>
              </tr>,
              <tr key={`${q}-sep`} className="separator-row"><td colSpan={4+nCols+5}></td></tr>
            ];

            const rows = [];
            filteredLots.forEach((s, si) => {
              const tl = s.timeline || {};
              const isSc = s.scheduled;
              const rowBg = isSc ? 'var(--gantt-row-sc,#0F1623)' : 'var(--gantt-row-unsc,#1A0F0F)';

              if (baseLots?.length) {
                const bl = baseLots.find(b => b.navire === s.navire);
                if (bl) {
                  const btl = bl.timeline || {};
                  rows.push(
                    <tr key={`${q}-${si}-ghost`} style={{ background: '#0A0A0A', opacity: 0.35 }}>
                      <td className="quai-cell" style={{ borderBottom: '1px dashed #444', color: '#888' }}>{bl.quai} (Base)</td>
                      <td className="vessel-cell" style={{ borderBottom: '1px dashed #444', color: '#888' }}>{bl.navire}</td>
                      <td className="td-cell" colSpan={2} style={{ borderBottom: '1px dashed #444', color: '#888', fontSize: '8px' }}>Baseline Timeline</td>
                      {hours.map(hr => {
                        const si2 = CELL_BG[btl[String(hr)]?.status] || CELL_BG.IDLE;
                        return <td key={`g-${hr}`} style={{ background: si2.bg, borderBottom: '1px dashed #444', borderTop: '1px dashed #444' }}></td>;
                      })}
                      <td colSpan={6} style={{ borderBottom: '1px dashed #444' }}></td>
                    </tr>
                  );
                }
              }

              rows.push(
                <tr key={`${q}-${si}`} style={{ background: rowBg }}>
                  <td className="quai-cell">{q}</td>
                  <td className="vessel-cell">{s.navire}</td>
                  <td className="td-cell">{(s.td||0).toLocaleString()}</td>
                  <td className="grade-cell">{s.qualite}</td>
                  {hours.map(hr => {
                    const cell = tl[String(hr)] || { status: 'IDLE', cumul: 0 };
                    const si2 = CELL_BG[cell.status] || CELL_BG.IDLE;
                    const lbl = si2.label === '__VAL__' ? String(cell.cumul||0) : si2.label;
                    return (
                      <td key={hr} style={{
                        background: si2.bg, color: si2.color,
                        fontSize: '9px', fontWeight: cell.status === 'CHARGEMENT' ? 700 : 400,
                        borderRight: ['LIBRE','RADE_HIDDEN'].includes(cell.status) ? '1px dashed #333' : undefined,
                      }}>{lbl}</td>
                    );
                  })}
                  {(() => {
                    const lc = tl[String(hours[hours.length-1])] || { status: 'IDLE', cumul: 0 };
                    const si2 = CELL_BG[lc.status] || CELL_BG.IDLE;
                    return <td style={{ background: si2.bg, color: si2.color, fontSize: '9px' }}>{si2.label === '__VAL__' ? String(lc.cumul||0) : ''}</td>;
                  })()}
                  {(() => {
                    const charged = hours.reduce((sum, hr) => sum + (tl[String(hr)]?.gain||0), 0);
                    return isSc
                      ? <td className={`loaded-cell ${s.stock_warn ? 'warn' : 'ok'}`}>{charged.toLocaleString()} T</td>
                      : <td className="loaded-cell zero">0 T</td>;
                  })()}
                  <td className="info-cell">{isSc ? s.axe : '—'}</td>
                  <td className="info-cell">{isSc ? s.axe_p : '—'}</td>
                  <td className="info-cell">{isSc ? s.portique : '—'}</td>
                  <td className="info-cell">{isSc ? s.hall : '—'}</td>
                </tr>
              );
            });

            rows.push(
              <tr key={`${q}-sep`} className="separator-row"><td colSpan={4+nCols+5}></td></tr>
            );
            return rows;
          })}
          <tr className="postes-row">
            <td colSpan={4} className="postes-label">▸ POSTES</td>
            <td colSpan={nCols} className="postes-values">P1: {p1.toLocaleString()} T | P2: {p2.toLocaleString()} T | P3: {p3.toLocaleString()} T</td>
            <td colSpan={5} className="total-cell">TOTAL :: {total.toLocaleString()} T</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}


// ── MAIN EXPORT ─────────────────────────────────────────────────────
export default function GanttChart({ lots, baseLots, hours, posteTotals, viewMode = 'classique' }) {
  if (viewMode === 'continue') {
    return <ContinuousGantt lots={lots} hours={hours} />;
  }
  return <ClassicGantt lots={lots} baseLots={baseLots} hours={hours} posteTotals={posteTotals} />;
}
