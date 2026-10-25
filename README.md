# 🏍️ Riders United — Tactical Motorcycle Convoy GPS & Voice Comms

**Riders United** is a real-time connected motorcycle convoy tracking and tactical communications platform designed for group rides (such as 5 riders touring from **Mumbai to Goa along NH 66**).

It provides live multi-rider GPS tracking on a unified map, Discord-inspired private ride channels, role assignments (Road Captain / Sweeper / Scout), Push-To-Talk (PTT) walkie-talkie audio comms with authentic radio sound effects, 1-tap tactical road alerts, and a bike cockpit HUD.

---

## 🌟 Key Features

### 1. 📍 Multi-Rider Real-Time GPS Interface
- **Unified Map View:** All riders in the convoy appear simultaneously on the same route.
- **Dynamic Motorcycle Markers:** Rotated in real-time according to each rider's GPS `heading` with custom bike avatars, callsign tags, and live speed badges.
- **Pre-Configured Mumbai ➔ Goa Route (NH 66):** 550 km coastal highway route mapped with 14 iconic waypoints:
  - 🚩 *Gateway of India, Mumbai* (Flag-off)
  - 🔄 *Panvel Junction* (Regroup & tyre pressure)
  - ☕ *Mangaon Dhaba* (Misal Pav breakfast)
  - 🏔️ *Mahad & Kashedi Ghats*
  - ⛽ *Khed HP Petrol Pump* (Refuel)
  - 🍲 *Chiplun Overlook* (Lunch stop)
  - 🏔️ *Sangameshwar Mountain curves*
  - ⛽ *Rajapur IndianOil Station* (Mandatory refuel)
  - ☕ *Kankavli Tea Break*
  - 🛂 *Pernem Toll* (Goa Border checkpoint)
  - 🏁 *Baga Beach, North Goa* (Finish Line celebration)

### 2. 👑 Ride Leader & Discord-Style Convoy Channels
- **Private Ride Rooms:** Create custom rides with unique 6-character ride codes (e.g., `MUM-GOA`) or direct join links.
- **Tactical Role System:**
  - **👑 Road Captain (Ride Leader):** Sets route pace, leads navigation, triggers group regroup chimes, reassigns roles.
  - **🛡️ Tail Gunner (Sweeper):** Brings up the rear of the pack, monitors stragglers, assists with breakdowns.
  - **⚡ Point Scout:** Rides 200m ahead to survey road conditions, gravel, police traps, and overtaking windows.
  - **🏍️ Pack Rider:** Regular convoy member with live GPS, voice comms, and telemetry.
- **Discord-Style Channel Drawer:**
  - `#convoy-main` open frequency
  - `#captains-briefing` private channel for Lead & Sweeper
  - `#emergency-sos` priority override
  - Real-time text chat and auto-logged radio transcriptions.

### 3. 🎙️ Push-To-Talk (PTT) Walkie-Talkie Voice Comms
- **Handlebar-Friendly PTT:** Large thumb button supporting both touch-hold and tap-to-toggle modes for riding gloves.
- **Keyboard Shortcut:** Hold **`Spacebar`** (or key **`T`**) to talk.
- **Web Audio API Radio SFX Synthesizer:**
  - *Motorola / Kenwood Mic Key Chirp* on PTT press.
  - *NASA / CB Radio Roger Beep* on PTT release.
  - *Squelch static burst* for authentic radio texture.
- **Active Speaker HUD:** Real-time pulsing glow and speaker banner (`🎙️ Rahul (Sweeper) is transmitting...`).
- **Live Equalizer Visualizer:** Dynamic waveform bars responsive to rider voice volume.

### 4. ⚠️ 1-Tap Tactical Road Alert Triggers
Handlebar-accessible quick action buttons for high-speed riding:
- ⚠️ **Road Hazard:** Potholes, oil slicks, loose gravel, cattle.
- ⛽ **Fuel Needed:** Alerts leader to plan a petrol pump stop.
- 🚨 **Radar / Police:** Speed trap or checkpoint warning.
- 🔧 **Breakdown:** Flat tyre or mechanical halt.
- 🔄 **Regroup:** Chimes on all rider phones to slow down.
- 🛑 **Emergency SOS:** High-priority siren alert with GPS drop pin.

### 5. ⚡ Live GPS Tracking
- Uses device geolocation for the signed-in rider and Socket.IO to share live positions with convoy members.
- Active rides persist in SQLite across restarts. Invite codes expire after 24 hours without lobby activity or 48 hours without active-ride activity; completed ride history is retained for up to 365 days and can also be cleared in the app.
- The five-rider Mumbai ➔ Goa simulation described in earlier versions has been removed.

### 6. 🏍️ Cockpit HUD & Handlebar Mount Optimizations
- **Digital Speedometer:** Large high-contrast speed readout (km/h) with dynamic RPM progress arc.
- **Convoy Formation Spread Meter:** Continuously calculates distance between Road Captain and Tail Sweeper:
  - `< 1,500m`: `OPTIMAL PACK` (Green)
  - `1,500m - 2,500m`: `PACK STRETCHED` (Amber)
  - `> 2,500m`: `STRAGGLER WARNING` (Flashing Red)
- **Screen WakeLock API:** Prevents phone screen from going to sleep while mounted on motorcycle phone holder.

---

## 🚀 Quick Start

### Backend security configuration

Set `NODE_ENV=production`, a stable random `AUTH_SECRET` of at least 32 bytes, and `CORS_ALLOWED_ORIGINS` to a comma-separated list of exact app origins before deployment. Include `https://localhost` and/or `capacitor://localhost` if using Capacitor. Production rejects non-HTTPS requests; terminate TLS at a reverse proxy and forward `X-Forwarded-Proto: https`. Restrict access to the backend HTTP port so only that proxy can reach it. Set `TRUST_PROXY=true` when using the proxy so client IP rate limits use the real remote address. Convoy creation, ride lookup, and Socket.IO rides require a signed-in account. Development origins are allowed by default only outside production.

Riders can change their password or revoke sessions for every device from the Garage profile card. Email-based password recovery is not enabled until an email delivery provider is configured. `/api/health` reports backend/database status, connected sockets, request errors, latency, memory, and uptime.

For packaged Android/iOS builds, set `VITE_BACKEND_URL` to the reachable backend URL before building (for example, `VITE_BACKEND_URL=https://api.example.com npm run build`). Users can also set the backend address in the app’s Server settings. The build-time default is `http://localhost:5001` for local development.

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
From the root project directory:
```bash
cd /home/sidd/riders-united
npm install
```

### Running the Application

**Option A: Unified Server (Recommended)**
Runs the backend and serves the compiled frontend on `http://localhost:5001`:
```bash
npm run build
cd backend && npm start
```
Open **`http://localhost:5001`** in your browser.

**Option B: Live Development Mode**
Runs both the Express/Socket.IO backend and the Vite HMR dev server concurrently:
```bash
npm run dev
```
Open **`http://localhost:5173`** (Frontend) or **`http://localhost:5001`** (Backend).
For another device on the same Wi-Fi, open the Vite **Network** URL printed by the command (for example, `http://192.168.x.x:5173`). The browser app uses Vite’s `/api` and `/socket.io` proxies, so the device does not need to connect directly to backend port `5001`. Guest Wi-Fi or router client-isolation settings can still block device-to-device connections.

---

## ⌨️ Controls & Shortcuts

| Action | Control |
| :--- | :--- |
| **Push-To-Talk (PTT)** | Hold **`Spacebar`** or **`T`** / Click & Hold PTT Button |
| **Camera: Fit Convoy** | Click **Convoy** in top-left map controls |
| **Camera: Follow Lead** | Click **👑 Leader** |
| **Camera: Follow Me** | Click **Me** |
| **Screen Always On** | Toggle **AWAKE / SLEEP** in top navigation |
| **Mute / Unmute Audio** | Click Speaker icon in navbar |
| **Tactical Alerts** | Click bottom bar buttons (Hazard, Fuel, Radar, SOS) |

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Mapping:** Leaflet with CartoDB Dark Matter tactical tiles & OpenStreetMap
- **Real-Time Networking:** Socket.IO Client, WebRTC Signaling
- **Audio Engine:** Web Audio API (chirp/beep synthesis & bandpass audio filtering), MediaStream / MediaRecorder
- **Backend:** Node.js, Express, Socket.IO, CORS, UUID
