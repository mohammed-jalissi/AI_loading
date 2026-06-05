import { useRef, useState } from 'react';
import html2pdf from 'html2pdf.js';
import { AcademicMilpDocument } from '../components/AcademicMilpDocument';
import MathFormulationModal from '../components/MathFormulationModal';

export default function MilpModel() {
  const pdfRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDownloadPdf = () => {
    const element = pdfRef.current;
    const opt = {
      margin:       [8, 8, 8, 8],
      filename:     'MILP_Modelisation_Academique.pdf',
      image:        { type: 'jpeg', quality: 0.99 },
      html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };


  const constraints = [
    { id: 'C1', title: 'Unicité Quai', desc: 'Garantit qu\'un poste d\'accostage ne reçoit qu\'un seul navire à la fois pour éviter les collisions physiques.' },
    { id: 'C2', title: 'Capacité Axe', desc: 'Le flux horaire (T/h) est bridé par la cadence nominale du convoyeur (ex: 900T/h pour TB1).' },
    { id: 'C3', title: 'Disponibilité Axe', desc: 'Un axe est verrouillé jusqu\'à la fin complète du lot pour éviter les mélanges de produits.' },
    { id: 'C4', title: 'Disponibilité Quai', desc: 'Le quai n\'est libéré qu\'après les procédures administratives et physiques (CTE/FC).' },
    { id: 'C5', title: 'Respect Arrivée', desc: 'L\'heure d\'accostage (tau_acc) doit être supérieure ou égale à l\'ETA (Estimated Time of Arrival).' },
    { id: 'C6', title: 'Horizon Temporel', desc: 'Tous les événements de planification sont contraints dans l\'intervalle discret [0, T].' },
    { id: 'C7', title: 'Compatibilité Qualité-Hall', desc: 'Mapping strict entre le type de produit (DAP, MAP, TSP) et les cellules de stockage.' },
    { id: 'C8', title: 'Bilan Matière', desc: 'L\'inventaire du Hall est décrémenté dynamiquement en fonction du tonnage extrait (f_t).' },
    { id: 'C9', title: 'Non-Négativité Stock', desc: 'Le niveau de stock physique ne peut jamais être inférieur à zéro (Contrainte d\'existence).' },
    { id: 'C10', title: 'Priorité Relative', desc: 'Pondération des variables de décision selon l\'importance du navire (P1 > P2 > P3).' },
    { id: 'C11', title: 'Séquencement Lots', desc: 'Les lots d\'un même navire doivent être chargés l\'un après l\'autre sans chevauchement.' },
    { id: 'C12 : Météo', title: 'Sécurité Environnementale (Stochastique)', desc: 'Le modèle évalue la probabilité de tempête. S\'il décide de charger sous risque, il subit une lourde pénalité forçant la recherche de marges (Buffer Time).' },
    { id: 'C13', title: 'Tirant d\'Eau', desc: 'Le tonnage cumulé par lot ne peut excéder la capacité déclarée (Tonnage Demandé).' },
    { id: 'C14', title: 'Continuité Chargement', desc: 'L\'algorithme favorise un flux continu pour minimiser les arrêts/redémarrages coûteux.' },
    { id: 'C15', title: 'Unicité Hall par Lot', desc: 'Pendant un lot donné, le système interdit le changement de hall source (Stabilité chimique).' },
    { id: 'C16', title: 'Unicité Axe par Lot', desc: 'Un lot est acheminé par une route unique (un seul axe à la fois).' },
    { id: 'C17', title: 'Finition Inter-lots', desc: 'Pause incompressible de 1h entre deux lots pour le repli et la mise en place.' },
    { id: 'C18', title: 'CTE + FC', desc: 'Fenêtre de 2h après le dernier lot pour le Contrôle Technique et les Formalités de Congé.' },
    { id: 'C19', title: 'Déhalage Nocturne', desc: 'Fenêtre d\'accostage restreinte à [00h-06h] pour les navires de fort tonnage (Rade forcée).' },
    { id: 'C20', title: 'Continuité Quai', desc: 'Le navire occupe physiquement le quai de son accostage jusqu\'à sa libération finale.' },
    { id: 'C21', title: 'Respect Temps de Préparation', desc: 'Le chargement physique (z=1) ne peut démarrer qu\'après la fin de la période d\'accostage et de préparation (5h).' },
    { id: 'C22', title: 'Cohérence Séquencement-Flux', desc: 'L\'activation physique du chargement d\'un lot est strictement encadrée par ses bornes de séquencement.' },
    { id: 'C23', title: 'Heure de Départ Réelle', desc: 'Définit l\'instant précis (tau_fin) où le navire quitte le poste après chargement, finition et formalités.' },
    { id: 'C24', title: 'Calcul Surestaries', desc: 'Modélise le dépassement (S_demurrage) par rapport au Laytime contractuel pour impacter l\'objectif financier.' }
  ];

  return (
    <div className="page-content" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 120px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, color: 'var(--accent-yellow)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ padding: '4px 8px', background: 'var(--accent-yellow)', color: '#000', borderRadius: 4, fontSize: 12 }}>MILP_SOLVER</span>
          MATHEMATICAL_MODEL :: C1-C24
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{
              background: 'linear-gradient(to right, #10b981, #059669)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Formulation Mathématique
          </button>
          <button 
            onClick={handleDownloadPdf}
            style={{
              background: 'linear-gradient(to right, #3b82f6, #2563eb)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Télécharger PDF
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '8px' }}>
      {/* TOPOLOGIE PHYSIQUE SECTION */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 24, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <h3 style={{ fontSize: 14, color: 'var(--accent-yellow)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Topologie Physique Modélisée (JPH)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, fontSize: 11 }}>
          <div style={{ borderLeft: '3px solid #3b82f6', paddingLeft: 12 }}>
            <span style={{ color: '#3b82f6', display: 'block', fontWeight: 600 }}>AXES U (Convoyeurs Principaux)</span>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 16, color: 'var(--text-secondary)' }}>
              <li><strong style={{color:'#e2e8f0'}}>Axe 1, Axe 2 (500 T/h)</strong> : Halls JLN (HE01-06, 18A-C)</li>
              <li><strong style={{color:'#e2e8f0'}}>Axe 3 (900 T/h)</strong> : Halls JLN (HE01-06, 18A-C)</li>
              <li><strong style={{color:'#e2e8f0'}}>TB1, TB2, TB3 (900 T/h)</strong> : Halls JLS (JFO, JFD, JFT, JFQ, JFF, 107E, 107D, 107F)</li>
            </ul>
          </div>
          <div style={{ borderLeft: '3px solid #f97316', paddingLeft: 12 }}>
            <span style={{ color: '#f97316', display: 'block', fontWeight: 600 }}>AXES P (Grues / Portiques)</span>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 16, color: 'var(--text-secondary)' }}>
              <li><strong style={{color:'#e2e8f0'}}>G1, G2</strong> : Portiques dédiés au Quai 1N</li>
              <li><strong style={{color:'#e2e8f0'}}>G3, G4</strong> : Portiques partagés pour 1Bis et 1Ter</li>
              <li><strong style={{color:'#e2e8f0'}}>GH14, GH13, GH4, GH3</strong> : Grues pour 2N, 2Bis, 2Ter</li>
            </ul>
          </div>
          <div style={{ borderLeft: '3px solid #10b981', paddingLeft: 12 }}>
            <span style={{ color: '#10b981', display: 'block', fontWeight: 600 }}>QUAIS (Postes d'Accostage)</span>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 16, color: 'var(--text-secondary)' }}>
              <li><strong style={{color:'#e2e8f0'}}>Quai 1N</strong> : Alimenté par G1, G2</li>
              <li><strong style={{color:'#e2e8f0'}}>Quais 1Bis, 1Ter</strong> : Alimentés par G3, G4</li>
              <li><strong style={{color:'#e2e8f0'}}>Quais 2N, 2Bis, 2Ter</strong> : Alimentés par GH14...GH3</li>
            </ul>
          </div>
        </div>
      </div>

      {/* OBJECTIVE FUNCTION SECTION */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 24, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <h3 style={{ fontSize: 14, color: 'var(--accent-yellow)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Objective Function (Z_Score) :: Pondération Multi-Critère</h3>
        <div style={{ padding: '20px', background: 'var(--bg-secondary)', border: '1px solid color-mix(in srgb, var(--accent-yellow) 20%, transparent)', borderRadius: 6, textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 18, color: 'var(--text-primary)', fontFamily: 'serif', marginBottom: 8 }}>
            Max(Z) = Σᵢ,ₗ,ₐ,ₕ,ₜ (wᵢ · fᵢ,ₗ,ₐ,ₕ,ₜ) − λ·Σᵢ (Wᵢ) − γ·Σ(R_ML) − ρ·Σ(R_Météo) − σ·Σᵢ (Sᵢ)
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, fontSize: 11 }}>
          <div style={{ borderLeft: '3px solid #10b981', paddingLeft: 12 }}>
            <span style={{ color: '#10b981', display: 'block', fontWeight: 600 }}>TONNAGE PONDÉRÉ (w)</span>
            <span style={{ color: 'var(--text-secondary)' }}>Maximisation du flux utile selon la priorité commerciale (wᵢ).</span>
          </div>
          <div style={{ borderLeft: '3px solid #ef4444', paddingLeft: 12 }}>
            <span style={{ color: '#ef4444', display: 'block', fontWeight: 600 }}>PÉNALITÉ ATTENTE (λ)</span>
            <span style={{ color: 'var(--text-secondary)' }}>Pénalité pour chaque heure d'attente globale (tau_deb - ETA).</span>
          </div>
          <div style={{ borderLeft: '3px solid #f472b6', paddingLeft: 12 }}>
            <span style={{ color: '#f472b6', display: 'block', fontWeight: 600 }}>SURESTARIES (σ)</span>
            <span style={{ color: 'var(--text-secondary)' }}>Pénalité sur les heures de dépassement du Laytime (Sᵢ).</span>
          </div>
          <div style={{ borderLeft: '3px solid #f97316', paddingLeft: 12 }}>
            <span style={{ color: '#f97316', display: 'block', fontWeight: 600 }}>MAINTENANCE (γ)</span>
            <span style={{ color: 'var(--text-secondary)' }}>Pénalité Risque ML liée à la fiabilité des axes de convoyage.</span>
          </div>
          <div style={{ borderLeft: '3px solid #3b82f6', paddingLeft: 12 }}>
            <span style={{ color: '#3b82f6', display: 'block', fontWeight: 600 }}>ALÉAS MÉTÉO (ρ)</span>
            <span style={{ color: 'var(--text-secondary)' }}>Pénalité pour le chargement sous conditions dégradées (Stochastique).</span>
          </div>
        </div>
      </div>

      {/* CONSTRAINTS LIST */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 24 }}>
        <h3 style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>SYSTEM CONSTRAINTS REPOSITORY</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 12 }}>
          {constraints.map((c, i) => (
            <div key={i} style={{ 
              background: 'var(--bg-secondary)', 
              padding: 12, 
              borderRadius: 6, 
              border: '1px solid var(--border)',
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start'
            }}>
              <div style={{ 
                minWidth: 32, 
                height: 32, 
                background: '#00ff4111', 
                border: '1px solid #00ff4144', 
                color: '#00ff41', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 600
              }}>
                {c.id.includes(':') ? c.id.split(':')[0] : c.id}
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 2 }}>{c.title}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>{c.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
      
      {/* Hidden academic document for PDF generation */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '210mm' }}>
        <AcademicMilpDocument ref={pdfRef} />
      </div>
      {/* Modal for Mathematical Formulation */}
      <MathFormulationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
