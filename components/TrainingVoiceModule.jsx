import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient'; 

// Sicherheits-Parameter & Admin-Konfiguration
// UPDATE: ID kommt jetzt sicher aus der .env Datei
const ALLOWED_ADMIN_ID = process.env.REACT_APP_ADMIN_ID;
const ADMIN_NICKNAME = "Luzifer333";

// Pool für Zufallsfakten über das Universum
const UNIVERSE_FACTS = [
  "Wusstest du? In der Mitte der Milchstraße befindet sich ein supermassereiches Schwarzes Loch namens Sagittarius A*.",
  "Spannend: Ein Tag auf der Venus ist länger als ein Jahr auf der Venus.",
  "Fakt: Neutronensterne sind so dicht, dass ein Teelöffel ihrer Materie Milliarden Tonnen wiegen würde.",
  "Schon gewusst? Das Licht der Sonne braucht etwa 8 Minuten und 20 Sekunden, um die Erde zu erreichen.",
  "Info: Es gibt im bekannten Universum mehr Sterne als Sandkörner auf allen Stränden der Erde.",
  "Wusstest du? Der Mount Olympus auf dem Mars ist der größte Vulkan im Sonnensystem."
];

const TrainingVoiceModule = ({ nickname }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('System bereit');
  const [userId, setUserId] = useState(null);
  const [history, setHistory] = useState([]);
  const [aiOutput, setAiOutput] = useState('');
  
  // Ref für Recognition, um Memory Leaks zu vermeiden
  const recognitionRef = useRef(null);

  const [aiMemory, setAiMemory] = useState({
    subjects: ["Das System", "Die Einheit", "Der Kern"],
    actions: ["analysiert", "optimiert", "überwacht"],
    objects: ["die Daten", "den Status", "die Umgebung"],
    raw: [] 
  });

  const hasAdminPrivileges = userId === ALLOWED_ADMIN_ID || nickname === ADMIN_NICKNAME;

  // Memoized Learning Logic
  const processAdvancedLearning = useCallback((texts) => {
    if (!texts || texts.length === 0) return;
    
    setAiMemory(prev => {
      const newMemory = { ...prev };
      let updated = false;

      texts.forEach(text => {
        if (!text || typeof text !== 'string') return;
        if (text.length > 25 && !text.includes(" ")) return; // Verschlüsselungsschutz

        const words = text.split(/\s+/).filter(w => w.length > 2);
        
        if (words.length >= 3) {
          const sub = words[0];
          const act = words[1];
          const obj = words.slice(2).join(" ");

          if (!newMemory.subjects.includes(sub)) { newMemory.subjects.push(sub); updated = true; }
          if (!newMemory.actions.includes(act)) { newMemory.actions.push(act); updated = true; }
          if (!newMemory.objects.includes(obj)) { newMemory.objects.push(obj); updated = true; }
        }
        if (!newMemory.raw.includes(text)) {
          newMemory.raw.push(text);
          updated = true;
        }
      });
      
      return updated ? { ...newMemory } : prev;
    });
  }, []);

  const loadKnowledgeFromDB = useCallback(async () => {
    setStatus('Synchronisiere Neural-Netz...');
    try {
      const { data, error } = await supabase
        .from('training_data')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setHistory(data.slice(0, 8)); 
        const allTexts = data.map(d => d.content);
        processAdvancedLearning(allTexts);
        setStatus('AEGIS-Core online.');
      } else {
        throw error;
      }
    } catch (err) {
      console.error("Ladefehler:", err);
      setStatus('Fehler beim Datenbank-Sync');
    }
  }, [processAdvancedLearning]);

  const generateResponse = useCallback(() => {
    if (aiMemory.subjects.length < 1) return;
    const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const sentence = `${rand(aiMemory.subjects)} ${rand(aiMemory.actions)} ${rand(aiMemory.objects)}.`;
    setAiOutput(sentence);
  }, [aiMemory]);

  useEffect(() => {
    const initApp = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserId(session.user.id);
        }
        await loadKnowledgeFromDB();
        
        const randomFact = UNIVERSE_FACTS[Math.floor(Math.random() * UNIVERSE_FACTS.length)];
        const greeting = nickname === ADMIN_NICKNAME 
          ? `Status: Online. Willkommen, Commander Luzifer333. ` 
          : `System online. `;
        
        setAiOutput(`${greeting}${randomFact}`);

      } catch (e) {
        console.warn("Verbindung zu Supabase eingeschränkt.");
        setStatus('Offline-Modus aktiv');
      }
    };
    initApp();

    // Cleanup bei Unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [nickname, loadKnowledgeFromDB]);

  const initAndStart = async () => {
    setStatus('Hardware-Initialisierung...');
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setStatus('Browser-Inkompatibilität (Speech)');
        return;
      }

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'de-DE';

      rec.onstart = () => {
        setIsListening(true);
        setStatus('Zuhören aktiv...');
      };

      rec.onresult = (event) => {
        let current = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
        }
        setTranscript(current);
      };

      rec.onerror = (e) => {
        console.error("Speech Recognition Error:", e.error);
        const msg = e.error === 'not-allowed' ? 'Mikrofon-Zugriff verweigert!' : `Fehler: ${e.error}`;
        setStatus(msg);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
        if (status === 'Zuhören aktiv...') setStatus('AEGIS-Core online.');
      };

      rec.start();
      recognitionRef.current = rec;
    } catch (err) {
      console.error("Hardware Error:", err);
      setStatus('Hardware-Fehler oder kein Mikrofon.');
    }
  };

  const toggleListening = () => {
    if (!hasAdminPrivileges) {
      setStatus('Zugriff verweigert: Admin-Level erforderlich.');
      return;
    }
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    } else {
      initAndStart();
    }
  };

  const saveKnowledge = async () => {
    if (!transcript || !hasAdminPrivileges) return;
    setStatus('Verarbeite Wissen...');
    
    const { error } = await supabase.from('training_data').insert([{ 
      content: transcript, 
      created_by: userId || ALLOWED_ADMIN_ID, 
      created_at: new Date(),
      is_validated: false,
      is_blacklisted: false
    }]);

    if (!error) {
      processAdvancedLearning([transcript]);
      generateResponse();
      setStatus('Wissen erfolgreich integriert.');
      setTranscript('');
      await loadKnowledgeFromDB(); 
    } else {
      console.error("Supabase Save Error:", error);
      setStatus('Datenbank-Fehler beim Schreibvorgang.');
    }
  };

  const styles = {
    container: { backgroundColor: '#050505', color: '#00e5ff', padding: '20px', borderRadius: '10px', border: '1px solid #1a1a1a', fontFamily: 'monospace', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
    header: { margin: '0 0 15px 0', fontSize: '0.75rem', letterSpacing: '2px', color: '#00e5ff', borderBottom: '1px solid #111', paddingBottom: '10px', textTransform: 'uppercase' },
    aiOutputBox: { padding: '15px', backgroundColor: 'rgba(57, 255, 20, 0.03)', borderLeft: '4px solid #39ff14', marginBottom: '15px', position: 'relative', overflow: 'hidden' },
    neonBar: { position: 'absolute', top: 0, left: 0, width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, #39ff14, transparent)' },
    aiLabel: { fontSize: '0.6rem', color: '#39ff14', margin: 0, fontWeight: 'bold' },
    aiText: { fontSize: '0.95rem', color: '#39ff14', fontStyle: 'italic', margin: '8px 0 0 0', lineHeight: '1.4' },
    refreshBtn: { position: 'absolute', top: '5px', right: '5px', fontSize: '0.55rem', backgroundColor: '#111', color: '#39ff14', border: '1px solid #39ff14', cursor: 'pointer', padding: '3px 7px', borderRadius: '2px' },
    displayBox: { padding: '15px', backgroundColor: '#000', borderRadius: '4px', border: '1px solid #222', marginBottom: '15px', boxShadow: 'inset 0 0 10px rgba(0,242,255,0.1)' },
    transcriptArea: { minHeight: '60px', fontSize: '0.9rem', color: '#eee', lineHeight: '1.5' },
    buttonRow: { display: 'flex', gap: '12px' },
    button: { flex: 1, padding: '12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', transition: 'all 0.2s', textTransform: 'uppercase' },
    saveButton: { flex: 1, padding: '12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: '#39ff14', fontSize: '0.75rem', color: '#000', textTransform: 'uppercase', opacity: (!transcript || isListening) ? 0.5 : 1 },
    statusText: { fontSize: '0.65rem', color: '#666', marginTop: '12px', letterSpacing: '1px', fontStyle: 'italic' },
    historySection: { marginTop: '20px', borderTop: '1px solid #111', paddingTop: '15px' },
    historyHeader: { fontSize: '0.65rem', color: '#888', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' },
    historyList: { display: 'flex', flexDirection: 'column', gap: '5px' },
    historyItem: { fontSize: '0.65rem', color: '#555', backgroundColor: '#080808', padding: '6px 10px', borderRadius: '2px', border: '1px solid #0d0d0d', display: 'flex', alignItems: 'center' },
    statGrid: { display: 'flex', justifyContent: 'space-between', marginTop: '20px', borderTop: '1px solid #111', paddingTop: '15px' },
    statItem: { display: 'flex', flexDirection: 'column', gap: '2px' },
    statLabel: { fontSize: '0.55rem', color: '#444', fontWeight: 'bold' },
    statValue: { fontSize: '0.75rem', fontWeight: 'bold', color: '#00e5ff' }
  };

  return (
    <div style={styles.container}>
      <h4 style={styles.header}>AEGIS INTELLIGENCE CORE // VOICE INTERFACE</h4>
      
      <div style={styles.aiOutputBox}>
        <div style={styles.neonBar}></div>
        <p style={styles.aiLabel}>SYSTEM STATUS / NEURALE SYNTHESE:</p>
        <p style={styles.aiText}>{aiOutput || "Initialisiere..."}</p>
        <button onClick={generateResponse} style={styles.refreshBtn}>RE-SYNTHESE</button>
      </div>

      <div style={styles.displayBox}>
        <div style={styles.transcriptArea}>
          {transcript || "Diktieren Sie Vokabular für das Neural-Netz..."}
        </div>
      </div>
      
      <div style={styles.buttonRow}>
        <button 
          onClick={toggleListening} 
          style={{...styles.button, backgroundColor: isListening ? '#ff4d4d' : '#00e5ff', color: isListening ? '#fff' : '#000'}}
        >
          {isListening ? 'STOPP (REC)' : 'START (REC)'}
        </button>
        <button 
          onClick={saveKnowledge} 
          style={styles.saveButton} 
          disabled={!transcript || isListening}
        >
          WISSEN SPEICHERN
        </button>
      </div>
      
      <p style={styles.statusText}>{`>> ${status}`}</p>

      <div style={styles.historySection}>
        <h5 style={styles.historyHeader}>Lern-Historie:</h5>
        <div style={styles.historyList}>
          {history.length > 0 ? history.map((h) => (
            <div key={h.id} style={styles.historyItem}>
              <span style={{color: '#00e5ff', marginRight: '8px'}}>•</span> 
              {h.content.substring(0, 60)}{h.content.length > 60 ? '...' : ''}
            </div>
          )) : <p style={{fontSize: '0.6rem', color: '#444'}}>Keine Daten im Archiv gefunden.</p>}
        </div>
        
        <div style={styles.statGrid}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>VOKABEL-POOL:</span>
            <span style={styles.statValue}>
              {aiMemory.subjects.length + aiMemory.actions.length + aiMemory.objects.length}
            </span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>SYSTEM-AUTH:</span>
            <span style={{...styles.statValue, color: hasAdminPrivileges ? '#39ff14' : '#ff4d4d'}}>
              {hasAdminPrivileges ? 'ADMIN-CORE' : 'GUEST-ACCESS'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingVoiceModule;