import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { EncryptionService } from './EncryptionService';
import '../styles/GalaxyView.css';

const GalaxyView = ({ universe, allianceId, allianceKey, onClose }) => {
  // --- STATE ---
  const [currentGalaxy, setCurrentGalaxy] = useState(1);
  const [zoom, setZoom] = useState(0.8); // Start-Zoom etwas weiter weg für Übersicht
  const [rotation, setRotation] = useState(0);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [camOffset, setCamOffset] = useState({ x: 0, y: 0 });
  
  const [astroList, setAstroList] = useState([]);
  const [visibleEnemyAstros, setVisibleEnemyAstros] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMode, setEditMode] = useState(null); 
  const [scannerLevel, setScannerLevel] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Filter für die Listen
  const [listFilter, setListFilter] = useState('');

  // SICHERHEITS-CHECK
  useEffect(() => {
    if (!allianceKey) {
        console.error("SECURITY ALERT: Missing Alliance Key. Operation aborted.");
    }
  }, [allianceKey]);

  const SYSTEM_COUNT = 400;
  const RADIUS = 600; // Radius des Galaxiekreises

  // Reichweiten-Berechnung
  const calculateRange = (level) => {
    const lvl = parseInt(level) || 0;
    return lvl > 0 ? Math.pow(lvl, 2) + lvl + 1 : 0;
  };

  // --- DATEN LADEN ---
  const fetchAstros = useCallback(async () => {
    if (!allianceId || !allianceKey) return;

    try {
      const allySearchHash = EncryptionService.hashID(allianceId, allianceKey);
      if (!allySearchHash) throw new Error("Hash generation failed");

      const { data, error } = await supabase
        .from('asteroid_scans')
        .select('*')
        .eq('ai_ally_hash', allySearchHash)
        .eq('universe', universe)
        .eq('galaxy', currentGalaxy);

      if (error) throw error;

      if (data) {
        const decryptedData = data.map(item => {
          const content = EncryptionService.decrypt(item.encrypted_content, allianceKey);
          return content ? { ...item, ...content } : null;
        }).filter(i => i !== null);
        
        setAstroList(decryptedData);
      }
    } catch (err) {
      console.error("Secure Fetch error:", err);
    }
  }, [allianceId, allianceKey, universe, currentGalaxy]);

  useEffect(() => { fetchAstros(); }, [fetchAstros]);

  // --- LOGIK: FEINDE EINBLENDEN ---
  const toggleEnemyAstro = (system) => {
    setVisibleEnemyAstros(prev => {
      const sys = parseInt(system);
      if (prev.includes(sys)) return prev.filter(s => s !== sys);
      if (prev.length < 3) return [...prev, sys];
      return prev;
    });
  };

  // --- GRAFIK: SCANNER RINGE (Das Filigrane) ---
  const renderScannerArc = (astro) => {
    if (!astro || !astro.range) return null;
    const sysPos = parseInt(astro.system);
    // Feinde nur anzeigen, wenn ausgewählt
    if (astro.type === 'enemy' && !visibleEnemyAstros.includes(sysPos)) return null;

    const range = parseInt(astro.range);
    
    // Berechne Start- und End-Index im Kreis
    // Wir ziehen 0.5 ab/addieren 0.5, damit der Bogen schön "zwischen" den Systemen endet
    const startSystem = sysPos - range - 0.5;
    const endSystem = sysPos + range + 0.5;
    
    // Winkelberechnung (Offset -90 Grad, damit System 1 oben ist, falls gewünscht, hier Standard 0)
    const startAngle = ((startSystem - 1) / SYSTEM_COUNT) * 2 * Math.PI;
    const endAngle = ((endSystem - 1) / SYSTEM_COUNT) * 2 * Math.PI;

    // Radius leicht versetzt: Eigene außen (+40), Feinde innen (-40)
    // Damit überlappen sie nicht direkt mit den Sternen
    const arcRadius = astro.type === 'ally' ? RADIUS + 40 : RADIUS - 40;
    
    const x1 = Math.cos(startAngle) * arcRadius;
    const y1 = Math.sin(startAngle) * arcRadius;
    const x2 = Math.cos(endAngle) * arcRadius;
    const y2 = Math.sin(endAngle) * arcRadius;

    // Prüfen ob der Bogen über 180 Grad geht (für SVG Flag)
    const largeArcFlag = (range * 2) / SYSTEM_COUNT > 0.5 ? 1 : 0;
    
    const pathData = `M ${x1} ${y1} A ${arcRadius} ${arcRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
    
    // Farbe und Style
    const color = astro.type === 'ally' ? '#39ff14' : '#ff3333';
    // Dynamische Dicke: Je weiter man reinzoomt, desto feiner wird die Linie relativ gesehen
    const strokeWidth = Math.max(2, 6 / zoom); 

    return (
      <g key={`group-${sysPos}-${astro.type}`}>
        {/* Der eigentliche Bogen */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round" // Macht die Enden rund statt abgehackt
          strokeOpacity="0.8"
          className="scanner-arc-glow" // CSS Klasse für Neon-Effekt
        />
        {/* Kleine Markierung am Ursprungssystem */}
        {astro.type === 'ally' && (
             <circle 
                cx={Math.cos(((sysPos - 1) / SYSTEM_COUNT) * 2 * Math.PI) * arcRadius}
                cy={Math.sin(((sysPos - 1) / SYSTEM_COUNT) * 2 * Math.PI) * arcRadius}
                r={strokeWidth}
                fill={color}
             />
        )}
      </g>
    );
  };

  // --- SPEICHERN ---
  const saveAstro = async (e) => {
    if (e) e.preventDefault();
    if (!selectedSystem || !allianceId || !allianceKey) return alert("Fehler: Auth fehlt.");
    
    setLoading(true);
    try {
      const anonymousAllyHash = EncryptionService.hashID(allianceId, allianceKey);
      const levelInt = parseInt(scannerLevel) || 0;
      
      const sensitiveData = {
        type: editMode,
        scanner_level: levelInt,
        range: calculateRange(levelInt)
      };

      const encryptedContent = EncryptionService.encrypt(sensitiveData, allianceKey);
      if (!encryptedContent) throw new Error("Encryption failed");

      const payload = {
        ai_ally_hash: anonymousAllyHash,
        universe: universe,
        galaxy: currentGalaxy,
        system: parseInt(selectedSystem),
        type: editMode, 
        encrypted_content: encryptedContent,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('asteroid_scans')
        .upsert([payload], { onConflict: 'ai_ally_hash,universe,galaxy,system,type' });

      if (error) throw error;
      setShowEditModal(false);
      setScannerLevel(0);
      await fetchAstros();
    } catch (err) {
      console.error("Save error:", err);
      alert("Fehler beim Speichern.");
    } finally {
      setLoading(false);
    }
  };

  // --- LÖSCHEN (NEU) ---
  const deleteAstro = async () => {
    if (!selectedSystem || !editMode) return;
    if (!window.confirm(`Scanner auf System ${selectedSystem} wirklich löschen?`)) return;

    setLoading(true);
    try {
        const allySearchHash = EncryptionService.hashID(allianceId, allianceKey);
        
        const { error } = await supabase
            .from('asteroid_scans')
            .delete()
            .match({ 
                ai_ally_hash: allySearchHash,
                universe: universe,
                galaxy: currentGalaxy,
                system: parseInt(selectedSystem),
                type: editMode
            });

        if (error) throw error;
        setShowEditModal(false);
        setScannerLevel(0);
        await fetchAstros();
    } catch (err) {
        console.error("Delete error:", err);
        alert("Löschen fehlgeschlagen.");
    } finally {
        setLoading(false);
    }
  };

  // --- STEUERUNG ---
  const handleKeyDown = useCallback((e) => {
    if (showEditModal) return; 
    const key = e.key.toLowerCase();
    const moveStep = 100 / zoom;
    if (key === 'w') setCamOffset(prev => ({ ...prev, y: prev.y + moveStep }));
    if (key === 's') setCamOffset(prev => ({ ...prev, y: prev.y - moveStep }));
    if (key === 'a') setCamOffset(prev => ({ ...prev, x: prev.x + moveStep }));
    if (key === 'd') setCamOffset(prev => ({ ...prev, x: prev.x - moveStep }));
    if (key === '+') setZoom(prev => Math.min(prev + 0.2, 5));
    if (key === '-') setZoom(prev => Math.max(prev - 0.2, 0.2));
  }, [zoom, showEditModal]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Listen filtern
  const filteredAllies = astroList.filter(a => a.type === 'ally' && a.system.toString().startsWith(listFilter));
  const filteredEnemies = astroList.filter(a => a.type === 'enemy' && a.system.toString().startsWith(listFilter));

  return (
    <div className="galaxy-view-fullscreen fade-in">
      {/* --- HEADER --- */}
      <div className="galaxy-view-header">
        <div className="header-brand">
          <h2 className="neon-text-green" style={{fontSize: '1.5rem'}}>GALAXY MATRIX // {universe?.toUpperCase()}</h2>
          <div className="galaxy-nav-selector">
            <label style={{fontSize: '1.2rem'}}>GALAXIE:</label>
            <select 
                value={currentGalaxy} 
                onChange={(e) => setCurrentGalaxy(parseInt(e.target.value))}
                style={{fontSize: '1.2rem', padding: '5px'}}
            >
              {Array.from({ length: 14 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </div>
        </div>
        <button className="close-btn-red big-touch-target" onClick={onClose}>[ X SCHLIESSEN ]</button>
      </div>

      {/* --- MAP VIEWPORT --- */}
      <div className="galaxy-map-viewport">
        <div 
          className="galaxy-map-canvas"
          style={{ transform: `translate(calc(-50% + ${camOffset.x}px), calc(-50% + ${camOffset.y}px)) scale(${zoom}) rotate(${rotation}deg)` }}
        >
          {/* SVG LAYER für Ringe */}
          <svg 
            style={{ 
              position: 'absolute', 
              width: '4000px', height: '4000px', 
              top: '50%', left: '50%', 
              transform: 'translate(-50%, -50%)', 
              pointerEvents: 'none', zIndex: 1,
              overflow: 'visible'
            }}
            viewBox="-2000 -2000 4000 4000"
          >
            {/* Hilfskreis (dünn) für die Galaxie-Bahn */}
            <circle cx="0" cy="0" r={RADIUS} fill="none" stroke="#00f2ff" strokeWidth="1" strokeOpacity="0.2" />
            
            {astroList.length > 0 && astroList.map(astro => renderScannerArc(astro))}
          </svg>

          {/* SYSTEM PUNKTE */}
          {Array.from({ length: SYSTEM_COUNT }).map((_, i) => {
            const systemIndex = i + 1;
            const angle = (i / SYSTEM_COUNT) * 2 * Math.PI;
            const x = Math.cos(angle) * RADIUS;
            const y = Math.sin(angle) * RADIUS;
            const astro = astroList.find(a => parseInt(a.system) === systemIndex);
            const isSelected = selectedSystem === systemIndex;
            
            return (
              <div 
                key={systemIndex}
                className={`star-system ${isSelected ? 'active-star' : ''} ${astro ? 'has-data' : ''}`}
                style={{ 
                    left: `calc(50% + ${x}px)`, 
                    top: `calc(50% + ${y}px)`, 
                    transform: `translate(-50%, -50%) rotate(${-rotation}deg) scale(${isSelected ? 1.5 : 1})`, 
                    zIndex: isSelected ? 10 : 2 
                }}
                onClick={() => setSelectedSystem(systemIndex)}
              >
                {/* Visualisierung des Sterns */}
                <div className={`star-glow ${astro ? astro.type : ''}`}></div>
                
                {/* Labels nur alle 10 Systeme oder wenn ausgewählt - Schrift größer für Senioren */}
                {(systemIndex % 10 === 0 || isSelected) && (
                    <span className="system-label" style={{ fontSize: isSelected ? '24px' : '14px' }}>
                        {systemIndex}
                    </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* --- EDIT MODAL --- */}
      {showEditModal && (
        <div className="astro-modal-overlay" style={{ pointerEvents: 'all', zIndex: 5000000 }}>
          <div className="astro-modal-content ally-glass-box fade-in big-ui-mode">
            <h3 className={editMode === 'ally' ? 'neon-text-green' : 'neon-text-red'}>
              {editMode === 'ally' ? 'EIGENER SCANNER' : 'FEINDLICHER SCANNER'}
            </h3>
            <p style={{fontSize: '1.2rem'}}>Position: {currentGalaxy}:{selectedSystem}</p>
            
            <div className="input-group">
              <label style={{fontSize: '1.1rem'}}>Scanner Stufe:</label>
              <input 
                type="number" 
                autoFocus
                value={scannerLevel} 
                onChange={(e) => setScannerLevel(e.target.value)} 
                className="main-input big-input" 
              />
              <div className="range-preview neon-text-blue">
                 Reichweite: <strong>{calculateRange(scannerLevel)}</strong> Systeme
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="action-btn big-btn" 
                type="button"
                onClick={saveAstro} 
                disabled={loading}
              >
                {loading ? '...' : 'SPEICHERN'}
              </button>
              
              {/* NEU: LÖSCHEN BUTTON */}
              <button className="delete-btn big-btn" type="button" onClick={deleteAstro}>
                 LÖSCHEN
              </button>
              
              <button className="close-btn-simple big-btn" type="button" onClick={() => setShowEditModal(false)}>
                 ABBRUCH
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SIDEBAR & STEUERUNG (RECHTS UND UNTEN) --- */}
      <div className="galaxy-ui-controls">
        
        {/* RADAR & LISTE */}
        <div className="system-detail-panel ally-glass-box">
          <h3 className="neon-text-blue">SCANNER LOG</h3>
          
          {/* Kontext-Aktionen für ausgewähltes System */}
          {selectedSystem && (
            <div className="status-content highlight-box">
              <div className="coord-info" style={{fontSize: '1.5rem'}}>{currentGalaxy}:{selectedSystem}</div>
              <div className="action-row">
                <button className="action-btn big-touch-target" onClick={() => { setEditMode('ally'); setShowEditModal(true); }}>
                    + EIGEN
                </button>
                <button className="action-btn-red big-touch-target" onClick={() => { setEditMode('enemy'); setShowEditModal(true); }}>
                    + FEIND
                </button>
              </div>
            </div>
          )}

          {/* FILTER EINGABE */}
          <div className="filter-box">
             <input 
                placeholder="Filter System (z.B. 12)" 
                className="main-input" 
                value={listFilter}
                onChange={(e) => setListFilter(e.target.value)}
             />
          </div>

          {/* GETRENNTE LISTE: EIGENE */}
          <div className="list-section">
            <h4 className="neon-text-green">EIGENE ({filteredAllies.length})</h4>
            <div className="scroll-list custom-scrollbar">
                {filteredAllies.map(a => (
                    <div key={a.system} className="list-item" onClick={() => setSelectedSystem(parseInt(a.system))}>
                        <span className="sys-badge">{a.system}</span>
                        <span className="lvl-badge">Lvl {a.scanner_level}</span>
                    </div>
                ))}
                {filteredAllies.length === 0 && <small>Keine Einträge</small>}
            </div>
          </div>

          {/* GETRENNTE LISTE: FEINDE */}
          <div className="list-section">
            <h4 className="neon-text-red">FEINDE ({filteredEnemies.length})</h4>
            <small style={{display:'block', marginBottom:'5px'}}>Anklicken für Radar-Kreis (Max 3)</small>
            <div className="scroll-list custom-scrollbar">
                {filteredEnemies.map(enemy => (
                  <div key={enemy.system} className="list-item enemy-item">
                    <input 
                      type="checkbox" 
                      style={{transform: 'scale(1.5)', marginRight: '10px'}}
                      checked={visibleEnemyAstros.includes(parseInt(enemy.system))}
                      disabled={!visibleEnemyAstros.includes(parseInt(enemy.system)) && visibleEnemyAstros.length >= 3}
                      onChange={() => toggleEnemyAstro(enemy.system)}
                    />
                    <span onClick={() => setSelectedSystem(parseInt(enemy.system))} style={{cursor:'pointer', flexGrow: 1}}>
                        System {enemy.system} (Lvl {enemy.scanner_level})
                    </span>
                  </div>
                ))}
                {filteredEnemies.length === 0 && <small>Keine Feinddaten</small>}
            </div>
          </div>
        </div>

        {/* SENIOREN JOYPAD (GRÖSSER) */}
        <div className="nav-joypad ally-glass-box">
          <div className="pad-row"><button className="pad-btn huge-btn" onClick={() => setCamOffset(prev => ({...prev, y: prev.y + 100}))}>▲</button></div>
          <div className="pad-row">
            <button className="pad-btn huge-btn" onClick={() => setCamOffset(prev => ({...prev, x: prev.x + 100}))}>◄</button>
            <button className="pad-btn huge-btn" style={{fontSize: '1.5rem'}} onClick={() => setZoom(z => Math.min(z + 0.3, 5))}>+</button>
            <button className="pad-btn huge-btn" style={{fontSize: '1.5rem'}} onClick={() => setZoom(z => Math.max(z - 0.3, 0.2))}>-</button>
            <button className="pad-btn huge-btn" onClick={() => setCamOffset(prev => ({...prev, x: prev.x - 100}))}>►</button>
          </div>
          <div className="pad-row"><button className="pad-btn huge-btn" onClick={() => setCamOffset(prev => ({...prev, y: prev.y - 100}))}>▼</button></div>
        </div>
      </div>
    </div>
  );
};

export default GalaxyView;