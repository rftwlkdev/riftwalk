// Riftwalk Popup v2.0

// ── Tab switching ───────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// ── Settings ────────────────────────────────────────────────
async function loadSettings() {
  const s = (await chrome.storage.local.get(['rw_settings'])).rw_settings || {};
  document.getElementById('api-key').value              = s.pricempireKey || '';
  document.getElementById('csfloat-key').value          = s.csfloatKey || '';
  document.getElementById('source').value               = s.priceSource || 'buff163';
  document.getElementById('currency').value             = s.currency || 'USD';
  document.getElementById('enable-floats').checked      = s.enableFloats !== false;
  document.getElementById('enable-doppler-prices').checked = s.enableDopplerPrices !== false;
  document.getElementById('enable-stickers').checked    = s.enableStickers !== false;
  document.getElementById('enable-steamid').checked     = s.enableSteamId !== false;
  document.getElementById('enable-fade').checked        = s.enableFadeDetection !== false;
  document.getElementById('enable-bluegem').checked     = s.enableBlueGem !== false;
  document.getElementById('enable-pattern-tier').checked = s.enablePatternTier !== false;
  document.getElementById('enable-copy-unpriced').checked = s.copyUnpriced !== false;
  document.getElementById('enable-copy-prices').checked = s.copyPrices !== false;
}

function gatherSettings() {
  return {
    pricempireKey:       document.getElementById('api-key').value.trim(),
    csfloatKey:          document.getElementById('csfloat-key').value.trim(),
    priceSource:         document.getElementById('source').value,
    currency:            document.getElementById('currency').value,
    enableFloats:        document.getElementById('enable-floats').checked,
    enableDopplerPrices: document.getElementById('enable-doppler-prices').checked,
    enableStickers:      document.getElementById('enable-stickers').checked,
    enableSteamId:       document.getElementById('enable-steamid').checked,
    enableFadeDetection: document.getElementById('enable-fade').checked,
    enableBlueGem:       document.getElementById('enable-bluegem').checked,
    enablePatternTier:   document.getElementById('enable-pattern-tier').checked,
    copyUnpriced:        document.getElementById('enable-copy-unpriced').checked,
    copyPrices:          document.getElementById('enable-copy-prices').checked,
  };
}

async function loadStatus() {
  const res = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
  const dot = document.getElementById('status-dot');
  const info = document.getElementById('cache-info');
  if (!res.hasKey) { dot.className = 'status-dot red'; info.textContent = 'No API key set.'; return; }
  if (!res.lastUpdated) { dot.className = 'status-dot yellow'; info.textContent = 'Click "Save & Fetch" to load prices.'; return; }
  const age = res.cacheAge;
  dot.className = 'status-dot green';
  info.innerHTML = `<span class="val">${(res.itemCount||0).toLocaleString()} prices</span> cached (${age < 60 ? age + 'm' : (age/60).toFixed(1) + 'h'} ago)`;
}

function showMsg(text, type) {
  const el = document.getElementById('msg');
  el.textContent = text; el.className = `msg ${type}`; el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 5000);
}

// ── Save & Fetch ────────────────────────────────────────────
document.getElementById('save-btn').addEventListener('click', async () => {
  const s = gatherSettings();
  if (!s.pricempireKey) { showMsg('Enter PricEmpire API key.', 'error'); return; }
  await chrome.storage.local.set({ rw_settings: s });
  const btn = document.getElementById('save-btn'); btn.textContent = 'FETCHING...'; btn.disabled = true;
  const res = await chrome.runtime.sendMessage({ type: 'FORCE_REFRESH' });
  btn.textContent = 'SAVE & FETCH PRICES'; btn.disabled = false;
  res.ok ? (showMsg('Prices fetched!', 'success'), loadStatus()) : showMsg(res.error || 'Failed', 'error');
});

document.getElementById('refresh-btn').addEventListener('click', async () => {
  const btn = document.getElementById('refresh-btn'); btn.textContent = 'Refreshing...'; btn.disabled = true;
  const res = await chrome.runtime.sendMessage({ type: 'FORCE_REFRESH' });
  btn.textContent = '\u21BB Force refresh prices'; btn.disabled = false;
  res.ok ? (showMsg('Refreshed!', 'success'), loadStatus()) : showMsg(res.error || 'Failed', 'error');
});

// ── Auto-save toggles ──────────────────────────────────────
for (const id of ['enable-floats','enable-doppler-prices','enable-stickers','enable-steamid','enable-fade','enable-bluegem','enable-pattern-tier','enable-copy-unpriced','enable-copy-prices','source','currency'])
  document.getElementById(id).addEventListener('change', () => chrome.storage.local.set({ rw_settings: gatherSettings() }));

// ── Import / Export ─────────────────────────────────────────
document.getElementById('import-btn').addEventListener('click', () => document.getElementById('import-file').click());
document.getElementById('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const imp = JSON.parse(await file.text());
    const s = {
      pricempireKey: imp.pricempireKey||'', csfloatKey: imp.csfloatKey||'',
      priceSource: imp.priceSource||'buff163', currency: imp.currency||'USD',
      enableFloats: imp.enableFloats!==false, enableDopplerPrices: imp.enableDopplerPrices!==false,
      enableStickers: imp.enableStickers!==false,
      enableSteamId: imp.enableSteamId!==false,
      enableFadeDetection: imp.enableFadeDetection!==false,
      enableBlueGem: imp.enableBlueGem!==false,
      enablePatternTier: imp.enablePatternTier!==false,
      copyUnpriced: imp.copyUnpriced!==false,
      copyPrices: imp.copyPrices!==false,
    };
    await chrome.storage.local.set({ rw_settings: s });
    loadSettings(); showMsg('Settings imported!', 'success');
    if (s.pricempireKey) { const r = await chrome.runtime.sendMessage({ type: 'FORCE_REFRESH' }); if (r.ok) loadStatus(); }
  } catch(err) { showMsg('Import failed: ' + err.message, 'error'); }
  e.target.value = '';
});
document.getElementById('export-btn').addEventListener('click', () => {
  const json = JSON.stringify(gatherSettings(), null, 2);
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  a.download = 'riftwalk-settings.json'; a.click(); showMsg('Exported!', 'success');
});

loadSettings();
loadStatus();
