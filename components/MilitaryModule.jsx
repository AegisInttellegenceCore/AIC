import React, { useState, useMemo } from 'react';
/* Import der neuen modularen CSS-Dateien */
import '../styles/MilitaryModule.css';
import '../styles/UIComponents.css';

const SHIP_STATS = {
  'Kleiner Transporter': { iron: 0, metal: 3000, krypto: 3000, spice: 0, points: 3 },
  'Großer Transporter': { iron: 0, metal: 8000, krypto: 6000, spice: 0, points: 7 },
  'Transmitter': { iron: 0, metal: 25000, krypto: 25000, spice: 0, points: 25 },
  'Kleiner Jäger': { iron: 0, metal: 4000, krypto: 2000, spice: 100, points: 3 },
  'Man-O-War': { iron: 0, metal: 8000, krypto: 4000, spice: 300, points: 6 },
  'Sternenkreuzer': { iron: 0, metal: 25000, krypto: 10000, spice: 1500, points: 17.5 },
  'Phoenix': { iron: 0, metal: 30000, krypto: 20000, spice: 5000, points: 25 },
  'Kolonieschiff': { iron: 10000, metal: 20000, krypto: 15000, spice: 8000, points: 22.5 },
  'Solarzellen': { iron: 0, metal: 2000, krypto: 200, spice: 400, points: 1.1 },
  'Spionagesonde': { iron: 0, metal: 0, krypto: 3000, spice: 200, points: 1.5 },
  'Recycler': { iron: 2000, metal: 10000, krypto: 5000, spice: 0, points: 8.5 },
  'Schlachtschiff': { iron: 0, metal: 35000, krypto: 25000, spice: 0, points: 30 },
  'Bomber': { iron: 0, metal: 40000, krypto: 60000, spice: 10000, points: 50 },
  'Zerstörer': { iron: 0, metal: 60000, krypto: 50000, spice: 2000, points: 55 },
  'Imp. Sternenbasis': { iron: 0, metal: 3000000, krypto: 2000000, spice: 500000, points: 2500 }
};

const MilitaryModule = ({ productionData, onExportToTrade }) => {
  const [enemyPoints, setEnemyPoints] = useState(0);
  const [shipCounts, setShipCounts] = useState({});
  const [timeFactor, setTimeFactor] = useState(24);

  const totalCosts = useMemo(() => {
    return Object.entries(shipCounts).reduce((acc, [name, count]) => {
      const qty = Math.max(0, parseInt(count) || 0);
      const stats = SHIP_STATS[name];
      if (!stats) return acc;
      acc.iron += stats.iron * qty;
      acc.metal += stats.metal * qty;
      acc.krypto += stats.krypto * qty;
      acc.spice += stats.spice * qty;
      acc.points += stats.points * qty;
      return acc;
    }, { iron: 0, metal: 0, krypto: 0, spice: 0, points: 0 });
  }, [shipCounts]);

  const handleExport = () => {
    if (totalCosts.points === 0) return;
    if (onExportToTrade) onExportToTrade(totalCosts);
    else alert("Handelsrechner-Modul noch nicht initialisiert.");
  };

  if (!productionData || !productionData.final) {
    return <div className="neon-text" style={{padding: '20px'}}>INITIALISIERE TAKTISCHE DATEN...</div>;
  }

  return (
    <div className="military-interface fade-in">
      
      {/* LINKES TERMINAL */}
      <div className="military-sidebar ally-glass-box" style={{ padding: '15px' }}>
        <h4 className="neon-text" style={{ borderBottom: '1px solid var(--neon-blue)', paddingBottom: '5px', marginTop: 0 }}>
          MILITARY-CORE v2.1
        </h4>
        
        <div className="input-group" style={{ margin: '15px 0' }}>
          <label className="small-text neon-text">TARGET SECTOR POINTS</label>
          <input 
            type="number" 
            className="main-input" 
            onChange={(e) => setEnemyPoints(Number(e.target.value) || 0)}
            placeholder="0"
          />
          <div style={{ color: 'var(--neon-green)', marginTop: '5px', fontSize: '0.85rem', fontWeight: 'bold' }}>
            MAX ATTACK (3x): {(enemyPoints * 3).toLocaleString()} PKT
          </div>
        </div>

        <div className="ally-glass-box" style={{ padding: '12px', background: 'rgba(0,0,0,0.4)' }}>
          <label className="small-text" style={{ opacity: 0.7 }}>CURRENT PLAN COST</label>
          <div className="neon-text" style={{ fontSize: '1.2rem', marginBottom: '8px', fontWeight: 'bold' }}>
            {totalCosts.points.toLocaleString()} PKT
          </div>
          <div className="res-details" style={{ fontSize: '0.75rem', lineHeight: '1.8', fontFamily: 'monospace' }}>
            ROH: <span>{totalCosts.iron.toLocaleString()}</span><br/>
            MET: <span>{totalCosts.metal.toLocaleString()}</span><br/>
            KRY: <span>{totalCosts.krypto.toLocaleString()}</span><br/>
            SPI: <span>{totalCosts.spice.toLocaleString()}</span>
          </div>
          <button className="action-btn" onClick={handleExport} style={{ width: '100%', marginTop: '12px', fontSize: '0.7rem' }}>
            AN HANDELSRECHNER SENDEN
          </button>
        </div>

        <div style={{ marginTop: '15px' }}>
          <label className="small-text" style={{ opacity: 0.7 }}>PREDICTION WINDOW</label>
          <div className="uni-selector" style={{ marginTop: '5px' }}>
            {[[1,'1H'], [24,'1T'], [168,'1W'], [720,'1M']].map(([val, label]) => (
              <button 
                key={label} 
                onClick={() => setTimeFactor(val)}
                className={timeFactor === val ? 'active' : ''}
                style={{ flex: 1, padding: '6px 2px', fontSize: '0.65rem' }}
              >
                {label}
              </button>
            ))}
          </div>
          <button className="delete-btn" onClick={() => setShipCounts({})} style={{ width: '100%', marginTop: '10px' }}>
            PLANUNG LÖSCHEN
          </button>
        </div>
      </div>

      {/* RECHTE TABELLE */}
      <div className="ship-table-container glass-panel-transparent">
        <div className="table-wrapper">
          <table className="ship-table">
            <thead style={{ position: 'sticky', top: 0, background: 'rgba(0,0,0,0.9)', zIndex: 10 }}>
              <tr className="neon-text">
                <th style={{ textAlign: 'left', padding: '12px' }}>UNIT TYPE</th>
                <th style={{ width: '120px' }}>QUANTITY</th>
                <th style={{ textAlign: 'right', paddingRight: '15px' }}>BUILDABLE ({timeFactor}h)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(SHIP_STATS).map(([name, data]) => {
                const prod = productionData.final;
                const netIron = productionData.nettoIron;

                const limits = [];
                if (data.iron > 0) limits.push(Math.floor((netIron * timeFactor) / data.iron));
                if (data.metal > 0) limits.push(Math.floor((prod.metal * timeFactor) / data.metal));
                if (data.krypto > 0) limits.push(Math.floor((prod.krypto * timeFactor) / data.krypto));
                if (data.spice > 0) limits.push(Math.floor((prod.spice * timeFactor) / data.spice));

                const possible = limits.length > 0 ? Math.min(...limits) : (data.iron === 0 && data.metal === 0 && data.krypto === 0 && data.spice === 0 ? 0 : Infinity);

                return (
                  <tr key={name} className="ship-row">
                    <td className="ship-name">{name}</td>
                    <td>
                      <input 
                        type="number" 
                        className="ship-input"
                        value={shipCounts[name] || ''}
                        onChange={(e) => setShipCounts({...shipCounts, [name]: e.target.value})}
                        placeholder="0"
                      />
                    </td>
                    <td className="possible-val" style={{ color: possible < 1 ? 'var(--alert-red)' : 'var(--neon-green)' }}>
                      {possible === Infinity ? '∞' : (possible < 0 ? 0 : possible.toLocaleString())}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MilitaryModule;