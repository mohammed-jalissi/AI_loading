import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { MODEL_RESULTS, SHAP_IMPORTANCE, MODEL_CONFIG, DATASET_INFO, FEATURE_GROUPS, PIPELINE_STEPS } from './mlData';

const S = {
  page: { padding:'20px', overflowY:'auto', height:'100%', fontFamily:"'JetBrains Mono',monospace" },
  banner: { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'8px', padding:'20px 24px', marginBottom:'20px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' },
  bannerBadge: { fontSize:'10px', color:'var(--accent-yellow)', textTransform:'uppercase', letterSpacing:'2px', marginBottom:'4px' },
  bannerTitle: { fontSize:'22px', fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.5px', textTransform:'uppercase' },
  bannerMeta: { fontSize:'10px', color:'var(--text-muted)', marginTop:'4px' },
  statRow: { display:'flex', gap:'10px', marginTop:'16px', flexWrap:'wrap' },
  stat: { background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:'4px', padding:'10px 16px', minWidth:'100px' },
  statLabel: { fontSize:'9px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:'4px' },
  statVal: { fontSize:'18px', fontWeight:700, color:'var(--accent-yellow)' },
  tabs: { display:'flex', gap:'0', borderBottom:'1px solid var(--border)', marginBottom:'20px' },
  tab: { padding:'8px 18px', fontSize:'11px', fontWeight:600, color:'var(--text-muted)', cursor:'pointer', textTransform:'uppercase', letterSpacing:'1px', border:'none', background:'none', fontFamily:"'JetBrains Mono',monospace", transition:'all .15s', borderBottom:'2px solid transparent' },
  tabActive: { color:'var(--text-primary)', borderBottom:'2px solid var(--accent-yellow)' },
  section: { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'8px', padding:'20px', marginBottom:'16px' },
  sectionTitle: { fontSize:'11px', fontWeight:700, color:'var(--accent-yellow)', textTransform:'uppercase', letterSpacing:'2px', marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px' },
  table: { width:'100%', borderCollapse:'collapse', fontSize:'11px' },
  th: { padding:'8px 10px', background:'var(--bg-secondary)', color:'var(--text-secondary)', fontWeight:600, fontSize:'9px', textTransform:'uppercase', letterSpacing:'1px', borderBottom:'1px solid var(--border)', textAlign:'left', whiteSpace:'nowrap' },
  td: { padding:'7px 10px', borderBottom:'1px solid var(--border-light)', color:'var(--text-primary)', fontSize:'11px' },
  grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' },
  grid3: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px' },
  card: { background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:'6px', padding:'14px' },
  cardLabel: { fontSize:'9px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:'6px' },
  img: { width:'100%', borderRadius:'6px', border:'1px solid var(--border)', display:'block' },
  pipelineGrid: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px' },
  pipelineCard: { background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:'6px', padding:'14px', position:'relative' },
  badge: { display:'inline-block', padding:'2px 8px', borderRadius:'3px', fontSize:'9px', fontWeight:700, letterSpacing:'1px' },
  bar: { height:'8px', background:'var(--bg-primary)', borderRadius:'4px', overflow:'hidden', marginTop:'4px' },
  barFill: { height:'100%', borderRadius:'4px', transition:'width .4s ease' },
  text: { fontSize:'11px', color:'var(--text-secondary)', lineHeight:'1.7' },
  featureTag: { display:'inline-block', padding:'2px 8px', borderRadius:'3px', fontSize:'10px', background:'var(--bg-secondary)', color:'var(--text-secondary)', margin:'2px', border:'1px solid var(--border)' },
};

const TABS = [
  { id:'benchmark', label:'Benchmark' },
  { id:'model',     label:'Modèle & SHAP' },
  { id:'dataset',   label:'Dataset' },
  { id:'pipeline',  label:'Pipeline' },
  { id:'visuals',   label:'Visualisations' },
];

const metricColor = (m, val) => {
  if (['precision','recall','f1','accuracy','aucRoc','aucPr'].includes(m)) {
    if (val >= 0.95) return 'var(--accent-yellow)'; if (val >= 0.80) return 'var(--accent-orange)'; return 'var(--accent-red)';
  }
  return 'var(--text-primary)';
};

function BenchmarkTab() {
  return (
    <>
      <div style={S.section}>
        <div style={S.sectionTitle}>Résultats Comparatifs — 7 Modèles</div>
        <table style={S.table}>
          <thead><tr>
            {['Modèle','Type','Precision','Recall','F1','Accuracy','AUC-ROC','AUC-PR','TP','FP','FN','Score Global'].map(h=>(
              <th key={h} style={S.th}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {MODEL_RESULTS.map(r=>(
              <tr key={r.model} style={r.best ? {background:'color-mix(in srgb, var(--accent-yellow) 8%, transparent)'} : {}}>
                <td style={{...S.td, fontWeight:700, color: r.best ? 'var(--accent-yellow)' : 'var(--text-primary)'}}>
                  {r.best && '★ '}{r.model}
                </td>
                <td style={S.td}>
                  <span style={{...S.badge, background: r.type==='Supervisé'?'color-mix(in srgb, var(--accent-blue) 15%, transparent)':r.type==='Non-Supervisé'?'color-mix(in srgb, var(--accent-purple, #8b5cf6) 15%, transparent)':'color-mix(in srgb, var(--text-muted) 15%, transparent)', color: r.type==='Supervisé'?'var(--accent-blue)':r.type==='Non-Supervisé'?'var(--accent-purple, #8b5cf6)':'var(--text-muted)'}}>{r.type}</span>
                </td>
                {['precision','recall','f1','accuracy','aucRoc','aucPr'].map(m=>(
                  <td key={m} style={{...S.td, color:metricColor(m,r[m]), fontWeight:600}}>{(r[m]*100).toFixed(1)}%</td>
                ))}
                <td style={{...S.td, color:'var(--accent-green)'}}>{r.tp}</td>
                <td style={{...S.td, color: r.fp>10?'var(--accent-red)':'color-mix(in srgb, var(--accent-red) 70%, transparent)'}}>{r.fp}</td>
                <td style={{...S.td, color: r.fn>0?'var(--accent-red)':'var(--accent-green)', fontWeight:700}}>{r.fn}</td>
                <td style={{...S.td, color:metricColor('f1',r.score), fontWeight:700}}>{(r.score*100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{marginTop:'12px',fontSize:'10px',color:'var(--text-muted)'}}>
          ★ Modèle sélectionné · FN = Faux Négatifs (panne non détectée) = risque critique · Score Global = moyenne pondérée F1+Recall+AUC
        </div>
      </div>
      <div style={S.grid2}>
        <div style={S.section}>
          <div style={S.sectionTitle}>F1-Score par Modèle</div>
          {MODEL_RESULTS.filter(r=>r.model!=='Baseline').map(r=>(
            <div key={r.model} style={{marginBottom:'10px'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',marginBottom:'3px'}}>
                <span style={{color: r.best?'var(--accent-yellow)':'var(--text-secondary)',fontWeight:r.best?700:400}}>{r.model}</span>
                <span style={{color:metricColor('f1',r.f1),fontWeight:600}}>{(r.f1*100).toFixed(1)}%</span>
              </div>
              <div style={S.bar}><div style={{...S.barFill, width:`${r.f1*100}%`, background: r.best?'var(--accent-yellow)':r.type==='Non-Supervisé'?'var(--accent-purple, #8b5cf6)':'var(--accent-blue)'}} /></div>
            </div>
          ))}
        </div>
        <div style={S.section}>
          <div style={S.sectionTitle}>AUC-ROC par Modèle</div>
          {MODEL_RESULTS.filter(r=>r.model!=='Baseline').map(r=>(
            <div key={r.model} style={{marginBottom:'10px'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',marginBottom:'3px'}}>
                <span style={{color: r.best?'var(--accent-yellow)':'var(--text-secondary)',fontWeight:r.best?700:400}}>{r.model}</span>
                <span style={{color:metricColor('aucRoc',r.aucRoc),fontWeight:600}}>{(r.aucRoc*100).toFixed(2)}%</span>
              </div>
              <div style={S.bar}><div style={{...S.barFill, width:`${r.aucRoc*100}%`, background: r.best?'var(--accent-yellow)':r.type==='Non-Supervisé'?'var(--accent-purple, #8b5cf6)':'var(--accent-blue)'}} /></div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ModelTab() {
  return (
    <>
      <div style={S.grid2}>
        <div style={S.section}>
          <div style={S.sectionTitle}>Modèle Champion — RandomForest</div>
          <div style={S.grid2}>
            {[['F1-Score','96.7%','var(--accent-yellow)'],['Recall','100%','var(--accent-green)'],['AUC-ROC','99.35%','var(--accent-blue)'],['FN (Manqués)','0','var(--accent-yellow)'],['AUC-PR','98.02%','var(--accent-orange)'],['Entraîné','2026-04-17','var(--accent-purple, #8b5cf6)']].map(([l,v,c])=>(
              <div key={l} style={S.card}>
                <div style={S.cardLabel}>{l}</div>
                <div style={{fontSize:'18px',fontWeight:800,color:c}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:'14px',background:'color-mix(in srgb, var(--accent-yellow) 8%, transparent)',border:'1px solid color-mix(in srgb, var(--accent-yellow) 20%, transparent)',borderRadius:'4px',padding:'12px'}}>
            <div style={{fontSize:'9px',color:'var(--accent-yellow)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:'6px'}}>Pourquoi Random Forest ?</div>
            <div style={S.text}>Recall = 100% → zéro panne manquée. Le test McNemar confirme que la victoire sur XGBoost n'est pas due au hasard. Robustesse face aux features cycliques et à la classe non-linéaire.</div>
          </div>
        </div>
        <div style={S.section}>
          <div style={S.sectionTitle}>SHAP — Importance des Features</div>
          {SHAP_IMPORTANCE.slice(0,10).map(f=>{
            const pct = (f.importance / SHAP_IMPORTANCE[0].importance)*100;
            const colors = {A:'var(--accent-yellow)',B:'var(--accent-blue)',C:'var(--accent-orange)',D:'var(--accent-purple, #8b5cf6)',E:'var(--accent-green)'};
            return (
              <div key={f.feature} style={{marginBottom:'8px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'3px'}}>
                  <span style={{fontSize:'10px',color:'var(--text-primary)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.feature}</span>
                  <span style={{fontSize:'9px',padding:'1px 6px',borderRadius:'2px',background:`color-mix(in srgb, ${colors[f.group]} 20%, transparent)`,color:colors[f.group],marginLeft:'8px',flexShrink:0}}>Grp {f.group}</span>
                  <span style={{fontSize:'10px',color:'var(--text-secondary)',marginLeft:'8px',minWidth:'40px',textAlign:'right'}}>{f.importance.toFixed(3)}</span>
                </div>
                <div style={S.bar}><div style={{...S.barFill,width:`${pct}%`,background:colors[f.group]}} /></div>
              </div>
            );
          })}
          <div style={{fontSize:'9px',color:'var(--text-muted)',marginTop:'8px'}}>Valeurs = |SHAP| moyen sur 330 échantillons de test · Top 10 affiché</div>
        </div>
      </div>
      <div style={S.section}>
        <div style={S.sectionTitle}>Features du Modèle — 20 Variables</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
          {MODEL_CONFIG.features.map(f=>(
            <span key={f} style={S.featureTag}>{f}</span>
          ))}
        </div>
      </div>
    </>
  );
}

function DatasetTab() {
  return (
    <>
      <div style={S.grid3}>
        {[
          ['Période','01/01/2025 → 31/12/2025','var(--accent-yellow)'],
          ['Lignes Totales','2 190','var(--accent-yellow)'],
          ['Features','20 variables','var(--accent-blue)'],
          ['Axes','6 axes (1→6)','var(--accent-orange)'],
          ['Granularité','1 ligne = 1 jour × 1 axe','var(--accent-purple, #8b5cf6)'],
          ['Ratio N/A','2.1 : 1','var(--accent-green)'],
        ].map(([l,v,c])=>(
          <div key={l} style={S.card}>
            <div style={S.cardLabel}>{l}</div>
            <div style={{fontSize:'14px',fontWeight:700,color:c}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{...S.grid2, marginTop:'16px'}}>
        <div style={S.section}>
          <div style={S.sectionTitle}>Distribution des Labels</div>
          {[['Normal (0)', DATASET_INFO.normal.count, DATASET_INFO.normal.pct,'var(--accent-green)'],['Anomalie (1)', DATASET_INFO.anomalie.count, DATASET_INFO.anomalie.pct,'var(--accent-red)']].map(([l,c,p,col])=>(
            <div key={l} style={{marginBottom:'12px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                <span style={{fontSize:'11px',color:'var(--text-primary)'}}>{l}</span>
                <span style={{fontSize:'11px',color:col,fontWeight:700}}>{c.toLocaleString()} ({p}%)</span>
              </div>
              <div style={S.bar}><div style={{...S.barFill,width:`${p}%`,background:col}} /></div>
            </div>
          ))}
          <div style={{...S.text, marginTop:'12px', background:'color-mix(in srgb, var(--accent-orange) 8%, transparent)', border:'1px solid color-mix(in srgb, var(--accent-orange) 20%, transparent)', borderRadius:'4px', padding:'10px'}}>
            <strong style={{color:'var(--accent-orange)'}}>χ² = 7.525</strong> | ddl=3 | p=0.0569 → Non significatif (α=5%). L'heure ne prédit pas directement l'anomalie → SMOTE requis.
          </div>
        </div>
        <div style={S.section}>
          <div style={S.sectionTitle}>Types d'Anomalies</div>
          {DATASET_INFO.anomalie_types.map(({type,count})=>{
            const max = 643; const pct=(count/max)*100;
            const cols = {'Défaut électrique':'var(--accent-red)','Épuisement de stock':'var(--accent-orange)','Défaut mécanique':'var(--accent-purple, #8b5cf6)','Rupture de bande':'var(--accent-blue)'};
            return (
              <div key={type} style={{marginBottom:'12px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                  <span style={{fontSize:'11px',color:'var(--text-primary)'}}>{type}</span>
                  <span style={{fontSize:'11px',color:cols[type]||'var(--text-muted)',fontWeight:700}}>{count}</span>
                </div>
                <div style={S.bar}><div style={{...S.barFill,width:`${pct}%`,background:cols[type]||'#555'}} /></div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={S.section}>
        <div style={S.sectionTitle}>Groupes de Features</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
          {FEATURE_GROUPS.map(g=>(
            <div key={g.label} style={{...S.card, borderLeft:`3px solid ${g.color}`}}>
              <div style={{fontSize:'10px',fontWeight:700,color:g.color,marginBottom:'6px'}}>{g.label}</div>
              <div style={{marginBottom:'8px'}}>{g.features.map(f=><span key={f} style={{...S.featureTag,fontSize:'9px'}}>{f}</span>)}</div>
              <div style={{fontSize:'10px',color:'var(--text-secondary)',lineHeight:'1.6'}}>{g.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function PipelineTab() {
  const [hoveredStep, setHoveredStep] = useState(null);
  const pipelineRef = useRef(null);

  const handleDownload = async () => {
    if (!pipelineRef.current) return;
    try {
      const canvas = await html2canvas(pipelineRef.current, { backgroundColor: null, scale: 2 });
      const link = document.createElement('a');
      link.download = 'ML_Pipeline_OCP_Chapter5.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Failed to capture screenshot', e);
    }
  };

  const PIPELINE_META = [
    { in: '34 colonnes brutes',   out: '20 features nettes',          duration: '0.12s',   records: '2 190 lignes' },
    { in: '2 190 lignes',         out: 'Train 1533 / Val 328 / Test 329', duration: '<0.01s', records: 'Split chronologique' },
    { in: 'Train : 1 533 lignes', out: 'Dataset équilibré ×2.1',      duration: '1.8s',    records: 'SMOTE k=5' },
    { in: 'Train + Validation',   out: '6 modèles entraînés',          duration: '247s',    records: '5-Fold TimeSeriesSplit' },
    { in: '6 modèles candidats',  out: 'best_model_RF.pkl',            duration: '<0.01s',  records: 'FN=0 · F1=96.7%' },
    { in: 'Test Set (329)',        out: 'shap_values.csv',              duration: '4.2s',    records: '330 échantillons' },
  ];

  const STEP_CATEGORIES = [
    'DATA INGESTION', 'TEMPORAL SPLIT', 'CLASS BALANCING',
    'MODEL TRAINING', 'MODEL SELECTION', 'EXPLAINABILITY (XAI)',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent-yellow)',
        borderRadius: '6px', padding: '16px 20px', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <div style={{ fontSize: '9px', color: 'var(--accent-yellow)', letterSpacing: '2px', fontWeight: 700, marginBottom: '4px' }}>
            MODULE 02 · PIPELINE D'ENTRAÎNEMENT ML
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
            6 Étapes · Random Forest · Validation Temporelle
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {[['2 190', 'LIGNES'], ['20', 'FEATURES'], ['247 s', 'TRAINING'], ['99.35 %', 'AUC-ROC']].map(([v, l]) => (
            <div key={l} style={{
              textAlign: 'center', background: 'var(--bg-primary)',
              border: '1px solid var(--border)', borderRadius: '5px', padding: '8px 14px',
            }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-yellow)' }}>{v}</div>
              <div style={{ fontSize: '8px', color: 'var(--text-muted)', letterSpacing: '1.5px', marginTop: '2px' }}>{l}</div>
            </div>
          ))}
          <button 
            onClick={handleDownload}
            style={{ 
              marginLeft: '8px', padding: '12px 16px', background: 'var(--accent-yellow)', 
              color: '#000', border: 'none', borderRadius: '5px', 
              fontSize: '11px', fontWeight: 800, cursor: 'pointer', 
              textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Capture PNG
          </button>
        </div>
      </div>

      {/* ── Pipeline Steps Container for Screenshot ── */}
      <div ref={pipelineRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
        
        {/* The Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '24px',
          position: 'relative'
        }}>
        {PIPELINE_STEPS.map((s, i) => {
          const meta = PIPELINE_META[i];
          const isHovered = hoveredStep === i;
          return (
            <div key={s.n} style={{ display: 'flex', flexDirection: 'column' }}>

              {/* Step Card */}
              <div
                onMouseEnter={() => setHoveredStep(i)}
                onMouseLeave={() => setHoveredStep(null)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: isHovered ? 'var(--bg-card)' : 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderTop: `3px solid ${isHovered ? 'var(--accent-yellow)' : 'var(--border)'}`,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  height: '100%',
                  boxShadow: isHovered ? '0 8px 24px rgba(0,0,0,0.1)' : '0 4px 12px rgba(0,0,0,0.05)',
                }}
              >
                {/* Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border-light)',
                  background: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
                }}>
                  <div style={{
                    fontSize: '28px', fontWeight: 900,
                    color: isHovered ? 'var(--accent-yellow)' : 'var(--text-muted)',
                    fontFamily: 'JetBrains Mono, monospace',
                    lineHeight: 1, transition: 'color 0.2s',
                  }}>
                    {s.n}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <div style={{
                        fontSize: '9px', fontWeight: 800,
                        background: 'var(--bg-primary)', border: '1px solid var(--border)',
                        color: 'var(--text-secondary)', borderRadius: '4px',
                        padding: '2px 6px', letterSpacing: '1px',
                      }}>
                        {s.icon}
                      </div>
                      <div style={{ fontSize: '8px', color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700 }}>
                        {STEP_CATEGORIES[i]}
                      </div>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                      {s.title}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div style={{ padding: '16px 20px', flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', fontWeight: 400 }}>
                    {s.desc}
                  </div>
                </div>

                {/* I/O + Metrics */}
                <div style={{
                  padding: '14px 20px',
                  background: 'var(--bg-secondary)',
                  borderTop: '1px solid var(--border-light)',
                  display: 'flex', flexDirection: 'column', gap: '12px'
                }}>
                  {/* I/O Flow */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '8px', color: 'var(--text-muted)', letterSpacing: '1px', border: '1px solid var(--border)', borderRadius: '3px', padding: '2px 4px', fontWeight: 800 }}>IN</span>
                      <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.in}</span>
                    </div>
                    
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>→</div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '9px', color: 'var(--text-primary)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.out}</span>
                      <span style={{ fontSize: '8px', color: 'var(--accent-yellow)', letterSpacing: '1px', border: '1px solid color-mix(in srgb, var(--accent-yellow) 30%, transparent)', borderRadius: '3px', padding: '2px 4px', fontWeight: 800, background: 'color-mix(in srgb, var(--accent-yellow) 8%, transparent)' }}>OUT</span>
                    </div>
                  </div>
                  
                  {/* Performance Tags */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 6px' }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      <span style={{ fontSize: '8px', color: 'var(--text-secondary)', fontWeight: 600 }}>{meta.duration}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 6px' }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                      <span style={{ fontSize: '8px', color: 'var(--text-secondary)', fontWeight: 600 }}>{meta.records}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* LIAISON ARROW: Right arrow for items 0, 1, 3, 4 */}
              {[0, 1, 3, 4].includes(i) && (
                <div style={{
                  position: 'absolute',
                  right: '-18px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--border)',
                  fontSize: '20px',
                  fontWeight: 900,
                  zIndex: 10,
                }}>
                  ›
                </div>
              )}

              {/* LIAISON ARROW: Down arrow from item 2 to item 5 (visually down to the next row) */}
              {i === 2 && (
                <div style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: '-20px',
                  transform: 'translateX(-50%)',
                  color: 'var(--border)',
                  fontSize: '20px',
                  fontWeight: 900,
                  zIndex: 10,
                }}>
                  ⌄
                </div>
              )}
            </div>
          );
        })}
      </div>

        {/* ── Integration block ── */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '6px', padding: '20px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px',
          marginTop: '4px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)' }} />
              <div style={{ fontSize: '8px', color: 'var(--accent-green)', letterSpacing: '2px', fontWeight: 700 }}>
                INTÉGRATION PRODUCTION
              </div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.8' }}>
              Le fichier{' '}
              <code style={{ color: 'var(--accent-yellow)', background: 'var(--bg-primary)', padding: '1px 6px', borderRadius: '3px', fontSize: '9px' }}>
                best_model_RandomForest.pkl
              </code>{' '}
              est chargé au démarrage du serveur FastAPI. Les métriques SCADA/GMAO du jour
              sont normalisées via{' '}
              <code style={{ color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '1px 6px', borderRadius: '3px', fontSize: '9px' }}>
                scaler.pkl
              </code>{' '}
              puis soumises au modèle pour obtenir un score de risque par axe en temps réel.
            </div>
          </div>
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: '5px', padding: '14px',
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            <div style={{ fontSize: '8px', color: 'var(--text-muted)', marginBottom: '10px', letterSpacing: '1px' }}>
              # RUNTIME RISK OUTPUT (example)
            </div>
            {[
              ['Axe1', 5,  'var(--accent-green)'],
              ['Axe2', 12, 'var(--accent-green)'],
              ['Axe3', 88, 'var(--accent-red)'],
              ['TB1',  7,  'var(--accent-green)'],
              ['TB2',  44, 'var(--accent-orange)'],
              ['TB3',  3,  'var(--accent-green)'],
            ].map(([axe, pct, col]) => (
              <div key={axe} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', minWidth: '28px' }}>{axe}</span>
                <div style={{ flex: 1, height: '3px', background: 'var(--bg-primary)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: col }} />
                </div>
                <span style={{ fontSize: '9px', color: col, fontWeight: 700, minWidth: '30px', textAlign: 'right' }}>
                  {pct}%
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>{/* End of Pipeline Steps Container */}

    </div>
  );
}


const FIGURES = [
  { src:'/fig_5_1_A.png', title:'Déséquilibre des Classes', desc:'Répartition Normal (67.8%) vs Anomalie (32.2%). Justifie l\'application de SMOTE pour l\'équilibrage avant entraînement.' },
  { src:'/fig_5_1_B.png', title:'Types d\'Anomalies', desc:'Défaut électrique (643) et épuisement stock (613) dominent. Rupture de bande (24) : rare mais critique.' },
  { src:'/fig_5_1_C.png', title:'Séries Temporelles', desc:'Évolution des arrêts et anomalies sur 2025 par axe. Les pics révèlent les fenêtres critiques de maintenance.' },
  { src:'/fig_5_1_D.png', title:'Corrélation des Features', desc:'Heatmap de corrélation des 20 variables. Permet d\'identifier la redondance et de valider l\'orthogonalité des features.' },
];

function VisualsTab() {
  const [active, setActive] = useState(null);
  return (
    <>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
        {FIGURES.map((f,i)=>(
          <div key={i} style={{...S.section,cursor:'pointer',transition:'border-color .2s',borderColor: active===i?'var(--accent-yellow)':'var(--border)'}} onClick={()=>setActive(active===i?null:i)}>
            <div style={S.sectionTitle}>Fig 5.1{['A','B','C','D'][i]} — {f.title}</div>
            <img src={f.src} alt={f.title} style={S.img} loading="lazy" />
            <div style={{...S.text, marginTop:'10px'}}>{f.desc}</div>
          </div>
        ))}
      </div>
      {active!==null && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setActive(null)}>
          <div style={{maxWidth:'90vw',maxHeight:'90vh',position:'relative'}}>
            <img src={FIGURES[active].src} alt={FIGURES[active].title} style={{maxWidth:'100%',maxHeight:'85vh',borderRadius:'8px',border:'1px solid var(--border)'}} />
            <div style={{textAlign:'center',marginTop:'8px',color:'var(--accent-yellow)',fontSize:'12px',fontWeight:700}}>{FIGURES[active].title}</div>
          </div>
        </div>
      )}
    </>
  );
}

export default function MLPredictionPage() {
  const [activeTab, setActiveTab] = useState('benchmark');
  const rf = MODEL_RESULTS[0];

  return (
    <div style={S.page} className="page-content">
      <div style={S.banner}>
        <div>
          <div style={S.bannerBadge}>MODULE 2 · AI LOADING PLANNER · OCP JORF LASFAR</div>
          <div style={S.bannerTitle}>ML ANOMALY DETECTION — RANDOM FOREST</div>
          <div style={S.bannerMeta}>Entraîné le {MODEL_CONFIG.trained_date} · Dataset Jan–Déc 2025 · 2 190 lignes · 6 axes · 20 features</div>
          <div style={S.statRow}>
            {[['F1-Score','96.7%'],['Recall','100%'],['AUC-ROC','99.35%'],['Faux Négatifs','0'],['Modèles testés','7']].map(([l,v])=>(
              <div key={l} style={S.stat}><div style={S.statLabel}>{l}</div><div style={S.statVal}>{v}</div></div>
            ))}
          </div>
        </div>
        <div style={{background:'color-mix(in srgb, var(--accent-yellow) 6%, transparent)',border:'1px solid color-mix(in srgb, var(--accent-yellow) 20%, transparent)',borderRadius:'6px',padding:'12px 16px',textAlign:'right',flexShrink:0}}>
          <div style={{fontSize:'9px',color:'var(--text-muted)',letterSpacing:'1px',marginBottom:'4px'}}>MODÈLE ACTIF</div>
          <div style={{fontSize:'20px',fontWeight:800,color:'var(--accent-yellow)'}}>RandomForest</div>
          <div style={{fontSize:'9px',color:'var(--text-muted)',marginTop:'4px'}}>best_model_RF.pkl · scaler.pkl</div>
          <div style={{marginTop:'8px',fontSize:'9px',background:'color-mix(in srgb, var(--accent-green) 10%, transparent)',border:'1px solid color-mix(in srgb, var(--accent-green) 20%, transparent)',borderRadius:'3px',padding:'4px 8px',color:'var(--accent-green)'}}>● PRODUCTION READY</div>
        </div>
      </div>

      <div style={S.tabs}>
        {TABS.map(t=>(
          <button key={t.id} style={{...S.tab,...(activeTab===t.id?S.tabActive:{})}} onClick={()=>setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {activeTab==='benchmark' && <BenchmarkTab />}
      {activeTab==='model'     && <ModelTab />}
      {activeTab==='dataset'   && <DatasetTab />}
      {activeTab==='pipeline'  && <PipelineTab />}
      {activeTab==='visuals'   && <VisualsTab />}
    </div>
  );
}
