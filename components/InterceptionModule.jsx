import React, { useState, useCallback } from 'react';

/* Import der relevanten CSS-Dateien */
import '../styles/MilitaryModule.css'; // Für Hintergründe/Panel
import '../styles/UIComponents.css';   // Für Buttons/Inputs
import '../styles/GeneralModules.css';

const InterceptionModule = ({ externalData = null }) => {
  const [serverTime, setServerTime] = useState(''); // HH:mm:ss
  const [scannerTimer, setScannerTimer] = useState(''); // mm:ss oder HH:mm:ss
  const [ownFlightTime, setOwnFlightTime] = useState(''); // Sekunden
  const [result, setResult] = useState(null);

  // Setzt die aktuelle Uhrzeit des Nutzers als Basis
  const setCurrentServerTime = () => {
    const now = new Date();
    setServerTime(now.toTimeString().split(' ')[0]);
  };

  const calculateIntercept = useCallback(() => {
    if (!serverTime || !scannerTimer || !ownFlightTime) {
      alert("Commander, alle Parameter sind für den Abfangkurs erforderlich!");
      return;
    }

    try {
      // 1. Serverzeit in Sekunden
      const [sH, sM, sS] = serverTime.split(':').map(Number);
      let serverSeconds = sH * 3600 + sM * 60 + (sS || 0);

      // 2. Scanner-Timer Parsing (Dauer)
      const timerParts = scannerTimer.split(':').map(Number);
      let timerSeconds = 0;
      if (timerParts.length === 3) {
        timerSeconds = timerParts[0] * 3600 + timerParts[1] * 60 + timerParts[2];
      } else if (timerParts.length === 2) {
        timerSeconds = timerParts[0] * 60 + timerParts[1];
      } else {
        timerSeconds = Number(scannerTimer) || 0;
      }

      // 3. Einschlagzeit Gegner
      const impactTimeSeconds = (serverSeconds + timerSeconds) % 86400;
      
      // 4. Eigene Startzeit (Einschlag + 3s Puffer - eigene Flugzeit)
      const buffer = 3;
      const myDepartureSeconds = (impactTimeSeconds + buffer - Number(ownFlightTime) + 86400) % 86400;

      const formatSeconds = (totalSec) => {
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = Math.floor(totalSec % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      };

      setResult({
        impact: formatSeconds(impactTimeSeconds),
        targetArrival: formatSeconds((impactTimeSeconds + buffer) % 86400),
        departure: formatSeconds(myDepartureSeconds)
      });
    } catch (e) {
      alert("Fehler bei der Berechnung. Bitte Zeitformate prüfen.");
    }
  }, [serverTime, scannerTimer, ownFlightTime]);

  return (
    <div className="interception-container eco-glass-panel fade-in" style={{ borderColor: 'rgba(255, 68, 68, 0.5)' }}>
      <h3 className="neon-text" style={{ color: '#ff4444', letterSpacing: '3px', textShadow: '0 0 10px rgba(255, 0, 0, 0.5)' }}>
        [ AEGIS INTERCEPTION CORE / RETIMER ]
      </h3>
      
      <div className="setup-grid">
        <div className="setup-section">
          <h4 className="small-text" style={{ color: '#aaa', borderBottom: '1px solid rgba(255, 68, 68, 0.2)', paddingBottom: '5px' }}>Ziel-Parameter</h4>
          <div className="input-row">
            <span className="small-text" style={{ color: '#ff8888' }}>
              Serverzeit: 
              <button onClick={setCurrentServerTime} className="dsgvo-trigger" style={{ marginLeft: '10px', color: '#aaa', border: '1px solid #444', padding: '2px 5px' }}>JETZT</button>
            </span>
            <input type="time" step="1" className="main-input" style={{ borderColor: 'rgba(255, 68, 68, 0.3)' }} value={serverTime} onChange={(e) => setServerTime(e.target.value)} />
          </div>
          <div className="input-row">
            <span className="small-text" style={{ color: '#ff8888' }}>Scanner-Timer (mm:ss):</span>
            <input type="text" className="main-input" style={{ borderColor: 'rgba(255, 68, 68, 0.3)' }} placeholder="z.B. 01:14" value={scannerTimer} onChange={(e) => setScannerTimer(e.target.value)} />
          </div>
        </div>

        <div className="setup-section">
          <h4 className="small-text" style={{ color: '#aaa', borderBottom: '1px solid rgba(255, 68, 68, 0.2)', paddingBottom: '5px' }}>Eigene Flotte</h4>
          <div className="input-row">
            <span className="small-text" style={{ color: '#ff8888' }}>Flugzeit (Sekunden):</span>
            <input type="number" className="main-input" style={{ borderColor: 'rgba(255, 68, 68, 0.3)' }} value={ownFlightTime} onChange={(e) => setOwnFlightTime(e.target.value)} placeholder="0" />
          </div>
          <button className="action-btn" style={{ borderColor: '#ff4444', color: '#ff4444', width: '100%' }} onClick={calculateIntercept}>
            BERECHNE ABFANGKURS
          </button>
        </div>
      </div>

      {result && (
        <div className="ally-glass-box fade-in" style={{ marginTop: '30px', padding: '20px', border: '1px solid #ff4444', background: 'rgba(255, 68, 68, 0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', textAlign: 'center' }}>
            <div>
              <div className="small-text" style={{ color: '#aaa', marginBottom: '5px' }}>GEGNERISCHE ANKUNFT</div>
              <div style={{ fontSize: '1.8rem', color: '#fff', letterSpacing: '2px', fontWeight: 'bold' }}>{result.impact}</div>
            </div>
            <div>
              <div className="small-text" style={{ color: '#39ff14', marginBottom: '5px' }}>EIGENE ANKUNFT (+3s)</div>
              <div style={{ fontSize: '1.8rem', color: '#39ff14', letterSpacing: '2px', fontWeight: 'bold' }}>{result.targetArrival}</div>
            </div>
          </div>
          <div style={{ marginTop: '25px', textAlign: 'center', borderTop: '1px dashed rgba(255, 68, 68, 0.5)', paddingTop: '20px' }}>
            <div className="small-text" style={{ color: '#ff4444', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase' }}>DEINE STARTZEIT (LOKAL)</div>
            <div className="neon-text" style={{ fontSize: '3.5rem', color: '#fff', textShadow: '0 0 20px #ff4444', fontWeight: 'bold' }}>{result.departure}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterceptionModule;