import React, { useState, useCallback } from 'react';

/* Import der relevanten CSS-Dateien */
import '../styles/MilitaryModule.css'; // Für analyzer-spezifische Hintergründe
import '../styles/UIComponents.css';   // Für Inputs und Buttons
import '../styles/GeneralModules.css';

const ProductionAnalyzer = ({ activeUni, uniSettings }) => {
  const [oldReport, setOldReport] = useState({ iron: 0 });
  const [newReport, setNewReport] = useState({ iron: 0 });
  const [hourlyProd, setHourlyProd] = useState(0); 
  const [analysis, setAnalysis] = useState(null);

  const calculateActivity = useCallback(() => {
    const ironOld = Number(oldReport.iron);
    const ironNew = Number(newReport.iron);
    const prodStd = Number(hourlyProd);

    if (ironNew <= ironOld) {
      alert("Fehler: Der neue Bericht muss mehr Eisen enthalten als der alte!");
      return;
    }
    if (prodStd <= 0) {
      alert("Bitte gib die Stundenproduktion des Zielplaneten ein.");
      return;
    }

    const diffIron = ironNew - ironOld;
    const hoursPassed = diffIron / prodStd;
    const secondsPassed = hoursPassed * 3600;

    const now = new Date();
    const activityStart = new Date(now.getTime() - (secondsPassed * 1000));

    const dHours = Math.floor(hoursPassed);
    const dMins = Math.floor((hoursPassed % 1) * 60);

    setAnalysis({
      diffIron,
      prodStd,
      activityStart: activityStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      durationStr: `${dHours}h ${dMins}m`,
      timestamp: activityStart
    });
  }, [oldReport, newReport, hourlyProd]);

  return (
    <div className="analyzer-container eco-glass-panel fade-in">
      <h3 className="neon-text" style={{ letterSpacing: '2px', marginTop: 0 }}>
        [ AEGIS ACTIVITY ANALYZER ]
      </h3>
      
      <p className="small-text" style={{ color: '#aaa', marginBottom: '20px' }}>
        Rekonstruiert den Zeitpunkt der letzten Leerung/Aktivität basierend auf Ressourcen-Delta.
      </p>
      
      <div className="setup-grid">
        <div className="setup-section">
          <span className="small-text neon-text">SCAN 1 (ÄLTER)</span>
          <input 
            type="number" 
            className="main-input" 
            placeholder="Eisen Menge..."
            onChange={(e) => setOldReport({iron: e.target.value})} 
          />
        </div>

        <div className="setup-section">
          <span className="small-text neon-text">SCAN 2 (AKTUELL)</span>
          <input 
            type="number" 
            className="main-input" 
            placeholder="Eisen Menge..."
            onChange={(e) => setNewReport({iron: e.target.value})} 
          />
        </div>
      </div>

      <div className="setup-section" style={{ marginBottom: '10px', borderColor: 'var(--neon-green)' }}>
        <span className="small-text" style={{ color: 'var(--neon-green)' }}>STUNDENPRODUKTION DES ZIELS (EISEN)</span>
        <input 
          type="number" 
          className="main-input" 
          placeholder="z.B. 45000"
          onChange={(e) => setHourlyProd(e.target.value)} 
        />
      </div>

      <button 
        className="action-btn" 
        style={{ width: '100%' }}
        onClick={calculateActivity}
      >
        ANALYSE STARTEN
      </button>

      {analysis && (
        <div className="ally-glass-box fade-in" style={{ marginTop: '20px', padding: '20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#ccc', marginBottom: '10px' }}>
            <span>Δ EISEN: {analysis.diffIron.toLocaleString()}</span>
            <span>PROD-ZEIT: {analysis.durationStr}</span>
          </div>
          
          <div style={{ borderTop: '1px solid rgba(0,229,255,0.3)', paddingTop: '15px' }}>
            <div className="small-text neon-text" style={{ marginBottom: '5px' }}>BERECHNETER AKTIVITÄTS-START:</div>
            <div className="neon-text" style={{ fontSize: '2.8rem', fontWeight: 'bold', textShadow: '0 0 20px var(--neon-blue)' }}>
              {analysis.activityStart}
            </div>
          </div>
          
          <p className="small-text" style={{ color: '#888', marginTop: '15px' }}>
            * Hinweis: Diese Zeit gibt an, wann die Ressourcen-Produktion bei Null startete (Login oder Leeren der Lager).
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductionAnalyzer;