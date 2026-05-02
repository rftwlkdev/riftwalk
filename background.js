// ============================================================
// Riftwalk — Background Service Worker v1.3
// ============================================================

const CACHE_KEY       = 'rw_prices_cache';
const CACHE_TTL_MS    = 6 * 60 * 60 * 1000;
const FLOAT_CACHE     = 'rw_float_cache';
const DOPPLER_CACHE   = 'rw_doppler_cache';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {

    case 'FETCH':
      fetch(msg.url, msg.options || {})
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'GET_PRICES':
      chrome.storage.local.get([CACHE_KEY]).then(result => {
        const entry = result[CACHE_KEY];
        sendResponse({ prices: entry?.data || {}, ts: entry?.ts || null });
      });
      return true;

    case 'FORCE_REFRESH':
      fetchAndCachePrices()
        .then(() => sendResponse({ ok: true }))
        .catch(e => sendResponse({ ok: false, error: e.message }));
      return true;

    case 'GET_STATUS':
      chrome.storage.local.get([CACHE_KEY, 'rw_settings']).then(r => {
        const entry = r[CACHE_KEY];
        const s = r.rw_settings || {};
        sendResponse({
          hasKey:      !!s.pricempireKey,
          lastUpdated: entry?.ts || null,
          cacheAge:    entry?.ts ? Math.round((Date.now() - entry.ts) / 60000) : null,
          itemCount:   entry?.data ? Object.keys(entry.data).length : 0,
        });
      });
      return true;

    case 'GET_STEAM_TOKEN':
      scrapeAccessToken()
        .then(token => sendResponse({ success: true, token }))
        .catch(err => sendResponse({ success: false, error: err.message || err }));
      return true;

    case 'GET_TRADE_OFFERS':
      fetchTradeOffers(msg.sent, msg.received)
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message || err }));
      return true;

    case 'GET_SETTINGS':
      chrome.storage.local.get(['rw_settings']).then(r =>
        sendResponse(r.rw_settings || {})
      );
      return true;

    case 'SAVE_SETTINGS':
      chrome.storage.local.set({ rw_settings: msg.settings }).then(() =>
        sendResponse({ success: true })
      );
      return true;

    case 'GET_FLOAT': {
      getFloat(msg.inspectLink)
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    }

    case 'GET_DOPPLER_PRICE': {
      getDopplerPrice(msg.marketHashName, msg.paintIndex)
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    }
  }
});

// ── PricEmpire ──────────────────────────────────────────────
async function fetchAndCachePrices() {
  const data = await chrome.storage.local.get(['rw_settings']);
  const settings = data.rw_settings || {};
  const apiKey = settings.pricempireKey || '';
  const currency = settings.currency || 'USD';
  if (!apiKey) throw new Error('No PricEmpire API key configured');

  console.log('[Riftwalk] Fetching prices...');
  const url = `https://api.pricempire.com/v4/trader/items/prices`
    + `?app_id=730&sources=buff163,skins`
    + `&currency=${encodeURIComponent(currency)}`
    + `&api_key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${apiKey}` } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PricEmpire ${res.status}: ${text.slice(0, 200)}`);
  }

  const rawData = await res.json();
  if (!Array.isArray(rawData)) throw new Error(`Unexpected: ${typeof rawData}`);

  const priceMap = {};
  for (const item of rawData) {
    const name = item.market_hash_name;
    if (!name || !Array.isArray(item.prices)) continue;
    const entry = { buff: null, skins: null };
    for (const p of item.prices) {
      if (p.provider_key === 'buff163' && p.price > 0) entry.buff  = p.price;
      if (p.provider_key === 'skins'   && p.price > 0) entry.skins = p.price;
    }
    if (entry.buff || entry.skins) priceMap[name] = entry;
  }

  console.log(`[Riftwalk] Cached ${Object.keys(priceMap).length} prices`);
  await chrome.storage.local.set({ [CACHE_KEY]: { data: priceMap, ts: Date.now() } });

  chrome.tabs.query({ url: '*://steamcommunity.com/*' }, tabs => {
    for (const tab of tabs) chrome.tabs.sendMessage(tab.id, { type: 'PRICES_UPDATED' }).catch(() => {});
  });
  return priceMap;
}

// ── CSFloat float values ────────────────────────────────────
async function getFloat(inspectLink) {
  if (!inspectLink) throw new Error('No inspect link');
  const cached = await chrome.storage.local.get([FLOAT_CACHE]);
  const fc = cached[FLOAT_CACHE] || {};
  if (fc[inspectLink] && (Date.now() - fc[inspectLink].ts) < 86400000) return fc[inspectLink].data;

  const url = `https://api.csfloat.com/?url=${encodeURIComponent(inspectLink)}`;
  const res = await fetch(url);
  if (res.status === 429) throw new Error('CSFloat rate limited');
  if (!res.ok) throw new Error(`CSFloat ${res.status}`);

  const json = await res.json();
  const info = json.iteminfo || json;

  fc[inspectLink] = { data: info, ts: Date.now() };
  const keys = Object.keys(fc);
  if (keys.length > 500) {
    const sorted = keys.sort((a, b) => (fc[a].ts || 0) - (fc[b].ts || 0));
    for (let i = 0; i < sorted.length - 400; i++) delete fc[sorted[i]];
  }
  await chrome.storage.local.set({ [FLOAT_CACHE]: fc });
  return info;
}

// ── CSFloat Doppler phase-specific pricing ──────────────────
// Queries CSFloat listings API for lowest listing with specific paint_index
// This gives accurate phase-specific prices for Doppler/Gamma Doppler
async function getDopplerPrice(marketHashName, paintIndex) {
  if (!marketHashName || !paintIndex) throw new Error('Missing params');

  // Check cache (cache for 1 hour)
  const cacheKey = `${marketHashName}|${paintIndex}`;
  const cached = await chrome.storage.local.get([DOPPLER_CACHE]);
  const dc = cached[DOPPLER_CACHE] || {};
  if (dc[cacheKey] && (Date.now() - dc[cacheKey].ts) < 3600000) {
    return dc[cacheKey].data;
  }

  // Get CSFloat API key from settings
  const settingsData = await chrome.storage.local.get(['rw_settings']);
  const csfloatKey = settingsData.rw_settings?.csfloatKey || '';

  const params = new URLSearchParams({
    market_hash_name: marketHashName,
    paint_index: paintIndex.toString(),
    sort_by: 'lowest_price',
    limit: '1',
    type: 'buy_now',
  });

  const url = `https://csfloat.com/api/v1/listings?${params}`;
  const headers = {};
  if (csfloatKey) headers['Authorization'] = csfloatKey;

  const res = await fetch(url, { headers });
  if (res.status === 429) throw new Error('CSFloat rate limited');
  if (!res.ok) throw new Error(`CSFloat listings ${res.status}`);

  const listings = await res.json();

  let result = null;
  if (Array.isArray(listings) && listings.length > 0) {
    const listing = listings[0];
    result = {
      price: listing.price, // in cents
      floatValue: listing.item?.float_value,
      paintSeed: listing.item?.paint_seed,
      listingId: listing.id,
    };
  }

  // Cache result
  dc[cacheKey] = { data: result, ts: Date.now() };
  // Keep cache manageable
  const dcKeys = Object.keys(dc);
  if (dcKeys.length > 200) {
    const sorted = dcKeys.sort((a, b) => (dc[a].ts || 0) - (dc[b].ts || 0));
    for (let i = 0; i < sorted.length - 150; i++) delete dc[sorted[i]];
  }
  await chrome.storage.local.set({ [DOPPLER_CACHE]: dc });

  return result;
}

// ── Auto-refresh ────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(maybeRefresh);
chrome.runtime.onStartup.addListener(maybeRefresh);
async function maybeRefresh() {
  const result = await chrome.storage.local.get([CACHE_KEY, 'rw_settings']);
  const entry = result[CACHE_KEY];
  const s = result.rw_settings || {};
  if (s.pricempireKey && (!entry?.ts || Date.now() - entry.ts > CACHE_TTL_MS))
    fetchAndCachePrices().catch(e => console.warn('[Riftwalk] Auto-refresh failed:', e.message));
}

chrome.alarms.create('refresh_prices', { periodInMinutes: 360 });
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'refresh_prices')
    fetchAndCachePrices().catch(e => console.warn('[Riftwalk] Alarm refresh failed:', e.message));
});

console.log('[Riftwalk] Background ready');

// ── Steam Access Token ──────────────────────────────────────
async function scrapeAccessToken() {
  const resp = await fetch('https://steamcommunity.com/', { credentials: 'include' });
  if (!resp.ok) throw new Error(`Steam fetch failed: ${resp.status}`);
  const html = await resp.text();
  const m = html.match(/data-loyalty_webapi_token="&quot;([^&]+)&quot;"/);
  if (!m) throw new Error('Access token not found - not logged in?');
  console.log('[Riftwalk] Steam access token scraped');
  return m[1];
}

// ── Trade Offers ────────────────────────────────────────────
async function fetchTradeOffers(getSent = true, getReceived = true) {
  // Get or scrape access token
  let { rw_steam_token: token } = await chrome.storage.local.get(['rw_steam_token']);
  if (!token) {
    token = await scrapeAccessToken();
    await chrome.storage.local.set({ rw_steam_token: token });
  }

  const url = `https://api.steampowered.com/IEconService/GetTradeOffers/v1/?get_received_offers=${getReceived ? 1 : 0}&get_sent_offers=${getSent ? 1 : 0}&active_only=0&historical_only=0&get_descriptions=1&language=english&access_token=${token}`;
  
  let resp = await fetch(url);
  
  // If 403, token expired — re-scrape and retry
  if (resp.status === 403) {
    console.log('[Riftwalk] Token expired, re-scraping...');
    token = await scrapeAccessToken();
    await chrome.storage.local.set({ rw_steam_token: token });
    resp = await fetch(url.replace(/access_token=[^&]+/, `access_token=${token}`));
  }
  
  if (!resp.ok) throw new Error(`GetTradeOffers failed: ${resp.status}`);
  const body = await resp.json();
  
  if (!body.response) throw new Error('Empty response');
  console.log(`[Riftwalk] Trade offers: ${body.response.trade_offers_received?.length || 0} received, ${body.response.trade_offers_sent?.length || 0} sent, ${body.response.descriptions?.length || 0} descriptions`);
  
  return body.response;
}
