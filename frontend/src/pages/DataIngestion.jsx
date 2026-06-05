import { useState, useEffect } from 'react';
import './DataIngestion.css';

import SidebarLibrary from '../components/DataIngestion/SidebarLibrary';
import CanvasArea from '../components/DataIngestion/CanvasArea';
import ConfigPanel from '../components/DataIngestion/ConfigPanel';
import { useIngestionStore } from '../components/DataIngestion/store';

export default function DataIngestion() {
  const [showLib, setShowLib] = useState(true);
  const [showCfg, setShowCfg] = useState(true);
  
  const { checkSupabaseStatus } = useIngestionStore();

  useEffect(() => {
    if (checkSupabaseStatus) checkSupabaseStatus();
  }, [checkSupabaseStatus]);

  return (
    <div className="din">
      <SidebarLibrary showLib={showLib} />

      <div className="din-canvas">
        {/* Toolbar */}
        <div className="din-toolbar">
          <button className={`din-tb-btn ${showLib ? 'on' : ''}`} title="Node Library" onClick={() => setShowLib(p => !p)}>☰</button>
          <button className={`din-tb-btn ${showCfg ? 'on' : ''}`} title="Config Panel" onClick={() => setShowCfg(p => !p)}>⚙</button>
        </div>

        {/* React Flow Canvas */}
        <CanvasArea />

        {/* Bottom config */}
        <div className={`din-config ${showCfg ? '' : 'hidden'}`}>
          <ConfigPanel />
        </div>
      </div>
    </div>
  );
}
