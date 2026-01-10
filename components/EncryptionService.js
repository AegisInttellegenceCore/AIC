import C from 'crypto-js';

const _M = {
    a: C.AES,
    s: C.SHA256,
    u: C.enc.Utf8,
    h: C.enc.Hex
};

export const EncryptionService = {
  
  encrypt: (d, k) => {
    if (!d || !k) return null;
    try {
        const p = JSON.stringify([d, Date.now()]);
        return _M.a.encrypt(p, k).toString();
    } catch (e) {
        return null;
    }
  },

  decrypt: (c, k) => {
    if (!c || !k) return null;
    try {
        const b = _M.a.decrypt(c, k);
        const r = b.toString(_M.u);
        if (!r) return null; 

        const d = JSON.parse(r);
        return (Array.isArray(d)) ? d[0] : d;
    } catch (e) {
        return null;
    }
  },

  hashID: (i, s) => {
    if (!i || !s) return null;
    try {
        return _M.s(`${i}${s}`).toString(_M.h);
    } catch (e) {
        return null;
    }
  }
};