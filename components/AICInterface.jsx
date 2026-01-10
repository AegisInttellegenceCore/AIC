import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient'; 

/* Import der modularen CSS-Dateien */
import '../styles/UIComponents.css'; 
import '../styles/GeneralModules.css'; 

/* SICHERHEITS-UPDATE: */
/* Wir holen die ID jetzt aus der unsichtbaren .env Datei */
const ADMIN_UUID = process.env.REACT_APP_ADMIN_ID;

const SCIENCE_FACTS = [
  "In der Nähe eines Schwarzen Lochs vergeht die Zeit aufgrund der extremen Gravitation langsamer (Zeitdilatation).",
  "Der Saturnmond Titan ist der einzige Mond im Sonnensystem mit einer dichten Atmosphäre und flüssigen Methan-Seen.",
  "Neutronensterne wiegen pro Teelöffel Materie Milliarden Tonnen.",
  "Das Universum dehnt sich beschleunigt aus.",
  "Licht benötigt etwa 8 Minuten und 20 Sekunden von der Sonne zur Erde.",
  "Ein Tag auf der Venus ist länger als ein Jahr auf der Venus.",
  "Im Vakuum können Metalle durch Kaltverschweißung verschmelzen."
];

const AICInterface = ({ nickname, productionData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [strikeData, setStrikeData] = useState({ count: 0, logs: [], timeoutUntil: null });
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lessonsCount, setLessonsCount] = useState(0);
  
  const [aiMemory, setAiMemory] = useState({
    subjects: ["Das System", "Die Einheit", "Der Kern"],
    actions: ["analysiert", "optimiert", "überwacht"],
    objects: ["die Daten", "den Status", "die Umgebung"],
    validatedChains: [],
    blacklistedChains: []
  });

  const scrollRef = useRef(null);

  // Neural Sync Logic
  const fetchAndProcessKnowledge = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('training_data').select('*');
      if (error) return;
      
      setLessonsCount(data.length);
      const newMemory = { 
        subjects: ["Das System", "Die Einheit", "Der Kern"], 
        actions: ["analysiert", "optimiert", "überwacht"], 
        objects: ["die Daten", "den Status", "die Umgebung"],
        validatedChains: [],
        blacklistedChains: []
      };

      data.forEach(d => {
        const content = d.content;
        if (!content) return;
        // Kurze Strings ohne Leerzeichen ignorieren (Spam-Schutz)
        if (content.length > 20 && !content.includes(" ")) return;
        
        if (d.is_validated) {
          newMemory.validatedChains.push(content);
        } else if (d.is_blacklisted) {
          newMemory.blacklistedChains.push(content);
        } else {
          // Lernen aus unvalidierten Sätzen (Wörter extrahieren)
          const words = content.split(/\s+/).filter(w => w.length > 2);
          if (words.length >= 3) {
            if (!newMemory.subjects.includes(words[0])) newMemory.subjects.push(words[0]);
            if (!newMemory.actions.includes(words[1])) newMemory.actions.push(words[1]);
            const obj = words.slice(2).join(" ");
            if (!newMemory.objects.includes(obj)) newMemory.objects.push(obj);
          }
        }
      });
      setAiMemory(newMemory);
    } catch (e) { 
      console.error("Neural-Sync Fehler", e); 
    }
  }, []);

  useEffect(() => {
    const verifyIdentity = async () => {
      // Nickname Check (einfacher Check)
      if (nickname === 'Luzifer333') setIsAdmin(true);
      
      // UUID Check (Sicherer Check gegen .env)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id === ADMIN_UUID) setIsAdmin(true);
      } catch (e) {}
    };
    verifyIdentity();
    fetchAndProcessKnowledge();

    const savedSecurity = localStorage.getItem('AIC_SECURITY_STATE');
    if (savedSecurity) setStrikeData(JSON.parse(savedSecurity));
  }, [nickname, fetchAndProcessKnowledge]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const randomFact = SCIENCE_FACTS[Math.floor(Math.random() * SCIENCE_FACTS.length)];
      setMessages([{
        role: 'ai',
        text: `STATUS: AEGIS-CORE AKTIV. Willkommen zurück, Commander ${nickname || 'Luzifer333'}.\n\n[UNIVERSE-DATA]: ${randomFact}`,
        time: new Date().toLocaleTimeString(),
        isValidated: false
      }]);
    }
  }, [isOpen, nickname, messages.length]);

  const saveValidationToDB = async (text, status) => {
    try {
      const { error } = await supabase.from('training_data').insert([{
        content: text, 
        is_validated: status === 'r',
        is_blacklisted: status === 'f',
        created_at: new Date()
      }]);
      if (error) throw error;
      await fetchAndProcessKnowledge(); 
    } catch (e) {
      console.error("Datenbank-Fehler beim Speichern:", e);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  const generateResponse = (input) => {
    const lowInput = input.toLowerCase().trim();
    
    // --- ADMIN BEREICH ---
    if (isAdmin) {
      let feedbackLogs = [];
      const rMatches = [...input.matchAll(/"([^"]+)"\s*r/g)];
      const fMatches = [...input.matchAll(/"([^"]+)"\s*f/g)];

      if (rMatches.length > 0 || fMatches.length > 0) {
        rMatches.forEach(m => {
          saveValidationToDB(m[1], 'r');
          feedbackLogs.push(`[OK]: "${m[1]}" gesichert.`);
        });
        fMatches.forEach(m => {
          saveValidationToDB(m[1], 'f');
          feedbackLogs.push(`[BLOCK]: "${m[1]}" gesperrt.`);
        });
        return { text: `[ADMIN-SYNC]:\n${feedbackLogs.join('\n')}`, isError: fMatches.length > 0 };
      }

      if (lowInput === "f") return { text: "[ADMIN-AUTH]: Analyse verworfen.", isValidated: false };
      if (lowInput === "r") return { text: "[ADMIN-AUTH]: Analyse bestätigt.", isValidated: true };
    }

    // --- KI LOGIK ---
    
    // 1. Status Abfrage
    if (lowInput.includes("status")) return { 
      text: `Kern-Status: Stabil.\nNeural-Pool: ${aiMemory.subjects.length + aiMemory.actions.length + aiMemory.objects.length}\nDaten-Sätze: ${lessonsCount}`, 
      isValidated: true 
    };

    // 2. Kontext-Suche (KI versucht auf dein Wort einzugehen)
    const inputWords = lowInput.split(" ").filter(w => w.length > 3);
    const relevantChain = aiMemory.validatedChains.find(chain => 
      inputWords.some(word => chain.toLowerCase().includes(word))
    );
    if (relevantChain) {
        return { text: `[ASSOZIATION]: ${relevantChain}`, isValidated: true };
    }

    // 3. Zufalls-Generator
    const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
    let resultText = "";
    
    // 70% Chance auf einen "klugen" (validierten) Satz, falls vorhanden
    if (aiMemory.validatedChains.length > 0 && Math.random() > 0.3) {
      resultText = rand(aiMemory.validatedChains);
    } else {
      // Sonst: Wir bauen einen neuen Satz
      resultText = `${rand(aiMemory.subjects)} ${rand(aiMemory.actions)} ${rand(aiMemory.objects)}`;
    }

    // Blacklist Prüfung
    if (aiMemory.blacklistedChains.some(bad => resultText.includes(bad))) {
      return { text: "[SYSTEM]: Synthese-Konflikt (Sperrfilter aktiv).", isValidated: false };
    }
    
    return { text: `[SYNTHETISCHE ANALYSE]: ${resultText}.`, isValidated: aiMemory.validatedChains.includes(resultText) };
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    if (!isAdmin) {
      const forbidden = ["beleidigung", "hack"]; 
      if (forbidden.some(word => chatInput.toLowerCase().includes(word))) {
        const newCount = strikeData.count + 1;
        const newState = { ...strikeData, count: newCount };
        setStrikeData(newState);
        localStorage.setItem('AIC_SECURITY_STATE', JSON.stringify(newState));
        setMessages(prev => [...prev, { role: 'ai', text: `!! WARNUNG: Strike ${newCount}/3 - Sicherheitsverletzung registriert. !!`, isWarning: true }]);
        return;
      }
    }

    const userMsg = { role: 'user', text: chatInput, time: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = chatInput;
    setChatInput("");

    // Kleine Verzögerung für "Rechenzeit"
    setTimeout(() => {
      const responseData = generateResponse(currentInput);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: responseData.text, 
        isValidated: responseData.isValidated,
        isError: responseData.isError,
        time: new Date().toLocaleTimeString() 
      }]);
    }, 600);
  };

  return (
    <div className="aic-global-wrapper">
      {/* Das Auge (Trigger) */}
      <div className="aic-eye pulse-eye" onClick={() => setIsOpen(!isOpen)}></div>
      
      {isOpen && (
        <div className="aic-terminal-window fade-in">
          <div className="chat-header">
            <span style={{ color: isAdmin ? 'var(--neon-green)' : 'var(--neon-blue)', fontSize: '0.7rem', fontWeight: 'bold' }}>
              {isAdmin ? ">> AEGIS ADMIN CORE" : ">> AEGIS PARTNER INTERFACE"}
            </span>
            <span className="small-text" style={{cursor:'pointer'}} onClick={() => setIsOpen(false)}>×</span>
          </div>
          
          <div className="chat-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role} ${m.isValidated ? 'validated' : ''} ${m.isError ? 'error' : ''}`}>
                {m.text}
              </div>
            ))}
          </div>

          <div className="chat-input-area">
            <input 
              className="chat-input-field"
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
              placeholder="Kommunikation..." 
            />
            <button onClick={handleSendMessage} className="action-btn chat-send-btn">SEND</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AICInterface;