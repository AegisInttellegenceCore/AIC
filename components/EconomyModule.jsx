import React, { useCallback } from 'react';

// Zentrale Rechenlogik (Exportiert für App.jsx)
export const calculateProduction = (data, activeUni) => {
  if (!data) return { final: { iron: 0, metal: 0, krypto: 0, spice: 0 }, nettoIron: 0 };

  const { 
    planets = [], 
    mineTech = 0, 
    vipLvl = 0, 
    buyProd = {}, 
    mentorBonus = 0, 
    specType = 'None', 
    specLvl = 0, 
    alienWar = false, 
    alienDouble = false, 
    multiProd = 1 
  } = data;
  
  const UNI_SETTINGS = {
    'Retro':   { prod: 1.0 },
    'Nexus':   { prod: 3.0 },
    'Sirius':  { prod: 1.5 },
    'Genesis': { prod: 2.0 }
  };

  const SPEC_VAL = { 0: 0, 1: 0.03, 2: 0.06, 3: 0.10, 4: 0.20 };
  let raw = { iron: 0, metal: 0, krypto: 0, spice: 0 };
  const u = UNI_SETTINGS[activeUni]?.prod || 1.0;

  planets.forEach(p => {
    const ironLvl = Math.max(0, Number(p.ironLvl) || 0);
    const metalLvl = Math.max(0, Number(p.metalLvl) || 0);
    const kryptoLvl = Math.max(0, Number(p.kryptoLvl) || 0);
    const spiceLvl = Math.max(0, Number(p.spiceLvl) || 0);

    // ROH & KRYPTO: Grundproduktion
    const ironB = (u * (24 * ironLvl * Math.pow(1.15, ironLvl))) + (u * 24);
    const krypB = (u * (12.25 * kryptoLvl * Math.pow(1.15, kryptoLvl))) + (u * 12.25);

    // METALL: Nur wenn Level > 0
    const metB = metalLvl > 0 
      ? (u * (10.5 * metalLvl * Math.pow(1.15, metalLvl)) + (u * 10.5)) 
      : 0;

    // SPICE: Temperaturabhängig (Standard: 20 Grad)
    const temp = Number(p.temp) || 20;
    const spiceBase = Math.max(0, 6 - (temp / 80));
    const spiceB = spiceLvl > 0 
      ? (u * (spiceBase * spiceLvl * Math.pow(1.15, spiceLvl)) + (u * spiceBase)) 
      : 0;
    
    raw.iron += ironB; 
    raw.metal += metB; 
    raw.krypto += krypB; 
    raw.spice += spiceB;
  });

  const calcBoni = (val, res) => {
    if (val <= 0) return 0;
    
    let bonusFactor = (Number(mineTech) * 0.02) + 
                      (Number(vipLvl) * 0.01) + 
                      (Number(buyProd[res] || 0) * 0.03) + 
                      (Number(mentorBonus) / 100);
    
    if (specType === 'Miner') bonusFactor += (SPEC_VAL[specLvl] || 0);
    if (alienWar) bonusFactor += 0.10;
    if (alienDouble) bonusFactor += 1.0;
    
    const m = Number(multiProd) || 1;
    let finalVal = val * (1 + bonusFactor);
    if (m > 1) finalVal *= m;
    
    return finalVal;
  };

  const final = { 
    iron: calcBoni(raw.iron, 'iron'), 
    metal: calcBoni(raw.metal, 'metal'), 
    krypto: calcBoni(raw.krypto, 'krypto'), 
    spice: calcBoni(raw.spice, 'spice') 
  };

  return { final, nettoIron: final.iron - (final.metal * 2) };
};

const EconomyModule = ({ planets, onUpdatePlanets, totals }) => {

  const handleUpdate = useCallback((index, field, value) => {
    const newPlanets = [...planets];
    let val = value === "" ? 0 : Number(value);
    
    if (field === 'g') val = Math.max(1, Math.min(14, val));
    if (field === 's') val = Math.max(1, Math.min(400, val));
    if (field === 'p') val = Math.max(1, Math.min(16, val));
    if (field.includes('Lvl')) val = Math.max(0, val);
    
    newPlanets[index][field] = field === 'temp' || field.includes('Lvl') || ['g','s','p'].includes(field) 
      ? val 
      : value;
      
    onUpdatePlanets(newPlanets);
  }, [planets, onUpdatePlanets]);

  const addPlanet = () => {
    const newPlanet = { g: 1, s: 1, p: 1, temp: 20, ironLvl: 0, metalLvl: 0, kryptoLvl: 0, spiceLvl: 0 };
    onUpdatePlanets([...planets, newPlanet]);
  };

  const removePlanet = (index) => {
    onUpdatePlanets(planets.filter((_, i) => i !== index));
  };

  return (
    <div className="economy-module fade-in">
      {/* Oberer Glas-Container */}
      <div className="table-wrapper transparent-container">
        <table className="economy-table">
          <thead>
            <tr>
              <th style={{width: '130px'}}>SEKTOR (G:S:P)</th>
              <th>TEMP</th>
              <th>ROH</th>
              <th>MET</th>
              <th>KRYP</th>
              <th>SPI</th>
              <th>
                <button className="add-row-btn" onClick={addPlanet} title="Planet hinzufügen">+</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {planets.map((p, i) => (
              <tr key={i}>
                <td>
                  <div className="coord-input-group">
                    <input type="number" className="table-in small-in" value={p.g} onChange={(e) => handleUpdate(i, 'g', e.target.value)} />
                    <input type="number" className="table-in small-in" value={p.s} onChange={(e) => handleUpdate(i, 's', e.target.value)} />
                    <input type="number" className="table-in small-in" value={p.p} onChange={(e) => handleUpdate(i, 'p', e.target.value)} />
                  </div>
                </td>
                <td><input type="number" className="table-in" value={p.temp} onChange={(e) => handleUpdate(i, 'temp', e.target.value)} /></td>
                <td><input type="number" className="table-in" value={p.ironLvl} onChange={(e) => handleUpdate(i, 'ironLvl', e.target.value)} /></td>
                <td><input type="number" className="table-in" value={p.metalLvl} onChange={(e) => handleUpdate(i, 'metalLvl', e.target.value)} /></td>
                <td><input type="number" className="table-in" value={p.kryptoLvl} onChange={(e) => handleUpdate(i, 'kryptoLvl', e.target.value)} /></td>
                <td><input type="number" className="table-in" value={p.spiceLvl} onChange={(e) => handleUpdate(i, 'spiceLvl', e.target.value)} /></td>
                <td><button onClick={() => removePlanet(i)} className="del-row-btn" title="Entfernen">×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Unterer Glas-Container */}
      <div className="total-footer transparent-container">
        <div className="stat-box">
          <label>ROH (NETTO/TAG)</label>
          <span className="stat-value" style={{ color: totals.nettoIron < 0 ? '#ff4d4d' : '#00f3ff' }}>
            {Math.floor(totals.nettoIron * 24).toLocaleString('de-DE')}
          </span>
        </div>
        <div className="stat-box">
          <label>METALL/TAG</label>
          <span className="stat-value">{Math.floor(totals.final.metal * 24).toLocaleString('de-DE')}</span>
        </div>
        <div className="stat-box">
          <label>KRYPTONIT/TAG</label>
          <span className="stat-value">{Math.floor(totals.final.krypto * 24).toLocaleString('de-DE')}</span>
        </div>
        <div className="stat-box">
          <label>SPICE/TAG</label>
          <span className="stat-value">{Math.floor(totals.final.spice * 24).toLocaleString('de-DE')}</span>
        </div>
      </div>
    </div>
  );
};

export default EconomyModule;