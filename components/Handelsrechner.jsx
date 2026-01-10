import React, { useState, useEffect } from 'react';
import '../styles/Handelsrechner.css'; // Neuer CSS Import

const RATES = {
    'Roheisen': 1.0,
    'Metall': 2.4,   // 6.0 / 2.5
    'Kryptonit': 2.0,// 6.0 / 3.0
    'Spice': 6.0     // 6.0 / 1.0
};

const RES_TYPES = ['Roheisen', 'Metall', 'Kryptonit', 'Spice'];

const Handelsrechner = () => {
    // --- STATE: HANDEL ---
    const [offerRes, setOfferRes] = useState('Roheisen');
    const [offerAmount, setOfferAmount] = useState(0);
    const [targetPercents, setTargetPercents] = useState({
        'Roheisen': 0, 'Metall': 100, 'Kryptonit': 0, 'Spice': 0
    });
    const [tradeResult, setTradeResult] = useState({});
    const [percentSum, setPercentSum] = useState(100);

    // --- STATE: PUSHING ---
    const [p1Rank, setP1Rank] = useState('');
    const [p1Points, setP1Points] = useState('');
    const [p2Rank, setP2Rank] = useState('');
    const [p2Points, setP2Points] = useState('');
    const [pushingStatus, setPushingStatus] = useState(null);

    // --- LOGIK: HANDEL ---
    useEffect(() => {
        const newPercents = { 'Roheisen': 0, 'Metall': 0, 'Kryptonit': 0, 'Spice': 0 };
        const nextRes = RES_TYPES.find(r => r !== offerRes) || RES_TYPES[0];
        newPercents[nextRes] = 100;
        setTargetPercents(newPercents);
    }, [offerRes]);

    useEffect(() => {
        let sum = 0;
        RES_TYPES.forEach(r => sum += (parseFloat(targetPercents[r]) || 0));
        setPercentSum(sum);

        if (offerAmount <= 0 || sum !== 100) {
            setTradeResult({});
            return;
        }

        const totalIronValue = offerAmount * RATES[offerRes];
        const results = {};
        RES_TYPES.forEach(targetRes => {
            if (targetRes === offerRes) return;
            const percent = parseFloat(targetPercents[targetRes]) || 0;
            if (percent > 0) {
                const ironValueForTarget = totalIronValue * (percent / 100);
                results[targetRes] = ironValueForTarget / RATES[targetRes];
            }
        });
        setTradeResult(results);
    }, [offerAmount, offerRes, targetPercents]);

    const handlePercentChange = (res, value) => {
        setTargetPercents(prev => ({ ...prev, [res]: value }));
    };

    // --- LOGIK: PUSHING ---
    useEffect(() => {
        const r1 = parseInt(p1Rank) || 999999;
        const pt1 = parseInt(p1Points) || 0;
        const r2 = parseInt(p2Rank) || 999999;
        const pt2 = parseInt(p2Points) || 0;

        if (pt1 === 0 || pt2 === 0) {
            setPushingStatus(null);
            return;
        }

        let isRegulated = false;
        // Top 100 beide
        if (r1 <= 100 && r2 <= 100) {
            isRegulated = true;
        } else {
            // > 75% Regel
            const strongerPoints = Math.max(pt1, pt2);
            const weakerPoints = Math.min(pt1, pt2);
            if (strongerPoints > 0) {
                const ratio = weakerPoints / strongerPoints;
                if (ratio > 0.75) isRegulated = true;
            }
        }
        setPushingStatus(isRegulated ? 'FORBIDDEN' : 'OK');
    }, [p1Rank, p1Points, p2Rank, p2Points]);

    return (
        <div className="handelsrechner-container fade-in">
            {/* LINKES PANEL: HANDEL */}
            <div className="trade-panel">
                <h3>⚖️ Handelsrechner</h3>
                <div className="input-group">
                    <label className="neon-blue-text">BIETE:</label>
                    <div className="resource-select-group">
                        <input 
                            type="number" className="main-input" placeholder="Menge"
                            value={offerAmount} onChange={e => setOfferAmount(e.target.value)}
                        />
                        <select className="main-select" value={offerRes} onChange={e => setOfferRes(e.target.value)}>
                            {RES_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                </div>

                <div className="trade-arrow">⬇️</div>

                <div className="input-group">
                    <label className="neon-blue-text">
                        FORDERE MIX: 
                        <span style={{color: percentSum === 100 ? '#39ff14' : '#ff4d4d', marginLeft: '10px'}}>
                             ({percentSum.toFixed(0)}%)
                        </span>
                    </label>
                    <div className="percentage-inputs scrollbar-custom">
                        {RES_TYPES.map(res => (
                            <div key={res} className="percent-row">
                                <span>{res}</span>
                                <div>
                                    <input 
                                        type="number" className="main-input" min="0" max="100"
                                        value={targetPercents[res]}
                                        onChange={e => handlePercentChange(res, e.target.value)}
                                        disabled={res === offerRes}
                                        style={{opacity: res === offerRes ? 0.5 : 1}}
                                    />%
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="trade-result-box">
                    <label className="neon-blue-text" style={{marginBottom:'10px', display:'block'}}>RESULTAT (Fairer Kurs):</label>
                    {Object.keys(tradeResult).length > 0 ? (
                        Object.entries(tradeResult).map(([res, amount]) => (
                            <div key={res} className="result-item">
                                <span>{res}:</span>
                                <span className="neon-text" style={{fontWeight:'bold'}}>
                                    {amount.toLocaleString(undefined, {maximumFractionDigits: 0})}
                                </span>
                            </div>
                        ))
                    ) : <span className="small-help">Warte auf korrekte Eingabe...</span>}
                </div>
            </div>

            {/* RECHTES PANEL: PUSHING */}
            <div className="pushing-panel">
                <h3>🛡️ Pushing-Prüfung</h3>
                <p className="small-help">Prüft, ob die 20% Kurs-Regel angewendet werden muss.</p>

                <div className="player-input-group">
                    <h4>Spieler 1</h4>
                    <div style={{display:'flex', gap:'10px'}}>
                        <input type="number" className="main-input" placeholder="Platz" value={p1Rank} onChange={e => setP1Rank(e.target.value)} />
                        <input type="number" className="main-input" placeholder="Punkte" value={p1Points} onChange={e => setP1Points(e.target.value)} />
                    </div>
                </div>

                <div className="player-input-group">
                    <h4>Spieler 2</h4>
                    <div style={{display:'flex', gap:'10px'}}>
                        <input type="number" className="main-input" placeholder="Platz" value={p2Rank} onChange={e => setP2Rank(e.target.value)} />
                        <input type="number" className="main-input" placeholder="Punkte" value={p2Points} onChange={e => setP2Points(e.target.value)} />
                    </div>
                </div>

                {pushingStatus === 'OK' && (
                    <div className="pushing-result-box ok fade-in">
                        FREIER HANDEL ERLAUBT
                        <div style={{fontSize:'0.8rem', marginTop:'10px'}}>Keine Kursbeschränkung.</div>
                    </div>
                )}
                {pushingStatus === 'FORBIDDEN' && (
                    <div className="pushing-result-box forbidden fade-in">
                        REGULIERT! (20% REGEL)
                        <div style={{fontSize:'0.8rem', marginTop:'10px'}}>Max. 20% Abweichung zulässig.</div>
                    </div>
                )}
                {pushingStatus === null && (
                   <div className="pushing-result-box" style={{background:'rgba(255,255,255,0.1)', color:'#aaa'}}>Warte auf Daten...</div>
                )}
            </div>
        </div>
    );
};

export default Handelsrechner;