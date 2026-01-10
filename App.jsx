import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

// CSS - Modulare Imports
import './App.css';                
import './styles/UIComponents.css'; 
import './styles/LoginModule.css';  
import './styles/HubModule.css';    
import './styles/EconomyModule.css';     // Das Mining-Modul (Bleibt!)
import './styles/Handelsrechner.css';    // NEU: Import für den Handelsrechner
import './styles/AllianceModule.css';
import './styles/MilitaryModule.css'; 
import './styles/GeneralModules.css'; 

// Components
import AllianceModule from './components/AllianceModule.jsx';
import MilitaryModule from './components/MilitaryModule.jsx';
// BEIDES WIRD IMPORTIERT:
import EconomyModule, { calculateProduction } from './components/EconomyModule.jsx';
import Handelsrechner from './components/Handelsrechner.jsx'; // NEU
import InterceptionModule from './components/InterceptionModule.jsx';
import ProductionAnalyzer from './components/ProductionAnalyzer.jsx';
import AICInterface from './components/AICInterface.jsx';
import Dashboard from './components/Dashboard.jsx'; 

const UNI_SETTINGS = {
  'Retro':   { prod: 1.0, fleet: 1, maxPlanets: 17 },
  'Nexus':   { prod: 3.0, fleet: 3, maxPlanets: 17 },
  'Sirius':  { prod: 1.5, fleet: 2, maxPlanets: 13 },
  'Genesis': { prod: 2.0, fleet: 3, maxPlanets: 17 }
};

const STORAGE_KEY = 'AEGIS_CORE_DATA_V3';

const VIDEO_INTRO = "https://zcvlhbieuexbbpissxxk.supabase.co/storage/v1/object/public/media/Video_mit_neuem_Sound.mp4";
const VIDEO_ALLIANCE = "https://zcvlhbieuexbbpissxxk.supabase.co/storage/v1/object/public/media/Apokalyptisches_Video_mit_Kooperationsdruck.mp4";

function App() {
  const [step, setStep] = useState('WELCOME'); 
  const [activeSubTab, setActiveSubTab] = useState('HUB'); 
  const [showDSGVO, setShowDSGVO] = useState(false);
  const videoRef = useRef(null); 
  
  // --- VIEW STATES ---
  const [showEconomy, setShowEconomy] = useState(false);         // Minen/Produktion
  const [showHandelsrechner, setShowHandelsrechner] = useState(false); // NEU: Handelsrechner
  const [showMilitary, setShowMilitary] = useState(false);
  const [showRetimer, setShowRetimer] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(false); 
  
  const [activeUniTab, setActiveUniTab] = useState('Retro');
  const [playAllyVideo, setPlayAllyVideo] = useState(false);

  const [nickname, setNickname] = useState('');
  const [planetsByUni, setPlanetsByUni] = useState({ 'Retro': [], 'Nexus': [], 'Sirius': [], 'Genesis': [] });
  const [mineTech, setMineTech] = useState(0);
  const [specType, setSpecType] = useState('None');
  const [specLvl, setSpecLvl] = useState(0);
  const [vipLvl, setVipLvl] = useState(0);
  const [mentorBonus, setMentorBonus] = useState(0);
  const [alienWar, setAlienWar] = useState(false);
  const [alienDouble, setAlienDouble] = useState(false);
  const [multiProd, setMultiProd] = useState(1);
  const [buyProd, setBuyProd] = useState({ iron: 0, metal: 0, krypto: 0, spice: 0 });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const d = JSON.parse(atob(saved));
        setNickname(d.nickname || '');
        setPlanetsByUni(d.planetsByUni || { 'Retro': [], 'Nexus': [], 'Sirius': [], 'Genesis': [] });
        setMineTech(Number(d.mineTech) || 0);
        setSpecType(d.specType || 'None');
        setSpecLvl(Number(d.specLvl) || 0);
        setVipLvl(Number(d.vipLvl) || 0);
        setMentorBonus(Number(d.mentorBonus) || 0);
        setAlienWar(!!d.alienWar);
        setAlienDouble(!!d.alienDouble);
        setMultiProd(Number(d.multiProd) || 1);
        setBuyProd(d.buyProd || { iron: 0, metal: 0, krypto: 0, spice: 0 });
      } catch (e) { console.error("Restore Error", e); }
    }
  }, []);

  const saveAll = useCallback((updatedPlanetsByUni = planetsByUni, updatedBuy = buyProd) => {
    const data = { 
      nickname, planetsByUni: updatedPlanetsByUni, mineTech, specType, specLvl, 
      vipLvl, mentorBonus, alienWar, alienDouble, multiProd, buyProd: updatedBuy 
    };
    localStorage.setItem(STORAGE_KEY, btoa(JSON.stringify(data)));
  }, [nickname, planetsByUni, mineTech, specType, specLvl, vipLvl, mentorBonus, alienWar, alienDouble, multiProd, buyProd]);

  // ECHTE PRODUKTIONS-LOGIK (bleibt erhalten)
  const totals = useMemo(() => calculateProduction({
    planets: planetsByUni[activeUniTab] || [],
    mineTech, vipLvl, buyProd, mentorBonus, specType, specLvl, alienWar, alienDouble, multiProd
  }, activeUniTab), [planetsByUni, activeUniTab, mineTech, vipLvl, buyProd, mentorBonus, specType, specLvl, alienWar, alienDouble, multiProd]);

  const updateUniPlanets = (newPlanets) => {
    const updated = { ...planetsByUni, [activeUniTab]: newPlanets };
    setPlanetsByUni(updated);
    saveAll(updated);
  };

  const resetHubViews = () => {
    // Hier alle Views zurücksetzen
    setShowEconomy(false); 
    setShowHandelsrechner(false); // NEU zurücksetzen
    setShowMilitary(false); 
    setShowRetimer(false); 
    setShowAnalyzer(false); 
  };

  const deleteFullProfile = () => {
    if (window.confirm("SYSTEM-RESET?")) {
      localStorage.clear();
      window.location.reload(); 
    }
  };

  const getBackgroundMode = () => {
    if (step === 'REGISTER') return 'bg-reactor-mode';
    if (step === 'HUB') {
        if (activeSubTab === 'ALLIANCE') return 'bg-alliance-mode';
        if (showEconomy) return 'bg-economy-mode';      // Minen Hintergrund
        if (showHandelsrechner) return 'bg-trade-mode'; // NEU: Marktplatz Hintergrund
        if (showMilitary) return 'bg-military-mode';
        if (showRetimer) return 'bg-interception-mode';
        if (showAnalyzer) return 'bg-analyzer-mode';
        if (activeSubTab === 'HUB') return 'bg-hub-mode';
    }
    return '';
  };

  const handleAllianceClick = () => {
    const hasSeenAllyVideo = sessionStorage.getItem('aic_ally_video_seen');
    if (!hasSeenAllyVideo) {
      setPlayAllyVideo(true);
      sessionStorage.setItem('aic_ally_video_seen', 'true');
    }
    setActiveSubTab('ALLIANCE');
    resetHubViews();
  };

  const startIntroVideo = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.play();
      const btn = document.querySelector('.aic-branding-zone');
      if(btn) btn.style.opacity = '0'; 
      if(btn) btn.style.pointerEvents = 'none';
    }
  };

  const onIntroVideoEnded = () => {
    setStep(nickname ? 'HUB' : 'REGISTER');
  };

  // Prüfen ob ein Overlay aktiv ist (für Transparenz)
  const isTransparentPanel = (step === 'HUB' && (
      activeSubTab === 'ALLIANCE' || 
      showEconomy || 
      showHandelsrechner || // NEU dazu
      showMilitary || 
      showRetimer || 
      showAnalyzer
  ));

  return (
    <div className={`aegis-container ${getBackgroundMode()}`}>
      
      {playAllyVideo && (
        <div className="video-overlay">
          <video autoPlay onEnded={() => setPlayAllyVideo(false)}>
            <source src={VIDEO_ALLIANCE} type="video/mp4" />
          </video>
          <button className="action-btn" onClick={() => setPlayAllyVideo(false)} style={{position:'absolute', bottom:'50px', zIndex: 100001}}>ÜBERSPRINGEN</button>
        </div>
      )}

      {showDSGVO && (
        <div className="dsgvo-overlay fade-in">
          <div className="dsgvo-content">
            <h2>[ DATENSCHUTZ ]</h2>
            <div className="dsgvo-text">Local Cache Storage.</div>
            <button className="action-btn" onClick={() => setShowDSGVO(false)}>OK</button>
          </div>
        </div>
      )}

      {step === 'WELCOME' && (
        <div className="intro-screen">
          <video ref={videoRef} playsInline className="intro-video-bg" onEnded={onIntroVideoEnded} preload="auto">
            <source src={VIDEO_INTRO} type="video/mp4" />
          </video>
          <div className="aic-branding-zone" onClick={startIntroVideo}>
            <p className="aic-click-me">klick mich</p>
          </div>
        </div>
      )}

      {step === 'REGISTER' && (
        <div className="interface-panel fade-in">
          <h2>COMMANDER IDENT</h2>
          <input type="text" placeholder="Name..." value={nickname} onChange={(e) => setNickname(e.target.value)} className="main-input" />
          <button className="action-btn" onClick={() => { if(nickname) {setStep('HUB'); saveAll();} }}>INITIALISIEREN</button>
        </div>
      )}

      {step === 'HUB' && (
        <div className={`interface-panel prod-panel-wide fade-in ${isTransparentPanel ? 'glass-panel-transparent' : ''}`}>
          <div className="hub-header">
              <div className="commander-info">Commander: <span className="neon-text">{nickname}</span></div>
              <div className="hub-nav">
                <button onClick={() => {setActiveSubTab('HUB'); resetHubViews();}} className={activeSubTab==='HUB'?'active-nav':''}>HUB</button>
                <button onClick={() => {setActiveSubTab('PROFILE'); resetHubViews();}} className={activeSubTab==='PROFILE'?'active-nav':''}>STRATEGIE</button>
                <button onClick={handleAllianceClick} className={activeSubTab==='ALLIANCE'?'active-nav':''}>ALLIANZ</button>
              </div>
          </div>
          <div className="sub-content">
            {activeSubTab === 'HUB' && (
              <div className="fade-in">
                {!showEconomy && !showHandelsrechner && !showMilitary && !showRetimer && !showAnalyzer && (
                  <>
                    <div style={{marginBottom: '20px'}}><Dashboard /></div>
                    <div className="uni-selector">
                      {Object.keys(UNI_SETTINGS).map(u => (
                        <button key={u} className={activeUniTab === u ? 'active' : ''} onClick={() => setActiveUniTab(u)}>{u}</button>
                      ))}
                    </div>
                    <div className="hub-grid">
                        <button className="action-btn big-btn" onClick={() => setShowEconomy(true)}>WIRTSCHAFT</button>
                        <button className="action-btn big-btn" onClick={() => setShowHandelsrechner(true)} style={{borderColor:'#00f2ff', color:'#fff'}}>HANDEL</button> {/* NEUER BUTTON */}
                        <button className="action-btn big-btn" onClick={() => setShowMilitary(true)}>MILITÄR</button>
                        <button className="action-btn big-btn" onClick={() => setShowRetimer(true)} style={{borderColor:'#ff4444'}}>ABFANGRECHNER</button>
                        <button className="action-btn big-btn" onClick={() => setShowAnalyzer(true)} style={{borderColor:'var(--neon-green)'}}>SAVE-ABFANG</button>
                    </div>
                    <button className="delete-btn small-text" style={{marginTop:'30px'}} onClick={deleteFullProfile}>PROFIL LÖSCHEN</button>
                  </>
                )}
                
                {/* --- MODULE RENDERING --- */}
                {showEconomy && <EconomyModule planets={planetsByUni[activeUniTab] || []} onUpdatePlanets={updateUniPlanets} totals={totals} />}
                {showHandelsrechner && <Handelsrechner />} {/* Das neue Modul */}
                {showMilitary && <MilitaryModule productionData={totals} />}
                {showRetimer && <InterceptionModule />}
                {showAnalyzer && <ProductionAnalyzer activeUni={activeUniTab} uniSettings={UNI_SETTINGS} />}
                
                {(showEconomy || showHandelsrechner || showMilitary || showRetimer || showAnalyzer) && (
                    <button className="action-btn return-btn" onClick={resetHubViews} style={{marginTop:'20px'}}>ZURÜCK</button>
                )}
              </div>
            )}
            
            {activeSubTab === 'ALLIANCE' && <AllianceModule nickname={nickname} defaultUniverse={activeUniTab} />}
          </div>
        </div>
      )}
      {nickname && step !== 'WELCOME' && step !== 'REGISTER' && (
        <AICInterface nickname={nickname} productionData={totals} />
      )}
    </div>
  );
}

export default App;