import { useEffect } from 'react';

export default function MathFormulationModal({ isOpen, onClose }) {
  useEffect(() => {
    if (isOpen && window.MathJax) {
      window.MathJax.typesetPromise();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white text-gray-900 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 p-2 bg-gray-100 rounded-full transition-colors"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-10 font-serif leading-relaxed">
          <header className="border-b-2 border-blue-600 pb-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Formulation Mathématique du Problème de Planification Portuaire
            </h1>
            <p className="text-lg text-blue-600 font-semibold italic">
              AI Loading Planner — OCP Jorf Lasfar
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Modèle de Programmation Linéaire en Nombres Entiers Mixtes (MILP)
            </p>
          </header>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">
              1. Classification du Problème
            </h2>
            <p className="text-justify text-gray-700">
              {`Le problème de planification du chargement est modélisé comme un Multi-Resource Constrained Scheduling Problem (MRCSP). 
              L'objectif est d'optimiser l'allocation des navires aux quais et le séquencement des lots de chargement sous contraintes 
              de ressources (axes, halls, stocks) et d'aléas (météo, pannes).`}
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">
              2. Ensembles et Indices
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-3 text-left">Symbole</th>
                    <th className="border border-gray-300 p-3 text-left">Description</th>
                    <th className="border border-gray-300 p-3 text-left">Indice</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-3">{`\\( \\mathcal{N} \\)`}</td>
                    <td className="border border-gray-300 p-3">Ensemble des navires</td>
                    <td className="border border-gray-300 p-3">{`\\( i \\)`}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">{`\\( \\mathcal{L}_i \\)`}</td>
                    <td className="border border-gray-300 p-3">{`Ensemble des lots du navire \\( i \\)`}</td>
                    <td className="border border-gray-300 p-3">{`\\( l \\)`}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">{`\\( \\mathcal{Q} \\)`}</td>
                    <td className="border border-gray-300 p-3">Ensemble des quais disponibles</td>
                    <td className="border border-gray-300 p-3">{`\\( q \\)`}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">{`\\( \\mathcal{A} \\)`}</td>
                    <td className="border border-gray-300 p-3">Ensemble des axes de convoyage</td>
                    <td className="border border-gray-300 p-3">{`\\( a \\)`}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">{`\\( \\mathcal{H} \\)`}</td>
                    <td className="border border-gray-300 p-3">Ensemble des halls de stockage</td>
                    <td className="border border-gray-300 p-3">{`\\( h \\)`}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">{`\\( \\mathcal{K} \\)`}</td>
                    <td className="border border-gray-300 p-3">Ensemble des qualités de produit</td>
                    <td className="border border-gray-300 p-3">{`\\( k \\)`}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">{`\\( \\mathcal{T} \\)`}</td>
                    <td className="border border-gray-300 p-3">Horizon temporel discrétisé</td>
                    <td className="border border-gray-300 p-3">{`\\( t \\)`}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">
              3. Variables de Décision
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">3.1 Variables Binaires</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>{`\\( x_{i,q,t} \\in \\{0, 1\\} \\) : Occupation du quai \\( q \\) par le navire \\( i \\) à l'instant \\( t \\).`}</li>
                  <li>{`\\( y_{i,l,a,h,t} \\in \\{0, 1\\} \\) : Activation de l'axe \\( a \\) pour le lot \\( l \\) depuis le hall \\( h \\) à l'instant \\( t \\).`}</li>
                  <li>{`\\( z_{i,t} \\in \\{0, 1\\} \\) : État de chargement actif du navire \\( i \\).`}</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">3.2 Variables Continues</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>{`\\( f_{i,l,a,h,t} \\geq 0 \\) : Flux de tonnage (t/h) transféré.`}</li>
                  <li>{`\\( W_i \\geq 0 \\) : Temps d'attente cumulé du navire \\( i \\).`}</li>
                  <li>{`\\( s_{h,k,t} \\geq 0 \\) : Niveau de stock de qualité \\( k \\) dans le hall \\( h \\).`}</li>
                  <li>{`\\( S_{dem, i} \\geq 0 \\) : Heures de dépassement du laytime (Surestaries) pour le navire \\( i \\).`}</li>
                  <li>{`\\( \\tau_{fin, i} \\) : Heure de départ réelle du navire \\( i \\).`}</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">
              4. Fonction Objectif (Scalarisation Multi-Critère)
            </h2>
            <p className="text-gray-700 mb-4">
              Le modèle maximise la performance globale via un score pondéré arbitrant entre le flux utile et les risques opérationnels :
            </p>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex justify-center overflow-x-auto mb-6">
              <div className="text-xl">
                {`\\[ \\max \\quad Z = \\sum_{i,l,a,h,t} w_i \\cdot f_{i,l,a,h,t} - \\lambda \\sum_i W_i - \\gamma \\sum R_{ML} - \\rho \\sum R_{meteo} - \\sigma \\sum_i S_i \\]`}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div className="p-3 bg-blue-50 rounded border border-blue-100">
                <strong>Tonnage Pondéré :</strong> {`\\( \\sum w_i \\cdot f_{i,l,a,h,t} \\)`}
              </div>
              <div className="p-3 bg-red-50 rounded border border-red-100">
                <strong>Pénalité Surestaries :</strong> {`\\( \\sigma \\sum S_i \\)`}
              </div>
              <div className="p-3 bg-purple-50 rounded border border-purple-100">
                <strong>Pénalité Attente :</strong> {`\\( \\lambda \\sum W_i \\)`}
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">
              5. Contraintes Principales
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">C1. Respect du tonnage déclaré :</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex justify-center">
                  {`\\[ \\sum_{a,h,t} f_{i,l,a,h,t} \\leq TD_{i,l} \\quad \\forall i \\in \\mathcal{N}, l \\in \\mathcal{L}_i \\]`}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">C2. Capacité physique des axes :</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex justify-center">
                  {`\\[ f_{i,l,a,h,t} \\leq C_a \\cdot y_{i,l,a,h,t} \\quad \\forall i, l, a, h, t \\]`}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">C3. Unicité de l'axe :</h3>
                <p className="text-sm text-gray-600 mb-2">Un axe ne peut servir qu'un seul navire à la fois.</p>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex justify-center">
                  {`\\[ \\sum_{i,l,h} y_{i,l,a,h,t} \\leq 1 \\quad \\forall a \\in \\mathcal{A}, t \\in \\mathcal{T} \\]`}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">C4. Dynamique des Stocks :</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex justify-center">
                  {`\\[ s_{h,k,t} = s_{h,k,t-1} - \\sum_{i,l : k_{i,l}=k} \\sum_{a} f_{i,l,a,h,t} \\quad \\forall h, k, t \\]`}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">C24. Calcul des Surestaries :</h3>
                <p className="text-sm text-gray-600 mb-2">Le dépassement est calculé par rapport au temps alloué (Laytime).</p>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex justify-center">
                  {`\\[ S_{dem, i} \\geq (\\tau_{fin, i} - \alpha_i) - \text{Laytime}_i \\quad \\forall i \\in \\mathcal{N} \\]`}
                </div>
              </div>
            </div>
          </section>

          <footer className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm italic">
            <p>&copy; 2026 AI Loading Planner — Jorf Phosphate Hub Optimization Engine</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
