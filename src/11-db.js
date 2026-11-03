/* ============================================================
   Storage layer — IndexedDB only, single gateway
   Everything the phone owns lives here. No scattered localStorage
   except a tiny "last account" pointer.
   ============================================================ */
window.DB = (function () {
  const NAME = 'LIWU_DB';
  const VER = 1;
  const STORES = {
    accounts: 'id',
    characters: 'id',
    chats: 'id',
    messages: 'id',
    worldbooks: 'id',
    memories: 'id',
    settings: 'key',
    files: 'key',
    meta: 'key'
  };
  const LABEL = {
    accounts: '账号', characters: '角色档案', chats: '会话', messages: '聊天记录',
    worldbooks: '世界书', memories: '记忆', settings: '设置', files: '图片文件', meta: '元信息'
  };
  let db = null;
  const urlCache = new Map();

  function open() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('NO_IDB'));
      let req;
      try { req = indexedDB.open(NAME, VER); } catch (e) { return reject(e); }
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        Object.keys(STORES).forEach((s) => {
          if (!d.objectStoreNames.contains(s)) {
            const os = d.createObjectStore(s, { keyPath: STORES[s] });
            if (s === 'messages') os.createIndex('chatId', 'chatId', { unique: false });
            if (s === 'chats') os.createIndex('accountId', 'accountId', { unique: false });
            if (s === 'characters') os.createIndex('accountId', 'accountId', { unique: false });
            if (s === 'memories') os.createIndex('accountId', 'accountId', { unique: false });
            if (s === 'worldbooks') os.createIndex('accountId', 'accountId', { unique: false });
          }
        });
      };
      req.onsuccess = () => { db = req.result; resolve(db); };
      req.onerror = () => reject(req.error || new Error('IDB_OPEN_FAILED'));
      req.onblocked = () => reject(new Error('IDB_BLOCKED'));
    });
  }

  function tx(store, mode) {
    if (!db) throw new Error('DB_CLOSED');
    return db.transaction(store, mode || 'readonly').objectStore(store);
  }
  function wrap(req) {
    return new Promise((res, rej) => {
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  }
  const put = (s, v) => { v.updatedAt = Date.now(); return wrap(tx(s, 'readwrite').put(v)); };
  const get = (s, k) => wrap(tx(s).get(k));
  const del = (s, k) => wrap(tx(s, 'readwrite').delete(k));
  const all = (s) => wrap(tx(s).getAll());
  const clear = (s) => wrap(tx(s, 'readwrite').clear());

  /* ---- files: blobs keyed, explicit cleanup ---- */
  async function putFile(blob, meta) {
    const key = 'f_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    await put('files', {
      key, blob, type: blob.type || 'image/jpeg', size: blob.size,
      name: (meta && meta.name) || 'image', created: Date.now()
    });
    return key;
  }
  async function fileURL(key) {
    if (!key) return '';
    if (urlCache.has(key)) return urlCache.get(key);
    const rec = await get('files', key);
    if (!rec || !rec.blob) return '';
    const u = URL.createObjectURL(rec.blob);
    urlCache.set(key, u);
    return u;
  }
  async function delFile(key) {
    if (!key) return;
    if (urlCache.has(key)) { URL.revokeObjectURL(urlCache.get(key)); urlCache.delete(key); }
    await del('files', key);
  }
  /* replace an image field, old file is destroyed after the new one lands */
  async function replaceFile(oldKey, blob, meta) {
    const key = await putFile(blob, meta);
    if (oldKey && oldKey !== key) await delFile(oldKey);
    return key;
  }

  function bytesOf(v) {
    if (!v) return 0;
    if (v.blob instanceof Blob) return v.blob.size + 90;
    try { return new Blob([JSON.stringify(v)]).size; } catch (e) { return 0; }
  }

  async function sizes() {
    const out = [];
    for (const s of Object.keys(STORES)) {
      const rows = await all(s);
      let bytes = 0;
      rows.forEach((r) => { bytes += bytesOf(r); });
      out.push({ store: s, label: LABEL[s], count: rows.length, bytes });
    }
    return out;
  }

  async function wipeStore(s) {
    if (s === 'files') {
      urlCache.forEach((u) => URL.revokeObjectURL(u));
      urlCache.clear();
    }
    await clear(s);
  }

  async function wipeAll() {
    for (const s of Object.keys(STORES)) await wipeStore(s);
  }

  return { open, put, get, del, all, clear, putFile, fileURL, delFile, replaceFile, sizes, wipeStore, wipeAll, STORES, LABEL, bytesOf };
})();

window.U = {
  uid(prefix) {
    return (prefix || 'x') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },
  bytes(n) {
    if (!n) return '0 B';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  },
  pad(n) { return n < 10 ? '0' + n : '' + n; },
  hhmm(ts) {
    const d = new Date(ts);
    return U.pad(d.getHours()) + ':' + U.pad(d.getMinutes());
  },
  dayKey(ts) { const d = new Date(ts); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); },
  dayLabel(ts) {
    const d = new Date(ts), now = new Date();
    const k = U.dayKey(ts);
    if (k === U.dayKey(now.getTime())) return '今天';
    const y = new Date(now.getTime() - 864e5);
    if (k === U.dayKey(y.getTime())) return '昨天';
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  },
  rel(ts) {
    const diff = Date.now() - ts;
    if (diff < 60e3) return '刚刚';
    if (diff < 3600e3) return Math.floor(diff / 60e3) + ' 分钟前';
    if (U.dayKey(ts) === U.dayKey(Date.now())) return U.hhmm(ts);
    if (diff < 7 * 864e5) return Math.floor(diff / 864e5) + ' 天前';
    const d = new Date(ts);
    return (d.getMonth() + 1) + '/' + d.getDate();
  },
  fullTime(ts) {
    const d = new Date(ts);
    return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate()) + ' ' + U.pad(d.getHours()) + ':' + U.pad(d.getMinutes());
  },
  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  stripTags(s) {
    return String(s || '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<narratage>([\s\S]*?)<\/narratage>/gi, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  },
  clip(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n) + '…' : s;
  },
  initial(name) { return String(name || '?').trim().slice(0, 1).toUpperCase(); },
  hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h.toString(36);
  },
  async fileToBlob(file, max) {
    max = max || 1600;
    if (!file.type.startsWith('image/')) return file;
    try {
      const bmp = await new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = URL.createObjectURL(file);
      });
      const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
      const ctx = c.getContext('2d');
      ctx.drawImage(bmp, 0, 0, c.width, c.height);
      URL.revokeObjectURL(bmp.src);
      const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.86));
      return blob || file;
    } catch (e) { return file; }
  }
};
