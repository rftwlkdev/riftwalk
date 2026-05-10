# ⚡ Riftwalk - CS2 Trading Extension

> Free browser extension that adds instant pricing, float values, Doppler phase detection, pattern tiers, sticker values, and trade offer comparison directly to your Steam inventory.

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![License](https://img.shields.io/badge/license-GPL--3.0-green)
![Chrome](https://img.shields.io/badge/platform-Chrome%20%7C%20Firefox%20%7C%20Edge%20%7C%20Brave%20%7C%20Opera-orange)

---

## 🔥 Features

### 💰 Pricing
- **Two pricing modes:**
  - **PricEmpire + CSFloat** — Buff163/Skins.com prices + phase-specific Doppler pricing (requires free API keys)
  - **Skinport** — No API key required, includes built-in Doppler phase pricing
- **33,000+ items** priced from Buff163 and Skins.com via PricEmpire
- **Doppler phase-specific pricing** via CSFloat API or Skinport
- **Click any price** to open the Buff163 listing
- **Total inventory value** bar with item count

### 🎯 Item Details
- **Float values** extracted from Steam's internal data
- **Fade percentage** detection for 27 weapons
- **Blue Gem tiers** - AK-47, Five-SeveN, Karambit (Scar, T1-T3)
- **Pattern tiers** - Max Pink, Max Blue, Fire & Ice (1st-10th Max), Crimson Web
- **Exterior labels** (FN/MW/FT/WW/BS) on every item
- **Rarity border glow** matching item quality

### 🔍 Inspect in Browser
- **3D skin viewer** — click "Inspect in Browser" to open your exact skin in a 3D viewer with stickers and wear
- Works on any item with an inspect link

### 🏷️ Stickers & Patches
- **Hover popup** showing all applied stickers, patches, and charms
- **Individual prices** for each sticker with total value
- **Combined popup** with float, seed, and pattern info

### 📊 Trade Offers
- **Profit/loss with %** on trade offer creation page
- **PnL on incoming/sent offers** via Steam API
- **Manual price override** for Dopplers and special items

### 🔗 Profile Buttons
- **Copy SteamID64** - one click copy
- **Copy Trade Link** - on your own profile
- **CSFloat Stall** - open anyone's CSFloat stall
- **CSGO-Rep** - open anyone's CSGO-Rep profile

### ⏰ Trade Lock
- **Days remaining** countdown on trade-locked items
- **Context 16 support** - trade-locked items get prices and floats

### 🔍 Inventory Tools
- **Fuzzy search** bar
- **Sort by price**
- **Multi-select** with Ctrl+click
- **Copy inventory list** with full details (phase, float, fade, stickers)
- **Duplicate count** badges

### ⚡ Performance
- **Smart batching** for large inventories (1000+ items)
- **Visible-page-only** processing
- **CSFloat price cache** by weapon + phase

---

## 📸 Screenshots

| Inventory View | Trade Offer PnL |
|:-:|:-:|
| ![Inventory](https://rftwlk.com/ss-inventory.png) | ![Trade](https://rftwlk.com/ss-tradeoffer.png) |

| Doppler Detection | Sticker Popup |
|:-:|:-:|
| ![Doppler](https://rftwlk.com/ss-doppler.png) | ![Stickers](https://rftwlk.com/ss-stickers.png) |

---

## 🚀 Installation

### Chrome Web Store
1. Visit the [Chrome Web Store listing](https://chromewebstore.google.com/detail/riftwalk-cs2-trading-enha/ckfkgceckiojoblhpiimilfldomfgakl)
2. Click "Add to Chrome"

### Firefox Add-ons
1. Visit the [Firefox Add-ons listing](https://addons.mozilla.org/addon/riftwalk-cs2-trading-enhancer/)
2. Click "Add to Firefox"

### Manual Install (Developer Mode)
1. Download or clone this repo
2. Open `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the `riftwalk` folder
6. Open any Steam inventory - Riftwalk is active!

---

## ⚙️ Setup

### Option 1: Skinport Mode (No API key needed)
1. Click the Riftwalk icon in your browser toolbar
2. Toggle the pricing mode switch to **Skinport**
3. Click **Save & Fetch Prices**
4. Done — prices load with zero setup!

### Option 2: PricEmpire + CSFloat Mode (More accurate)
1. Get a free API key at [pricempire.com/settings/developer](https://pricempire.com/settings/developer)
2. Click the Riftwalk icon in your browser toolbar
3. Paste your API key in the **Settings** tab
4. Click **Save & Fetch Prices**
5. (Optional) Add a CSFloat API key from [csfloat.com/profile](https://csfloat.com/profile) for Doppler phase pricing

---

## 📋 Changelog

### v1.1
- **Doppler Pricing Fix** — Correct phase-specific prices for all knife types (Butterfly, Karambit, etc.)
- **Skinport Pricing Mode** — New toggle in settings. Get prices with zero API keys required. Includes built-in Doppler phase pricing.
- **Inspect in Browser** — New button opens a 3D skin viewer with your exact skin, stickers, and wear.
- **Price Sanity Filter** — Fixed absurd pricing on items like Operation Hydra Case Key.
- **Currency Fix** — Doppler prices now correctly convert to your selected currency (EUR, GBP, CNY).

### v1.0
- Initial release

---

## 🏗️ Project Structure

```
riftwalk/
├── manifest.json          # Extension manifest (MV3)
├── content.js             # Main content script - inventory labeling, trade offers
├── pageworld.js           # MAIN world script - access to Steam's JS globals
├── background.js          # Service worker - PricEmpire/Skinport API, CSFloat proxy
├── skin_data.js           # Pattern databases - fade, blue gem, doppler, marble fade
├── inspect_decoder.js     # Bundled CS2 inspect link decoder
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic - settings, status, import/export
├── settings-template.json # Default settings for import
└── icons/                 # Extension icons (16, 32, 48, 128px)
```

---

## 🔒 Privacy

- **No data collection** - everything runs locally in your browser
- **No servers** - API calls go directly to PricEmpire, Skinport, CSFloat, and Steam
- **No tracking** inside the extension
- Full privacy policy at [rftwlk.com/privacy](https://rftwlk.com/privacy)

---

## 🤝 Contributing

Found a bug? Have a feature idea?

- Open an [issue](../../issues)
- Join our [Discord](https://discord.gg/6MFAmebrHW)
- Submit a pull request

---

## ☕ Support

Riftwalk is 100% free. If it helped you on a trade, consider dropping a skin:

**[Copy Trade Link](https://steamcommunity.com/tradeoffer/new/?partner=394611180&token=mtORf08f)**

---

## 📄 License

GPL-3.0 License - see [LICENSE](LICENSE) for details.

---

**[rftwlk.com](https://rftwlk.com)** | **[Discord](https://discord.gg/6MFAmebrHW)** | **[Steam](https://steamcommunity.com/id/rftwlk)**
