import { create } from 'zustand';
import Fuse from 'fuse.js';
import { ENTITIES } from './schema';
import { api } from '../../api/client';

const getNowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

export const useIngestionStore = create((set, get) => ({
  selectedNode: 'navires',
  nodesData: Object.fromEntries(ENTITIES.map(e => [e.id, { rows: [], fname: '', status: 'empty', missing: [], fileKeys: [], errors: [] }])),
  logs: [{ type: 'info', msg: 'Pipeline ETL ready.', time: getNowTime() }],
  isSyncing: false,
  syncProgress: 0,
  syncErrors: [],
  syncHistory: [],
  supabaseStatus: 'checking',
  syncEntityProgress: {},
  dataProfile: {},
  crossValErrors: [],
  healthStats: { successRate: 100, lastRun: null, duration: 0, rowsProcessed: 0 },
  alerts: [],

  setSelectedNode: (id) => set({ selectedNode: id }),

  addLog: (type, msg) => set((state) => ({
    logs: [{ type, msg, time: getNowTime() }, ...state.logs].slice(0, 50)
  })),

  addAlert: (type, title, msg) => set((state) => ({
    alerts: [{ id: Date.now(), type, title, msg, time: getNowTime() }, ...state.alerts].slice(0, 20)
  })),

  clearAlerts: () => set({ alerts: [] }),

  clearNode: (id) => set((state) => {
    state.addLog('info', `Cleared data for ${id}`);
    const newState = {
      nodesData: {
        ...state.nodesData,
        [id]: { rows: [], fname: '', status: 'empty', missing: [], fileKeys: [], errors: [] }
      }
    };
    return newState;
  }),

  checkSupabaseStatus: async () => {
    try {
      const res = await api.checkSupabaseStatus();
      set({ supabaseStatus: res.status });
      if (res.status === 'connected') {
        const histRes = await api.getSyncHistory();
        set({ syncHistory: histRes.history || [] });
        // Seed health stats from backend aggregated metrics
        if (histRes.health) {
          set(s => ({ healthStats: { ...s.healthStats, successRate: histRes.health.successRate } }));
        }
      }
    } catch (e) {
      set({ supabaseStatus: 'offline' });
    }
  },

  setSchedule: async (entity, frequency) => {
    try {
      await api.setSchedule(entity, frequency);
      get().addLog('ok', `Cron job for ${entity.toUpperCase()} scheduled: ${frequency}`);
      get().addAlert('info', 'Schedule Updated', `Automated sync configured for ${entity.toUpperCase()} — ${frequency}.`);
    } catch (e) {
      get().addLog('err', `Failed to schedule ${entity}: ${e.message}`);
    }
  },

  computeProfile: (id, rows) => set((state) => {
    if (!rows || rows.length === 0) return;
    const cols = Object.keys(rows[0]);
    const profile = {};
    cols.forEach(c => {
      const values = rows.map(r => r[c]).filter(v => v !== undefined && v !== null && v !== '');
      const unique = new Set(values).size;
      const numValues = values.map(v => Number(v)).filter(v => !isNaN(v));
      profile[c] = {
        unique,
        missing: rows.length - values.length,
        isNumeric: numValues.length === values.length && values.length > 0,
      };
      if (profile[c].isNumeric) {
        profile[c].min = Math.min(...numValues);
        profile[c].max = Math.max(...numValues);
        profile[c].mean = (numValues.reduce((a, b) => a + b, 0) / numValues.length).toFixed(2);
      }
    });
    return { dataProfile: { ...state.dataProfile, [id]: profile } };
  }),

  autoFixData: (id) => set((state) => {
    const node = state.nodesData[id];
    if (!node || !node.rows.length) return state;
    
    const profile = state.dataProfile[id];
    if (!profile) return state;

    let fixedCount = 0;
    const newRows = node.rows.map(row => {
      const newRow = { ...row };
      Object.keys(newRow).forEach(col => {
        const val = newRow[col];
        // Impute missing numeric values with mean
        if ((val === undefined || val === null || val === '') && profile[col]?.isNumeric && profile[col].mean) {
          newRow[col] = parseFloat(profile[col].mean);
          fixedCount++;
        }
        // Cap outliers (values > mean + 3*std_dev pseudo-logic, using simple threshold here)
        if (typeof val === 'number' && profile[col]?.mean) {
          const mean = parseFloat(profile[col].mean);
          const maxAllowed = mean * 3; // simplistic outlier cap
          if (val > maxAllowed) {
            newRow[col] = maxAllowed;
            fixedCount++;
          }
        }
      });
      return newRow;
    });

    state.addLog('ok', `Auto-fixed ${fixedCount} values in ${id} using profiling data.`);
    state.addAlert('success', 'Auto-Fix Applied', `${fixedCount} values have been corrected for ${id}.`);
    
    // Recompute profile and validate
    setTimeout(() => {
      get().computeProfile(id, newRows);
      get().crossValidate();
    }, 0);

    return {
      nodesData: {
        ...state.nodesData,
        [id]: { ...node, rows: newRows }
      }
    };
  }),

  crossValidate: () => set((state) => {
    const { nodesData } = state;
    const errors = [];
    const lots = nodesData.lots.rows;
    const navires = nodesData.navires.rows;
    const stocks = nodesData.stocks.rows;

    import('./schema').then(({ KNOWN_HALLS, KNOWN_QUALITES }) => {
      if (lots.length && navires.length) {
        const navireNoms = new Set(navires.map(n => n.nom));
        lots.forEach(l => {
          if (!navireNoms.has(l.navire_nom)) {
            errors.push(`Lot error: Vessel ${l.navire_nom} is not defined in Navires.`);
          }
        });
      }
      if (stocks.length) {
        stocks.forEach(s => {
          if (!KNOWN_HALLS.includes(s.hall)) errors.push(`Stock error: Hall ${s.hall} is unknown.`);
          if (!KNOWN_QUALITES.includes(s.qualite)) errors.push(`Stock error: Quality ${s.qualite} is unknown.`);
        });
      }
      set({ crossValErrors: errors });
    });
    return {};
  }),

  parseData: (id, data, fileName) => set((state) => {
    if (!data || data.length === 0) {
      state.addLog('err', `File ${fileName} is empty.`);
      return state;
    }

    const entity = ENTITIES.find(e => e.id === id);
    const fileKeys = Object.keys(data[0] || {});
    
    // Fuzzy Matching with Fuse
    const fuse = new Fuse(fileKeys, { threshold: 0.3 });
    const missing = [];
    const autoMappedData = data.map(row => ({ ...row }));

    entity.fields.forEach(f => {
      if (f.r && !fileKeys.includes(f.n)) {
        // Try fuzzy match
        const match = fuse.search(f.n);
        if (match.length > 0) {
          const matchedKey = match[0].item;
          autoMappedData.forEach(r => {
            r[f.n] = r[matchedKey];
          });
          state.addLog('info', `Auto-mapped ${matchedKey} -> ${f.n}`);
        } else {
          missing.push(f.n);
        }
      }
    });

    if (missing.length > 0) {
      state.addLog('err', `${entity.name}: Missing columns. Manual mapping required.`);
      return {
        nodesData: {
          ...state.nodesData,
          [id]: { rows: autoMappedData, fname: fileName, status: 'mapping_req', missing, fileKeys, errors: [] }
        },
        selectedNode: 'mapper'
      };
    }

    // Validate with Zod
    const errors = [];
    const validRows = [];
    autoMappedData.forEach((row, idx) => {
      const res = entity.schema.safeParse(row);
      if (res.success) {
        validRows.push(res.data);
      } else {
        errors.push(`Row ${idx + 1}: ${res.error.errors.map(e => e.message).join(', ')}`);
      }
    });

    if (errors.length > 0) {
      state.addLog('err', `${entity.name}: Schema validation failed for ${errors.length} rows.`);
      return {
        nodesData: {
          ...state.nodesData,
          [id]: { rows: autoMappedData, fname: fileName, status: 'error', missing: [], fileKeys, errors }
        },
        selectedNode: 'valid'
      };
    }

    state.addLog('ok', `${entity.name} parsed and validated ${validRows.length} rows.`);
    setTimeout(() => {
      get().computeProfile(id, validRows);
      get().crossValidate();
    }, 0);
    return {
      nodesData: {
        ...state.nodesData,
        [id]: { rows: validRows, fname: fileName, status: 'loaded', missing: [], fileKeys, errors: [] }
      }
    };
  }),

  mapColumn: (id, expectedCol, fileCol) => set((state) => {
    if (!fileCol) return state;
    
    const node = state.nodesData[id];
    const newRows = node.rows.map(r => ({ ...r, [expectedCol]: r[fileCol] }));
    const newMissing = node.missing.filter(m => m !== expectedCol);
    
    // If no more missing, try validation
    if (newMissing.length === 0) {
      const entity = ENTITIES.find(e => e.id === id);
      const errors = [];
      const validRows = [];
      newRows.forEach((row, idx) => {
        const res = entity.schema.safeParse(row);
        if (res.success) validRows.push(res.data);
        else errors.push(`Row ${idx + 1}: ${res.error.errors.map(e => e.message).join(', ')}`);
      });

      if (errors.length > 0) {
        state.addLog('err', `Schema validation failed after mapping for ${id}.`);
        return {
          nodesData: {
            ...state.nodesData,
            [id]: { ...node, rows: newRows, missing: [], status: 'error', errors }
          }
        };
      }

      state.addLog('ok', `Mapping complete. Data validated for ${id}.`);
      setTimeout(() => {
        get().computeProfile(id, validRows);
        get().crossValidate();
      }, 0);
      return {
        nodesData: {
          ...state.nodesData,
          [id]: { ...node, rows: validRows, missing: [], status: 'loaded', errors: [] }
        }
      };
    }

    state.addLog('info', `Mapped ${fileCol} -> ${expectedCol} for ${id}`);
    return {
      nodesData: {
        ...state.nodesData,
        [id]: { ...node, rows: newRows, missing: newMissing }
      }
    };
  }),

  syncData: async () => {
    const state = get();
    const { nodesData, addLog } = state;
    const loadedNodes = Object.entries(nodesData).filter(([_, n]) => n.status === 'loaded' && n.rows.length > 0);
    
    if (loadedNodes.length === 0 || state.isSyncing) return;
    
    set({ isSyncing: true, syncProgress: 0, syncErrors: [], syncEntityProgress: {} });
    addLog('info', 'Starting ETL Sync to Supabase...');
    
    let step = 0;
    const errs = [];
    const newHistory = [];
    
    for (const [eid, n] of loadedNodes) {
      set(s => ({ syncEntityProgress: { ...s.syncEntityProgress, [eid]: 'syncing' } }));
      try {
        const res = await api.ingestData(eid, n.rows);
        addLog('ok', `[${eid.toUpperCase()}] Synced ${res.inserted || n.rows.length} rows.`);
        set(s => ({ syncEntityProgress: { ...s.syncEntityProgress, [eid]: 'success' } }));
        const entry = { entity: eid, rows: res.inserted || n.rows.length, status: 'success' };
        newHistory.push(entry);
        try { await api.addSyncHistory(entry); } catch (e) {}
      } catch (err) {
        addLog('err', `[${eid.toUpperCase()}] Sync failed: ${err.message}`);
        errs.push(`${eid}: ${err.message}`);
        set(s => ({ syncEntityProgress: { ...s.syncEntityProgress, [eid]: 'error' } }));
        const entry = { entity: eid, rows: 0, status: 'error', error: err.message };
        newHistory.push(entry);
        try { await api.addSyncHistory(entry); } catch (e) {}
      }
      step++;
      set({ syncProgress: (step / loadedNodes.length) * 100 });
      await new Promise(r => setTimeout(r, 400)); // Visual delay
    }
    
    try {
      const histRes = await api.getSyncHistory();
      set({ syncHistory: histRes.history || [] });
    } catch(e) {}

    set({ isSyncing: false, syncErrors: errs });
    if (errs.length === 0) {
      addLog('ok', 'Full ETL sync completed successfully!');
      state.addAlert('success', 'Sync Successful', 'All nodes have been successfully synchronized to Supabase.');
      set(s => ({ healthStats: { ...s.healthStats, successRate: 100, lastRun: getNowTime(), duration: step * 0.4, rowsProcessed: loadedNodes.reduce((acc, [_,n]) => acc + n.rows.length, 0) } }));
    } else {
      addLog('err', `Sync completed with ${errs.length} errors.`);
      state.addAlert('error', 'Sync Errors', `Pipeline sync encountered ${errs.length} errors.`);
      set(s => ({ healthStats: { ...s.healthStats, successRate: Math.max(0, 100 - (errs.length * 20)), lastRun: getNowTime() } }));
    }
  },

  exportPipeline: () => {
    const state = get();
    // Simplified export of mapping status
    const exportData = {
      version: '1.0',
      timestamp: getNowTime(),
      nodesStatus: Object.fromEntries(Object.entries(state.nodesData).map(([k, v]) => [k, { status: v.status, fname: v.fname, rowCount: v.rows.length }]))
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pipeline_config_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    state.addLog('info', 'Pipeline configuration exported.');
  },

  importPipeline: (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.version) {
          get().addLog('ok', `Pipeline configuration imported (Version ${data.version})`);
          get().addAlert('info', 'Pipeline Imported', `Configuration restored from ${file.name}`);
        }
      } catch (err) {
        get().addLog('err', 'Failed to import pipeline. Invalid JSON.');
      }
    };
    reader.readAsText(file);
  }
}));
