import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { EncryptionService } from './EncryptionService';
import { supabase } from '../supabaseClient'; 
import TrainingVoiceModule from './TrainingVoiceModule';
import GalaxyView from './GalaxyView'; 

/* Import der modularen CSS-Datei für den Glass-Look */
import '../styles/AllianceModule.css';

// --- SICHERHEITS-UPDATE: ID aus der Umgebungsvariable holen ---
const ADMIN_UUID = process.env.REACT_APP_ADMIN_ID;
const NEON_BLUE = '#00f2ff';
const MATRIX_GREEN = '#5da05d';

const AllianceModule = ({ nickname }) => {
  const [allianceData, setAllianceData] = useState(null);
  const [universe, setUniverse] = useState(localStorage.getItem('last_uni') || '');
  const [loading, setLoading] = useState(false);
  const [rawReport, setRawReport] = useState('');
  const [targetName, setTargetName] = useState('');
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [showAiTraining, setShowAiTraining] = useState(false);
  const [showGalaxyView, setShowGalaxyView] = useState(false); 
  const [view, setView] = useState('selection'); 
  const [inputAllyName, setInputAllyName] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [inputJoinKey, setInputJoinKey] = useState(''); 

  // --- IDENTITÄT-ZENTRALE ---
  const forceIdentity = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    let user = session?.user;
    if (!user) {
      const { data: anon } = await supabase.auth.signInAnonymously();
      user = anon?.user;
    }
    // Checkt jetzt gegen die versteckte Variable
    if (user?.id === ADMIN_UUID || nickname === 'Luzifer333') {
      setIsAdmin(true);
    }
    return user;
  }, [nickname]);

  // --- PARSER ---
  const parseReport = (text) => {
    let data = { resources: { Roheisen: '0', Metall: '0', Kryptonit: '0', Spice: '0' }, buildings: [], fleet: [], defense: [] };
    if (!text) return data;
    try {
      const si = JSON.parse(text);
      if (si.planet?.resources) {
        const res = si.planet.resources;
        data.resources = {
          Roheisen: res[0]?.toLocaleString('de-DE') || '0',
          Metall: res[1]?.toLocaleString('de-DE') || '0',
          Kryptonit: res[2]?.toLocaleString('de-DE') || '0',
          Spice: res[3]?.toLocaleString('de-DE') || '0'
        };
      }
      if (si.planet?.buildings) data.buildings = Object.values(si.planet.buildings).map(b => ({ name: b.name, count: b.level.toString() }));
      if (si.planet?.ships) data.fleet = si.planet.ships.map(s => ({ name: s.name, count: s.count.toString() }));
      if (si.planet?.defense) data.defense = si.planet.defense.map(d => ({ name: d.name, count: d.count.toString() }));
      return data;
    } catch (e) { return data; }
  };

  const fetchReports = useCallback(async () => {
    if (!allianceData?.id) return;
    const { data } = await supabase.from('alliance_reports').select('*').eq('ally_id', allianceData.id);
    if (data) {
      const decrypted = data.map(row => {
        try {
          // EncryptionService.decrypt gibt jetzt direkt die Daten zurück (oder null)
          const content = EncryptionService.decrypt(row.encrypted_data, allianceData.key);
          return (content && content.universe === universe) ? content : null;
        } catch(e) { return null; }
      }).filter(item => item !== null);
      setAllianceData(prev => ({ ...prev, targets: decrypted.sort((a, b) => b.timestamp - a.timestamp) }));
    }
  }, [allianceData?.id, allianceData?.key, universe]);

  const loadProfileContext = useCallback(async (uni) => {
    if (!uni) return;
    setLoading(true);
    try {
      const user = await forceIdentity();
      const uniKey = uni.toLowerCase();
      const localId = localStorage.getItem(`ally_id_${uniKey}`);
      const localKey = localStorage.getItem(`ally_key_${uniKey}`);
      const localName = localStorage.getItem(`ally_name_${uniKey}`);
      if (localId && localKey) {
        setAllianceData({ id: localId, name: localName || "STATION", key: localKey, targets: [] });
      } else {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (profile && profile[`ally_${uniKey}`] && profile[`key_${uniKey}`]) {
           const decKey = EncryptionService.decrypt(profile[`key_${uniKey}`], user.id);
           const { data: ally } = await supabase.from('alliances').select('name').eq('id', profile[`ally_${uniKey}`]).maybeSingle();
           if (ally && decKey) {
             setAllianceData({ id: profile[`ally_${uniKey}`], name: ally.name, key: decKey, targets: [] });
             localStorage.setItem(`ally_id_${uniKey}`, profile[`ally_${uniKey}`]);
             localStorage.setItem(`ally_key_${uniKey}`, decKey);
             localStorage.setItem(`ally_name_${uniKey}`, ally.name);
           }
        }
      }
    } catch (e) { console.error("Sync Error", e); }
    setLoading(false);
  }, [forceIdentity]);

  useEffect(() => { if (universe) loadProfileContext(universe); }, [universe, loadProfileContext]);
  useEffect(() => { if (allianceData?.id) fetchReports(); }, [allianceData?.id, fetchReports]);

  const handleCreateAlliance = async () => {
    const cleanName = inputAllyName.trim().toUpperCase();
    if (!cleanName || !inputPassword || !universe) return alert("Daten unvollständig!");
    setLoading(true);
    try {
      const user = await forceIdentity();
      const secretKey = `ALLY-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
      
      // Verschlüsselung des Master-Keys für die DB
      const encryptedMasterKey = EncryptionService.encrypt(secretKey, inputPassword);
      
      const { data: newAlly, error } = await supabase.from('alliances').insert([{ name: cleanName, universe, master_key: encryptedMasterKey }]).select().single();
      if (error) throw error;
      
      const encKeyForProfile = EncryptionService.encrypt(secretKey, user.id);
      await supabase.from('profiles').update({ [`ally_${universe.toLowerCase()}`]: newAlly.id, [`key_${universe.toLowerCase()}`]: encKeyForProfile }).eq('id', user.id);
      setAllianceData({ id: newAlly.id, name: newAlly.name, key: secretKey, targets: [] });
    } catch (e) { alert("Fehler: " + e.message); }
    setLoading(false);
  };

  const handleJoinAlliance = async () => {
    const cleanName = inputJoinKey.trim().toUpperCase();
    if (!cleanName || !inputPassword || !universe) return alert("Name/Passwort erforderlich!");
    setLoading(true);
    try {
      const user = await forceIdentity();
      const { data: ally, error } = await supabase.from('alliances').select('*').eq('universe', universe).eq('name', cleanName).maybeSingle(); 
      if (!ally || error) throw new Error("Allianz nicht gefunden.");
      
      const decryptedAllyKey = EncryptionService.decrypt(ally.master_key, inputPassword);
      if (!decryptedAllyKey) throw new Error("Falsches Passwort!");
      
      const encKeyForProfile = EncryptionService.encrypt(decryptedAllyKey, user.id);
      await supabase.from('profiles').update({ [`ally_${universe.toLowerCase()}`]: ally.id, [`key_${universe.toLowerCase()}`]: encKeyForProfile }).eq('id', user.id);
      setAllianceData({ id: ally.id, name: ally.name, key: decryptedAllyKey, targets: [] });
    } catch (e) { alert("Fehler: " + e.message); }
    setLoading(false);
  };

  const DataBox = ({ label, value, color = MATRIX_GREEN, isLarge = false }) => (
    <div className={`data-box ${isLarge ? 'large' : ''}`}>
      <div className="label">{label}</div>
      <div className="value" style={{ color }}>{value || '0'}</div>
    </div>
  );

  const renderReportContent = (isZoom) => {
    const d = parseReport(selectedTarget.fullReport);
    const displayName = selectedTarget.display_name || selectedTarget.label;
    return (
      <div className="fade-in report-container">
        <div className="report-header">
          <span>{displayName} ({selectedTarget.coords})</span>
          <span className="close-icon" onClick={() => isZoom ? setIsZoomed(false) : setSelectedTarget(null)}>×</span>
        </div>
        <div className="ai-hash">AI-ID (HASH): {selectedTarget.label}</div>
        <div className="resource-grid">
          <DataBox label="Roheisen" value={d.resources.Roheisen} isLarge={isZoom} />
          <DataBox label="Metall" value={d.resources.Metall} isLarge={isZoom} />
          <DataBox label="Kryptonit" value={d.resources.Kryptonit} isLarge={isZoom} />
          <DataBox label="Spice" value={d.resources.Spice} isLarge={isZoom} />
        </div>
        <div className="detail-grid">
          {d.buildings.map((u, i) => <DataBox key={`b-${i}`} label={u.name} value={u.count} isLarge={isZoom} />)}
          {d.fleet.map((u, i) => <DataBox key={`f-${i}`} label={u.name} value={u.count} color={NEON_BLUE} isLarge={isZoom} />)}
          {d.defense.map((u, i) => <DataBox key={`d-${i}`} label={u.name} value={u.count} color="#ffaa00" isLarge={isZoom} />)}
        </div>
      </div>
    );
  };

  // --- RENDERING ---
  return (
    <>
      {createPortal(
        <>
          {!showGalaxyView && (
            <div 
              className="monitor-hotspot-right" 
              onClick={() => setShowGalaxyView(true)}
            >
              <div className="hotspot-label">GALAXY-ANSICHT</div>
            </div>
          )}

          {showGalaxyView && (
            <GalaxyView 
              universe={universe} 
              allianceId={allianceData?.id}
              allianceKey={allianceData?.key} 
              onClose={() => setShowGalaxyView(false)} 
            />
          )}
        </>,
        document.body
      )}

      {!allianceData ? (
        <div className="alliance-terminal-auth ally-glass-box">
          <h3>ALLIANZ TERMINAL</h3>
          {view === 'selection' && (
            <div className="auth-selection">
              <select className="main-select" value={universe} onChange={(e) => { setUniverse(e.target.value); localStorage.setItem('last_uni', e.target.value); }}>
                <option value="">-- UNIVERSUM WÄHLEN --</option>
                {["Retro", "Nexus", "Sirius", "Genesis"].map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
              </select>
              <div className="auth-buttons">
                <button className="action-btn" onClick={() => setView('create')}>GRÜNDEN</button>
                <button className="action-btn" onClick={() => setView('join')}>BEITRETEN</button>
              </div>
            </div>
          )}
          {view === 'create' && (
            <div className="auth-form">
              <input className="main-input" placeholder="Name der Allianz" value={inputAllyName} onChange={e => setInputAllyName(e.target.value)} />
              <input className="main-input" type="password" placeholder="Passwort" value={inputPassword} onChange={e => setInputPassword(e.target.value)} />
              <button className="action-btn" onClick={handleCreateAlliance}>GRÜNDEN</button>
              <button className="delete-btn" onClick={() => setView('selection')}>ZURÜCK</button>
            </div>
          )}
          {view === 'join' && (
            <div className="auth-form">
              <input className="main-input" placeholder="Exakter Allianz Name" value={inputJoinKey} onChange={e => setInputJoinKey(e.target.value)} />
              <input className="main-input" type="password" placeholder="Passwort" value={inputPassword} onChange={e => setInputPassword(e.target.value)} />
              <button className="action-btn" onClick={handleJoinAlliance}>BEITRETEN</button>
              <button className="delete-btn" onClick={() => setView('selection')}>ZURÜCK</button>
            </div>
          )}
        </div>
      ) : (
        <div className="alliance-module-container">
          {isZoomed && selectedTarget && (
            <div className="zoom-overlay">
              <div className="zoom-content ally-glass-box">{renderReportContent(true)}</div>
            </div>
          )}

          <div className="module-header ally-glass-box">
            <div className="ally-info">
              <h3>{allianceData.name}</h3>
              <div className="status-sub">UNIT-ZUGRIFF: {universe.toUpperCase()} | STATUS: AKTIV</div>
            </div>
            <div className="header-actions">
               {isAdmin && <span className="admin-badge">ADMIN</span>}
               <button className="delete-btn" onClick={() => { localStorage.clear(); window.location.reload(); }}>LOGOUT</button>
            </div>
          </div>
          
          <div className="main-module-grid">
            <div className="sidebar-grid">
              <div className="ally-glass-box input-section">
                <div className="section-label">Neuen Scan einspeisen:</div>
                <input className="main-input" placeholder="Alias (z.B. Spielername)" value={targetName} onChange={e => setTargetName(e.target.value)} />
                <textarea className="main-input scrollbar-custom" placeholder="SI-JSON Daten hier einfügen..." value={rawReport} onChange={e => setRawReport(e.target.value)} />
                <button className="action-btn" onClick={async () => {
                  if(!rawReport) return;
                  let realName = targetName;
                  let coords = "Unknown";
                  try {
                      const si = JSON.parse(rawReport);
                      realName = targetName || si.planet?.name || "Unbekannt";
                      coords = si.planet?.coords || "Unknown";
                  } catch (e) {
                      const m = rawReport.match(/\[(\d{1,2}:\d{1,3}:\d{1,2})\]/);
                      if (m) coords = m[0];
                  }
                  
                  // HASHING für ID
                  const identifierForAI = EncryptionService.hashID(realName, allianceData.key);
                  
                  // PAYLOAD erstellen
                  const payload = { timestamp: Date.now(), label: identifierForAI, display_name: realName, coords, universe, fullReport: rawReport };
                  
                  // VERSCHLÜSSELUNG
                  const enc = EncryptionService.encrypt(payload, allianceData.key);
                  
                  await supabase.from('alliance_reports').insert([{ ally_id: allianceData.id, encrypted_data: enc }]);
                  setRawReport(''); setTargetName(''); fetchReports();
                }}>SCAN ÜBERTRAGEN (SYNC)</button>
              </div>
              
              {isAdmin && (
                <div className="admin-section ally-glass-box">
                  {!showAiTraining ? (
                    <button onClick={() => setShowAiTraining(true)} className="admin-toggle-btn">[ ADMIN: TRAINING ]</button>
                  ) : (
                    <div className="training-container">
                        <div className="training-header">
                          <span>CORE TRAINING ACTIVE</span>
                          <button onClick={() => setShowAiTraining(false)} className="close-train">[ X ]</button>
                        </div>
                        <TrainingVoiceModule nickname={nickname} />
                    </div>
                  )}
                </div>
              )}

              <div className="ally-glass-box target-list scrollbar-custom">
                {allianceData.targets?.length > 0 ? allianceData.targets.map((t, i) => (
                  <div key={i} onClick={() => setSelectedTarget(t)} className={`target-item ${selectedTarget === t ? 'active' : ''}`}>
                    <div className="target-top">
                      <span className="name">{t.display_name || t.label}</span>
                      <span className="zoom-trigger" onClick={(e) => { e.stopPropagation(); setIsZoomed(true); setSelectedTarget(t); }}>🔍</span>
                    </div>
                    <div className="coords">{t.coords}</div>
                  </div>
                )) : <div className="no-data">KEINE DATEN</div>}
              </div>
            </div>

            <div className="ally-glass-box detail-view">
                {selectedTarget ? renderReportContent(false) : <div className="terminal-placeholder">TERMINAL BEREIT</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AllianceModule;