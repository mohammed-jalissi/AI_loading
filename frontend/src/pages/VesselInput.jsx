import { useState, useEffect } from 'react';
import { api } from '../api/client';

// ── Real qualites from backend config ──────────────────────────────────────
const QUALITES = [
  "DAP EURO LOW CD", "DAP SPECIAL DARK", "DAP SPECIAL", "DAP SPC", "DAP STANDARD",
  "DAP TANZANIE", "DAP BANGLADESH", "MAP 11-52 SPC", "MAP 10-50 SPC",
  "MAP 11 52 Special Low Cd", "TSP CIV", "TSP LOW CD", "TSP SPECIAL JORF",
  "TSP Bangladesh", "NPS 13-37-15S", "NPS 12 45 5S IZN", "NPS 15 15 15 Low Cd",
];

const EMPTY_LOT = { qualite: QUALITES[0], td: 10000 };

const EMPTY_FORM = {
  nom: '',
  arrivee: 0,
  priorite: 2,
  laytime: 40,
  demurrage_rate: 1000,
  lots: [{ ...EMPTY_LOT }],
};

function PriorityBadge({ p }) {
  const colors = { 1: '#ef4444', 2: '#f59e0b', 3: '#22d3ee' };
  const labels = { 1: 'P1 URGENT', 2: 'P2 NORMAL', 3: 'P3 LOW' };
  return (
    <span style={{
      color: colors[p] || '#888',
      background: `${colors[p] || '#888'}20`,
      border: `1px solid ${colors[p] || '#888'}`,
      borderRadius: 4,
      padding: '2px 8px',
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: 1,
    }}>
      {labels[p] || `P${p}`}
    </span>
  );
}

function StatusDot({ type }) {
  const colors = { default: '#6366f1', custom: '#d4ff00' };
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8,
      borderRadius: '50%', background: colors[type] || '#555',
      marginRight: 6, boxShadow: `0 0 6px ${colors[type] || '#555'}`,
    }} />
  );
}

export default function VesselInput({ dataMode = 'LOCAL' }) {
  const [vessels, setVessels] = useState({ default: [], custom: [] });
  const [form, setForm] = useState({ ...EMPTY_FORM, lots: [{ ...EMPTY_LOT }] });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [clearing, setClearing] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchVessels = async () => {
    try {
      const data = await api.getVessels(dataMode);
      setVessels({ default: data.default || [], custom: data.custom || [] });
    } catch {
      showToast('Erreur chargement navires', 'error');
    }
  };

  useEffect(() => {
    fetchVessels();
  }, [dataMode]);

  const updateLot = (idx, field, value) => {
    setForm(f => {
      const lots = [...f.lots];
      lots[idx] = { ...lots[idx], [field]: field === 'td' ? Number(value) : value };
      return { ...f, lots };
    });
  };

  const addLot = () => setForm(f => ({ ...f, lots: [...f.lots, { ...EMPTY_LOT }] }));

  const removeLot = (idx) => {
    if (form.lots.length === 1) return;
    setForm(f => ({ ...f, lots: f.lots.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom.trim()) { showToast('Nom du navire requis', 'error'); return; }
    if (form.lots.some(l => !l.td || l.td <= 0)) { showToast('Tonnage invalide dans un lot', 'error'); return; }

    setSubmitting(true);
    try {
      await api.addVessel(form);
      showToast(`Navire "${form.nom}" enregistré avec succès`);
      setForm({ ...EMPTY_FORM, lots: [{ ...EMPTY_LOT }] });
      setShowForm(false);
      await fetchVessels();
    } catch {
      showToast('Erreur lors de la création du navire', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await api.clearCustomVessels();
      showToast('Navires custom effacés');
      await fetchVessels();
    } catch {
      showToast('Erreur suppression', 'error');
    } finally {
      setClearing(false);
    }
  };

  const totalDefault = vessels.default.reduce((s, v) => s + (v.lots?.reduce((a, l) => a + l.td, 0) || 0), 0);
  const totalCustom = vessels.custom.reduce((s, v) => s + (v.lots?.reduce((a, l) => a + l.td, 0) || 0), 0);

  return (
    <div className="page-content" style={{ maxWidth: 1200, paddingBottom: 80 }}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 3, fontWeight: 700 }}>MODULE</span>
            <span style={{ width: 40, height: 1, background: 'var(--border)' }} />
          </div>
          <h2 style={{ fontSize: 22, color: 'var(--accent-yellow)', fontWeight: 900, margin: '4px 0', letterSpacing: 2 }}>
            VESSEL_INPUT
          </h2>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
            Gestion des navires · {vessels.default.length + vessels.custom.length} navires chargés · {(totalDefault + totalCustom).toLocaleString()} T total
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {vessels.custom.length > 0 && (
            <button
              onClick={handleClear}
              disabled={clearing}
              style={{
                background: 'transparent', border: '1px solid var(--accent-red)', color: 'var(--accent-red)',
                padding: '8px 16px', fontSize: 10, fontWeight: 800, letterSpacing: 1.5,
                cursor: 'pointer', borderRadius: 4, opacity: clearing ? 0.6 : 1,
              }}
            >
              {clearing ? '...' : '⌫ EFFACER CUSTOM'}
            </button>
          )}
          <button
            onClick={() => setShowForm(f => !f)}
            style={{
              background: showForm ? 'var(--accent-yellow)' : 'transparent',
              border: '1px solid var(--accent-yellow)',
              color: showForm ? '#000' : 'var(--accent-yellow)',
              padding: '8px 20px', fontSize: 10, fontWeight: 800, letterSpacing: 1.5,
              cursor: 'pointer', borderRadius: 4, transition: 'all 0.2s',
            }}
          >
            {showForm ? '✕ FERMER' : '+ NOUVEAU NAVIRE'}
          </button>
        </div>
      </div>

      {/* ── Stats Bar ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'NAVIRES PAR DÉFAUT', value: vessels.default.length, color: 'var(--accent-blue)' },
          { label: 'NAVIRES CUSTOM', value: vessels.custom.length, color: 'var(--accent-yellow)' },
          { label: 'TOTAL TONNAGE', value: `${(totalDefault + totalCustom).toLocaleString()} T`, color: 'var(--accent-blue)' },
          { label: 'LOTS TOTAL', value: [...vessels.default, ...vessels.custom].reduce((s, v) => s + (v.lots?.length || 0), 0), color: 'var(--accent-orange, #f59e0b)' },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: 'var(--bg-card)', border: `1px solid var(--border)`,
            borderLeft: `3px solid ${s.color}`, borderRadius: 6, padding: '12px 16px',
          }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Add Vessel Form ────────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
          padding: 28, marginBottom: 32,
          boxShadow: '0 0 40px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 8, height: 8, background: 'var(--accent-yellow)', borderRadius: '50%', boxShadow: '0 0 8px var(--accent-yellow)' }} />
            <span style={{ fontSize: 11, color: 'var(--accent-yellow)', fontWeight: 800, letterSpacing: 2 }}>ENREGISTREMENT NAVIRE</span>
          </div>

          {/* Row 1: Nom + Arrivée + Priorité + Laytime + Demurrage */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            <label style={styles.label}>
              <span style={styles.labelText}>NOM DU NAVIRE</span>
              <input
                style={styles.input}
                value={form.nom}
                onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                placeholder="ex: MV ATLAS FORCE"
                required
              />
            </label>
            <label style={styles.label}>
              <span style={styles.labelText}>ARRIVÉE (H+)</span>
              <input
                style={styles.input}
                type="number" min="0" max="72"
                value={form.arrivee}
                onChange={e => setForm(f => ({ ...f, arrivee: Number(e.target.value) }))}
              />
            </label>
            <label style={styles.label}>
              <span style={styles.labelText}>PRIORITÉ</span>
              <select
                style={styles.input}
                value={form.priorite}
                onChange={e => setForm(f => ({ ...f, priorite: Number(e.target.value) }))}
              >
                <option value={1}>P1 — URGENT</option>
                <option value={2}>P2 — NORMAL</option>
                <option value={3}>P3 — LOW</option>
              </select>
            </label>
            <label style={styles.label}>
              <span style={styles.labelText}>LAYTIME (H)</span>
              <input
                style={styles.input}
                type="number" min="1"
                value={form.laytime}
                onChange={e => setForm(f => ({ ...f, laytime: Number(e.target.value) }))}
                title="Temps de chargement autorisé avant surestaries"
              />
            </label>
            <label style={styles.label}>
              <span style={styles.labelText}>SURESTARIES ($/H)</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <input
                  style={styles.input}
                  type="number" min="0" step="100"
                  value={form.demurrage_rate}
                  onChange={e => setForm(f => ({ ...f, demurrage_rate: Number(e.target.value) }))}
                  title="Coût par heure de retard"
                />
                <span style={{ fontSize: 8, color: '#f59e0b', fontStyle: 'italic', lineHeight: 1.2 }}>
                  *Demurrage rate
                </span>
              </div>
            </label>
          </div>

          {/* Lots Section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2, fontWeight: 700 }}>
                LOTS DE CHARGEMENT ({form.lots.length})
              </span>
              <button type="button" onClick={addLot} style={styles.addLotBtn}>+ AJOUTER LOT</button>
            </div>
 
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {form.lots.map((lot, idx) => (
                <div key={idx} style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr auto',
                  gap: 12, alignItems: 'end',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: 14,
                }}>
                  <label style={styles.label}>
                    <span style={styles.labelText}>QUALITÉ PRODUIT</span>
                    <select
                      style={styles.input}
                      value={lot.qualite}
                      onChange={e => updateLot(idx, 'qualite', e.target.value)}
                    >
                      {QUALITES.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </label>
                  <label style={styles.label}>
                    <span style={styles.labelText}>TONNAGE (T)</span>
                    <input
                      style={styles.input}
                      type="number" min="1" step="100"
                      value={lot.td}
                      onChange={e => updateLot(idx, 'td', e.target.value)}
                      required
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeLot(idx)}
                    disabled={form.lots.length === 1}
                    style={{
                      ...styles.addLotBtn,
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                      padding: '8px 12px',
                      marginBottom: 0,
                      opacity: form.lots.length === 1 ? 0.3 : 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
 
            {/* Lot summary */}
            <div style={{ marginTop: 10, padding: '10px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>TOTAL TONNAGE NAVIRE: </span>
              <span style={{ fontSize: 13, color: 'var(--accent-yellow)', fontWeight: 800 }}>
                {form.lots.reduce((s, l) => s + (Number(l.td) || 0), 0).toLocaleString()} T
              </span>
            </div>
          </div>
 
          {/* Submit */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => { setForm({ ...EMPTY_FORM, lots: [{ ...EMPTY_LOT }] }); setShowForm(false); }}
              style={{ ...styles.addLotBtn, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              ANNULER
            </button>
            <button type="submit" disabled={submitting} style={{
              background: submitting ? 'var(--bg-secondary)' : 'var(--accent-yellow)',
              color: '#000', border: 'none',
              padding: '10px 28px', fontSize: 11, fontWeight: 900,
              letterSpacing: 2, cursor: submitting ? 'not-allowed' : 'pointer',
              borderRadius: 4, transition: 'all 0.2s',
            }}>
              {submitting ? 'ENVOI...' : '▶ SOUMETTRE NAVIRE'}
            </button>
          </div>
        </form>
      )}

      {/* ── Vessels Tables ─────────────────────────────────────────── */}
      {vessels.custom.length > 0 && (
        <VesselTable title="NAVIRES CUSTOM" type="custom" vessels={vessels.custom} />
      )}
      <VesselTable title="NAVIRES PAR DÉFAUT (SESSION)" type="default" vessels={vessels.default} />

      {/* ── Toast ──────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 56, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#1a0000' : '#001a00',
          border: `1px solid ${toast.type === 'error' ? '#ef4444' : '#22c55e'}`,
          color: toast.type === 'error' ? '#ef4444' : '#22c55e',
          padding: '12px 24px', borderRadius: 6, fontSize: 12, fontWeight: 700,
          zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          animation: 'fadeIn 0.3s ease',
        }}>
          {toast.type === 'error' ? '⚠ ' : '✓ '}{toast.msg}
        </div>
      )}
    </div>
  );
}

function VesselTable({ title, type, vessels }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <StatusDot type={type} />
        <span style={{ fontSize: 10, color: type === 'custom' ? 'var(--accent-yellow)' : 'var(--accent-blue)', fontWeight: 800, letterSpacing: 2 }}>
          {title}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>— {vessels.length} navires</span>
      </div>

      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
      }}>
          <div style={{
          display: 'grid', gridTemplateColumns: '1.2fr 0.6fr 0.6fr 0.6fr 0.6fr 0.6fr 1fr 1fr',
          padding: '10px 16px', borderBottom: '1px solid var(--border)',
          fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 1.5,
        }}>
          <span>NAVIRE</span>
          <span>ARRIVÉE</span>
          <span>PRIO</span>
          <span>LAYTIME</span>
          <span>RATE ($)</span>
          <span>LOTS</span>
          <span>PRODUITS</span>
          <span style={{ textAlign: 'right' }}>TONNAGE</span>
        </div>

        {vessels.map((v, i) => {
          const total = v.lots?.reduce((s, l) => s + l.td, 0) || 0;
          const products = [...new Set(v.lots?.map(l => l.qualite))];
          return (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1.2fr 0.6fr 0.6fr 0.6fr 0.6fr 0.6fr 1fr 1fr',
              padding: '16px', borderBottom: '1px solid var(--border-light)',
              alignItems: 'center', transition: 'background 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: 1 }}>{v.nom}</div>
                <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 2 }}>IMO-{String(i + 1000 + i * 7).padStart(7, '0')}</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>H+{v.arrivee}h</div>
              <div><PriorityBadge p={v.priorite} /></div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{v.laytime}h</div>
              <div style={{ fontSize: 11, color: 'var(--accent-red)' }}>${v.demurrage_rate || 1000}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{v.lots?.length}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {products.map(p => (
                  <span key={p} style={{
                    fontSize: 7, background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    color: 'var(--text-secondary)', padding: '1px 4px', borderRadius: 2,
                  }}>{p}</span>
                ))}
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--accent-blue)' }}>
                {total.toLocaleString()} T
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


const styles = {
  label: { display: 'flex', flexDirection: 'column', gap: 6 },
  labelText: { fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, fontWeight: 700 },
  input: {
    background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)',
    padding: '10px 12px', fontSize: 12, borderRadius: 4,
    fontFamily: 'inherit', outline: 'none', width: '100%',
    boxSizing: 'border-box', transition: 'border 0.2s',
  },
  addLotBtn: {
    background: 'transparent', border: '1px solid var(--accent-yellow)', color: 'var(--accent-yellow)',
    padding: '6px 14px', fontSize: 9, fontWeight: 800, letterSpacing: 1.5,
    cursor: 'pointer', borderRadius: 4,
  },
};
