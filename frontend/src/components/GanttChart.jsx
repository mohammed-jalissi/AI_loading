import { useMemo } from 'react';

const QUAIS = ['1N', '1BIS', '1TER', '2N', '2BIS', '2TER'];

const CELL_BG = {
  IDLE:         { bg: 'var(--gantt-bg-idle, #1A1F2E)', color: 'var(--gantt-color-idle, #3A4050)', label: '' },
  ACC_PREP:     { bg: 'var(--gantt-bg-acc, #FFD700)', color: 'var(--gantt-color-acc, #333)', label: 'Accostage & prép.' },
  CHARGEMENT:   { bg: 'var(--gantt-bg-load, #90EE90)', color: 'var(--gantt-color-load, #000)', label: '__VAL__' },
  FINITION:     { bg: 'var(--gantt-bg-fin, #FF8C00)', color: 'var(--gantt-color-fin, #FFF)', label: 'Finition' },
  CTE_FC:       { bg: 'var(--gantt-bg-cte, #4169E1)', color: 'var(--gantt-color-cte, #FFF)', label: 'CTE, FC & app.' },
  ATTENTE_AXE:  { bg: 'var(--gantt-bg-wait-axe, #FFFFE0)', color: 'var(--gantt-color-wait-axe, #666600)', label: 'Att. axe' },
  ATTENTE_QUAI: { bg: 'var(--gantt-bg-wait-quai, #FFDEAD)', color: 'var(--gantt-color-wait-quai, #884400)', label: 'Att. quai' },
  REACCOSTAGE:  { bg: 'var(--gantt-bg-acc, #FFD700)', color: 'var(--gantt-color-acc, #333)', label: 'Ré-accostage' },
  QUAI_LIBRE:   { bg: 'var(--gantt-bg-quai-libre, #1E293B)', color: 'var(--gantt-color-quai-libre, #475569)', label: 'Quai libre' },
  ACHEVE:       { bg: 'var(--gantt-bg-acheve, #D0D0FF)', color: 'var(--gantt-color-acheve, #4444AA)', label: 'Achevé' },
  LIBRE:        { bg: 'transparent', color: 'transparent', label: '' },
  RADE_HIDDEN:  { bg: 'transparent', color: 'transparent', label: '' },
  RADE:         { bg: 'var(--gantt-bg-rade, #374151)', color: 'var(--gantt-color-rade, #94A3B8)', label: 'En rade' },
  EN_ATTENTE:   { bg: 'var(--gantt-bg-en-attente, #FFFACD)', color: 'var(--gantt-color-en-attente, #888800)', label: 'En attente' },
  EPUISEMENT:   { bg: 'var(--gantt-bg-epuisement, #4a2500)', color: 'var(--gantt-color-epuisement, #ff8c00)', label: 'Stock épuisé' },
  STOCK_EPUISE: { bg: 'var(--gantt-bg-epuisement, #4a2500)', color: 'var(--gantt-color-epuisement, #ff8c00)', label: 'Stock épuisé' },
};

export default function GanttChart({ lots, baseLots, hours, posteTotals, viewMode = 'classique' }) {
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
            {['QUAI','VESSEL','T_D','GRADE'].map(c => (
              <th key={c}>{c}</th>
            ))}
            {hours.map(hr => (
              <th key={hr} style={{ minWidth: 38 }}>
                {String((7 + hr) % 24).padStart(2, '0')}H
              </th>
            ))}
            <th style={{ minWidth: 38 }}>
              {String((7 + hours[hours.length - 1] + 1) % 24).padStart(2, '0')}H
            </th>
            {['LOADED','AXE U','AXE P','GRUE','HALL'].map(c => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {QUAIS.map(q => {
            const allQlots = byQuai[q] || [];
            const filteredLots = allQlots.filter(s => {
              const tl = s.timeline || {};
              return hours.some(hr => {
                const st = tl[String(hr)]?.status || 'IDLE';
                return !['IDLE', 'LIBRE', 'RADE_HIDDEN'].includes(st);
              });
            });

            if (filteredLots.length === 0) {
              return [
                <tr key={`${q}-empty`}>
                  <td className="quai-cell">{q}</td>
                  <td colSpan={3} style={{ background: 'var(--gantt-bg-idle, #1A1F2E)', color: 'var(--gantt-color-idle, #475569)' }}>—</td>
                  <td colSpan={nCols}
                      style={{ background: 'var(--gantt-bg-quai-libre, #1E293B)', color: 'var(--gantt-color-quai-libre, #475569)', fontSize: '10px', textAlign: 'center' }}>
                    Quai libre
                  </td>
                  <td colSpan={5} style={{ background: 'var(--gantt-bg-idle, #1A1F2E)', color: 'var(--gantt-color-idle, #475569)' }}>—</td>
                </tr>,
                <tr key={`${q}-sep`} className="separator-row">
                  <td colSpan={4 + nCols + 5}></td>
                </tr>
              ];
            }

            if (viewMode === 'continue') {
              // VUE CONTINUE: 1 row per quai
              return [
                <tr key={`${q}-cont`} style={{ background: 'var(--gantt-row-sc, #111)' }}>
                  <td className="quai-cell">{q}</td>
                  <td colSpan={3} style={{ fontSize: '9px', color: '#aaa', padding: '4px' }}>
                    {filteredLots.map(s => s.navire).join(' → ')}
                  </td>
                  {hours.map(hr => {
                    let activeSt = 'IDLE';
                    let activeCell = null;
                    let activeS = null;
                    for (const s of filteredLots) {
                      const cell = s.timeline?.[String(hr)];
                      if (cell && cell.status !== 'IDLE' && cell.status !== 'LIBRE' && cell.status !== 'RADE_HIDDEN') {
                        activeSt = cell.status;
                        activeCell = cell;
                        activeS = s;
                        break;
                      }
                    }
                    const style_info = CELL_BG[activeSt] || CELL_BG.IDLE;
                    const lbl = activeSt === 'CHARGEMENT' ? activeS?.navire?.substring(0,3) : style_info.label;
                    return (
                      <td key={hr} style={{
                        background: style_info.bg,
                        color: style_info.color,
                        fontSize: '8px',
                        textAlign: 'center',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap'
                      }} title={activeS ? `${activeS.navire} - ${style_info.label}` : ''}>
                        {lbl}
                      </td>
                    );
                  })}
                  {/* Last column for T+1 */}
                  {(() => {
                    const lastHr = hours[hours.length - 1];
                    let activeSt = 'IDLE';
                    let activeS = null;
                    for (const s of filteredLots) {
                      const cell = s.timeline?.[String(lastHr)];
                      if (cell && cell.status !== 'IDLE' && cell.status !== 'LIBRE' && cell.status !== 'RADE_HIDDEN') {
                        activeSt = cell.status; activeS = s; break;
                      }
                    }
                    const si2 = CELL_BG[activeSt] || CELL_BG.IDLE;
                    return <td style={{ background: si2.bg }} title={activeS ? activeS.navire : ''}></td>;
                  })()}
                  <td colSpan={5} style={{ background: 'var(--gantt-bg-idle, #1A1F2E)', color: 'var(--gantt-color-idle, #475569)', fontSize: '9px', textAlign: 'center' }}>
                    {filteredLots.length} Navires
                  </td>
                </tr>,
                <tr key={`${q}-sep`} className="separator-row"><td colSpan={4 + nCols + 5}></td></tr>
              ];
            }

            // VUE CLASSIQUE: 1 row per lot
            const rows = [];
            filteredLots.forEach((s, si) => {
              const tl = s.timeline || {};
              const isSc = s.scheduled;
              const rowBg = isSc ? 'var(--gantt-row-sc, #0F1623)' : 'var(--gantt-row-unsc, #1A0F0F)';

              if (baseLots && baseLots.length > 0) {
                const baseLot = baseLots.find(bl => bl.navire === s.navire);
                if (baseLot) {
                  const btl = baseLot.timeline || {};
                  rows.push(
                    <tr key={`${q}-${si}-ghost`} style={{ background: 'var(--gantt-row-unsc, #0A0A0A)', opacity: 0.35 }}>
                      <td className="quai-cell" style={{ borderBottom: '1px dashed #444', color: '#888' }}>{baseLot.quai} (Base)</td>
                      <td className="vessel-cell" style={{ borderBottom: '1px dashed #444', color: '#888' }}>{baseLot.navire}</td>
                      <td className="td-cell" colSpan={2} style={{ borderBottom: '1px dashed #444', color: '#888', fontSize: '8px' }}>Baseline Timeline</td>
                      {hours.map(hr => {
                        const cell = btl[String(hr)] || { status: 'IDLE' };
                        const st = cell.status;
                        const style_info = CELL_BG[st] || CELL_BG.IDLE;
                        return (
                          <td key={`ghost-${hr}`} style={{
                            background: style_info.bg,
                            borderBottom: '1px dashed #444',
                            borderTop: '1px dashed #444'
                          }}></td>
                        );
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
                  <td className="td-cell">{(s.td || 0).toLocaleString()}</td>
                  <td className="grade-cell">{s.qualite}</td>

                  {hours.map(hr => {
                    const cell = tl[String(hr)] || { status: 'IDLE', val: 0, cumul: 0 };
                    const st = cell.status;
                    const style_info = CELL_BG[st] || CELL_BG.IDLE;
                    let lbl = '';
                    if (style_info.label === '__VAL__') {
                      lbl = String(cell.cumul || 0);
                    } else {
                      lbl = style_info.label;
                    }
                    return (
                      <td key={hr} style={{
                        background: style_info.bg,
                        color: style_info.color,
                        fontSize: '9px',
                        fontWeight: st === 'CHARGEMENT' ? 700 : 400,
                        borderRight: ['LIBRE', 'RADE_HIDDEN'].includes(st) ? '1px dashed #333' : undefined,
                        borderTop: ['LIBRE', 'RADE_HIDDEN'].includes(st) ? 'none' : undefined,
                        borderBottom: ['LIBRE', 'RADE_HIDDEN'].includes(st) ? 'none' : undefined,
                      }} title={['LIBRE', 'RADE_HIDDEN'].includes(st) ? 'Navire parti - Ressources libérées' : ''}>
                        {lbl}
                      </td>
                    );
                  })}

                  {/* Last column (cumul) */}
                  {(() => {
                    const lastHr = hours[hours.length - 1];
                    const lastCell = tl[String(lastHr)] || { status: 'IDLE', cumul: 0 };
                    const st = lastCell.status;
                    const si2 = CELL_BG[st] || CELL_BG.IDLE;
                    const lbl = si2.label === '__VAL__' ? String(lastCell.cumul || 0) : '';
                    return (
                      <td style={{ background: si2.bg, color: si2.color, fontSize: '9px', borderRight: ['LIBRE', 'RADE_HIDDEN'].includes(st) ? 'none' : undefined, borderTop: ['LIBRE', 'RADE_HIDDEN'].includes(st) ? 'none' : undefined, borderBottom: ['LIBRE', 'RADE_HIDDEN'].includes(st) ? 'none' : undefined }}>
                        {lbl}
                      </td>
                    );
                  })()}

                  {/* Loaded */}
                  {(() => {
                    const chargedInRow = hours.reduce((sum, hr) => sum + (tl[String(hr)]?.gain || 0), 0);
                    if (isSc) {
                      const cls = s.stock_warn ? 'warn' : 'ok';
                      return <td className={`loaded-cell ${cls}`}>{chargedInRow.toLocaleString()} T</td>;
                    }
                    return <td className="loaded-cell zero">0 T</td>;
                  })()}
                  <td className="info-cell">{isSc ? s.axe : '—'}</td>
                  <td className="info-cell">{isSc ? s.axe_p : '—'}</td>
                  <td className="info-cell">{isSc ? s.portique : '—'}</td>
                  <td className="info-cell">{isSc ? s.hall : '—'}</td>
                </tr>
              );
            });

            rows.push(
              <tr key={`${q}-sep`} className="separator-row">
                <td colSpan={4 + nCols + 5}></td>
              </tr>
            );
            return rows;
          })}

          {/* POSTES row */}
          <tr className="postes-row">
            <td colSpan={4} className="postes-label">▸ POSTES</td>
            <td colSpan={nCols} className="postes-values">
              P1: {p1.toLocaleString()} T | P2: {p2.toLocaleString()} T | P3: {p3.toLocaleString()} T
            </td>
            <td colSpan={5} className="total-cell">
              TOTAL :: {total.toLocaleString()} T
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
