import React, { useState, useEffect, useCallback } from 'react';

/* Import der modularen CSS-Dateien */
import '../styles/UIComponents.css'; 
import '../styles/GeneralModules.css'; 

const Dashboard = () => {
  const [inputValue, setInputValue] = useState('');
  const [displayMessage, setDisplayMessage] = useState('Bereit, Commander. Taktische Telemetrie empfangen.');
  const [fact, setFact] = useState('Im Weltraum ist es absolut still, da es kein Medium für Schallwellen gibt.');
  const [strikes, setStrikes] = useState(0);

  // Pool für Astro-Fakten
  const astroFacts = [
    "Ein Tag auf der Venus ist länger als ein Jahr auf der Venus.",
    "Neutronensterne können sich 600 Mal pro Sekunde drehen.",
    "Der Olympus Mons auf dem Mars ist der größte Vulkan im Sonnensystem.",
    "Das Universum hat keinen Mittelpunkt und dehnt sich überall gleichzeitig aus.",
    "In der Schwerelosigkeit können Flammen eine kugelförmige Gestalt annehmen."
  ];

  // Synchronisation der Strikes mit dem globalen Sicherheitsstatus
  useEffect(() => {
    const syncSecurity = () => {
      const saved = localStorage.getItem('AIC_SECURITY_STATE');
      if (saved) {
        try {
          const { count } = JSON.parse(saved);
          setStrikes(count || 0);
        } catch (e) { console.error("Security Sync Error", e); }
      }
    };
    syncSecurity();
    window.addEventListener('storage', syncSecurity);
    return () => window.removeEventListener('storage', syncSecurity);
  }, []);

  const processCommand = useCallback((cmd) => {
    const cleanCmd = cmd.toLowerCase().replace('/', '').trim();
    
    const commands = {
      fact: () => {
        const newFact = astroFacts[Math.floor(Math.random() * astroFacts.length)];
        setFact(newFact);
        return "Datenbank abgefragt: Neuer Astro-Fakt geladen.";
      },
      status: () => "Kern-Integrität bei 98%. Alle Allianz-Verbindungen stabil.",
      help: () => "Protokolle: /status, /fact, /help",
      clear: () => {
        setFact("System-Cache bereinigt.");
        return "Anzeige-Buffer geleert.";
      }
    };

    if (commands[cleanCmd]) {
      return commands[cleanCmd]();
    }
    return `Fehler: Befehl '${cleanCmd}' im AEGIS-Core nicht definiert.`;
  }, [astroFacts]);

  const handleCommand = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setDisplayMessage("Verarbeite Anfrage...");
    const currentInput = inputValue;
    setInputValue('');

    setTimeout(() => {
      const response = processCommand(currentInput);
      setDisplayMessage(response);
    }, 450);
  };

  return (
    <div className="dashboard-container eco-glass-panel fade-in">
      <div className="dashboard-header-row">
        {/* Der pulsierende Kern-Indikator */}
        <div className="core-icon-container pulse-core">
          <div className="core-dot-center" />
        </div>

        <div style={{ flex: 1 }}>
          <div className="dashboard-title-text">
            AEGIS ADVISOR CORE 
            <span className={`strike-display ${strikes > 0 ? 'alert-active' : ''}`}>
              STRIKES: {strikes}/3
            </span>
          </div>
          <div className="dashboard-subtitle neon-text">Missions-Briefing / Neural-Sync</div>
          <div className="dashboard-fact-box">"{fact}"</div>
        </div>
      </div>

      <div className="terminal-input-area">
        <div className="status-terminal-line">{`>> ${displayMessage}`}</div>
        
        <form onSubmit={handleCommand} className="terminal-form">
          <input 
            type="text" 
            className="main-input terminal-input"
            placeholder="Kommando eingeben (z.B. /status)..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button type="submit" className="action-btn execute-btn">EXECUTE</button>
        </form>
      </div>
    </div>
  );
};

export default Dashboard;