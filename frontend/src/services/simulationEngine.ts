// Mumbai to Goa Convoy Simulation Engine for 5 Riders

import { Rider, Waypoint } from '../types';
import { audioEffects } from './audioEffects';

// High-resolution highway interpolation coordinates for Mumbai to Goa (NH 66 / Coastal Corridor)
export const MUMBAI_GOA_DETAILED_PATH: [number, number][] = [
  [18.9220, 72.8347], // Gateway of India, Mumbai
  [18.9400, 72.8350], // CST
  [18.9900, 72.8550], // Dadar
  [19.0178, 72.8478], // Sion
  [19.0550, 72.9300], // Chembur / Mankhurd
  [19.0330, 73.0297], // Vashi Bridge Navi Mumbai
  [19.0150, 73.0900], // Belapur
  [18.9894, 73.1175], // Panvel Toll Plaza
  [18.9100, 73.1300], // Palaspe Phata (Start of NH 66)
  [18.8200, 73.1500], // Karnala Bird Sanctuary Curves
  [18.7300, 73.1400], // Pen Bypass
  [18.5900, 73.1300], // Nagothane
  [18.4234, 73.1256], // Kolad (Kundalika River)
  [18.3300, 73.2000], // Indapur
  [18.2520, 73.2878], // Mangaon (Breakfast halt)
  [18.1700, 73.3400], // Lonere
  [18.0833, 73.4167], // Mahad (Ghats entry)
  [17.9200, 73.4400], // Poladpur (Ambenali Ghat junction)
  [17.8200, 73.4000], // Kashedi Ghat pass
  [17.7167, 73.3833], // Khed (HP Petrol Station)
  [17.6200, 73.4600], // Parshuram Ghat winding descent
  [17.5323, 73.5186], // Chiplun (Vashishti river valley)
  [17.4100, 73.5300], // Kamathe
  [17.2900, 73.5400], // Aravali
  [17.1895, 73.5487], // Sangameshwar (Mountain curves)
  [17.0900, 73.4200], // Nivali Waterfall bend
  [16.9902, 73.3120], // Hathkhamba Junction (Ratnagiri Bypass)
  [16.8500, 73.3900], // Pali
  [16.7400, 73.4500], // Lanja
  [16.6547, 73.5167], // Rajapur (Fuel stop)
  [16.4800, 73.6100], // Kharepatan Bridge
  [16.3700, 73.6600], // Vaibhavwadi Phata
  [16.2667, 73.7167], // Kankavli (Tea break)
  [16.1400, 73.7400], // Kasal
  [16.0300, 73.7700], // Oros / Sindhudurg Nagari
  [15.9056, 73.8194], // Sawantwadi
  [15.8200, 73.8100], // Banda (Maharashtra border)
  [15.7198, 73.7972], // Pernem Toll (Goa border)
  [15.6500, 73.7700], // Mapusa
  [15.5800, 73.7600], // Calangute Circle
  [15.5553, 73.7517]  // Baga Beach, Goa (Finish Line)
];

// Sample simulated radio transmissions that occur during the trip
const RADIO_CHATTER_SCRIPTS = [
  { senderId: 'rider-vikram', text: 'Thunder Lead: Approaching Mangaon curves. Keep 2-second staggered spacing.', role: 'leader' },
  { senderId: 'rider-priya', text: 'Valkyrie Scout: Road surface clear ahead. Moderate headwind, good visibility.', role: 'scout' },
  { senderId: 'rider-rahul', text: 'Tail Sweeper: Sweeper here. Convoy spread is 1.1 km, tail is covered.', role: 'sweeper' },
  { senderId: 'rider-arjun', text: 'Ghost 03: Copy lead. Shifting to right lane for smooth cornering.', role: 'rider' },
  { senderId: 'rider-sameer', text: 'Torque 04: Weather is holding up nicely. Beautiful Western Ghats views.', role: 'rider' },
  { senderId: 'rider-priya', text: 'Valkyrie Scout: Slow truck ahead on hairpin turn. Wait for my overtake call.', role: 'scout' },
  { senderId: 'rider-priya', text: 'Valkyrie Scout: Overtake is CLEAR. Roll through safely.', role: 'scout' },
  { senderId: 'rider-vikram', text: 'Thunder Lead: Refuel halt planned in 35 km at Rajapur HP pump.', role: 'leader' },
  { senderId: 'rider-rahul', text: 'Tail Sweeper: All riders through the toll gate safely. Regrouped.', role: 'sweeper' }
];

export class ConvoySimulationEngine {
  private isRunning: boolean = false;
  private speedMultiplier: number = 1;
  private currentProgress: number = 0.35; // Start around Mangaon (35% into the trip)
  private timerId: any = null;
  private radioTimerId: any = null;
  private onUpdateCallback: ((riders: Rider[], spreadMeters: number) => void) | null = null;
  private onRadioChatterCallback: ((msg: { senderId: string; text: string; role: string }) => void) | null = null;

  // Initial 5 riders state
  private riders: Rider[] = [
    {
      id: 'rider-vikram',
      name: 'Vikram Singh',
      callsign: 'Thunder Lead',
      bikeModel: 'Royal Enfield Himalayan 450',
      avatarColor: '#f59e0b', // Gold/Amber
      role: 'leader',
      lat: 18.2520,
      lng: 73.2878,
      heading: 172,
      speed: 78,
      altitude: 45,
      battery: 92,
      isOnline: true,
      isTalking: false,
      lastPing: Date.now(),
      distanceFromLeader: 0,
      distanceCoveredKm: 142.5,
      channel: 'convoy-main'
    },
    {
      id: 'rider-priya',
      name: 'Priya Nair',
      callsign: 'Valkyrie Scout',
      bikeModel: 'KTM 390 Adventure',
      avatarColor: '#a855f7', // Purple
      role: 'scout',
      lat: 18.2610,
      lng: 73.2860,
      heading: 170,
      speed: 82,
      altitude: 47,
      battery: 88,
      isOnline: true,
      isTalking: false,
      lastPing: Date.now(),
      distanceFromLeader: 110,
      distanceCoveredKm: 143.6,
      channel: 'convoy-main'
    },
    {
      id: 'rider-arjun',
      name: 'Arjun Mehta',
      callsign: 'Ghost 03',
      bikeModel: 'Kawasaki Ninja 650',
      avatarColor: '#10b981', // Emerald Green
      role: 'rider',
      lat: 18.2480,
      lng: 73.2890,
      heading: 173,
      speed: 76,
      altitude: 44,
      battery: 79,
      isOnline: true,
      isTalking: false,
      lastPing: Date.now(),
      distanceFromLeader: 450,
      distanceCoveredKm: 142.0,
      channel: 'convoy-main'
    },
    {
      id: 'rider-sameer',
      name: 'Sameer Khan',
      callsign: 'Torque 04',
      bikeModel: 'Triumph Scrambler 400X',
      avatarColor: '#3b82f6', // Sapphire Blue
      role: 'rider',
      lat: 18.2440,
      lng: 73.2905,
      heading: 174,
      speed: 74,
      altitude: 43,
      battery: 84,
      isOnline: true,
      isTalking: false,
      lastPing: Date.now(),
      distanceFromLeader: 890,
      distanceCoveredKm: 141.6,
      channel: 'convoy-main'
    },
    {
      id: 'rider-rahul',
      name: 'Rahul Deshmukh',
      callsign: 'Tail Sweeper',
      bikeModel: 'BMW R 1250 GS',
      avatarColor: '#06b6d4', // Cyan
      role: 'sweeper',
      lat: 18.2395,
      lng: 73.2925,
      heading: 172,
      speed: 73,
      altitude: 42,
      battery: 95,
      isOnline: true,
      isTalking: false,
      lastPing: Date.now(),
      distanceFromLeader: 1420,
      distanceCoveredKm: 141.0,
      channel: 'convoy-main'
    }
  ];

  public setOnUpdate(cb: (riders: Rider[], spreadMeters: number) => void) {
    this.onUpdateCallback = cb;
  }

  public setOnRadioChatter(cb: (msg: { senderId: string; text: string; role: string }) => void) {
    this.onRadioChatterCallback = cb;
  }

  public getRiders(): Rider[] {
    return [...this.riders];
  }

  public setSpeedMultiplier(multiplier: number) {
    this.speedMultiplier = Math.max(0.5, Math.min(10, multiplier));
  }

  public getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  public isSimulating(): boolean {
    return this.isRunning;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Tick every 1000ms
    this.timerId = setInterval(() => {
      this.tick();
    }, 1000);

    // Occasional realistic radio transmission every 25 seconds
    this.radioTimerId = setInterval(() => {
      this.triggerRandomRadioChatter();
    }, 25000);

    this.tick();
  }

  public pause() {
    this.isRunning = false;
    if (this.timerId) clearInterval(this.timerId);
    if (this.radioTimerId) clearInterval(this.radioTimerId);
  }

  public setProgress(progressRatio: number) {
    this.currentProgress = Math.max(0, Math.min(0.99, progressRatio));
    this.tick();
  }

  // Calculate point along polyline
  private getPointAtProgress(t: number): { lat: number; lng: number; heading: number } {
    const totalSegments = MUMBAI_GOA_DETAILED_PATH.length - 1;
    const scaled = t * totalSegments;
    const index = Math.floor(scaled);
    const fraction = scaled - index;

    const p1 = MUMBAI_GOA_DETAILED_PATH[Math.min(index, totalSegments)];
    const p2 = MUMBAI_GOA_DETAILED_PATH[Math.min(index + 1, totalSegments)];

    const lat = p1[0] + (p2[0] - p1[0]) * fraction;
    const lng = p1[1] + (p2[1] - p1[1]) * fraction;

    // Calculate heading angle
    const dLat = (p2[0] - p1[0]) * Math.PI / 180;
    const dLng = (p2[1] - p1[1]) * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(p2[0] * Math.PI / 180);
    const x = Math.cos(p1[0] * Math.PI / 180) * Math.sin(p2[0] * Math.PI / 180) -
              Math.sin(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) * Math.cos(dLng);
    let heading = Math.atan2(y, x) * 180 / Math.PI;
    heading = (heading + 360) % 360;

    return { lat, lng, heading: Math.round(heading) };
  }

  private tick() {
    // Advance progress (Mumbai to Goa is ~550km, at ~75km/h = ~7.3 hours)
    const baseIncrement = 0.00018 * this.speedMultiplier;
    this.currentProgress = (this.currentProgress + baseIncrement) % 1.0;

    // Offsets along route for convoy formation:
    // Scout (+0.0025 ahead)
    // Lead (0)
    // Rider 1 (-0.0018 behind)
    // Rider 2 (-0.0035 behind)
    // Sweeper (-0.0055 behind)
    const offsets: Record<string, { tOffset: number; latJitter: number; lngJitter: number; baseSpeed: number }> = {
      'rider-priya':  { tOffset: 0.0022, latJitter: 0.0002, lngJitter: -0.0003, baseSpeed: 82 },
      'rider-vikram': { tOffset: 0.0000, latJitter: 0.0000, lngJitter: 0.0000,  baseSpeed: 77 },
      'rider-arjun':  { tOffset: -0.0018, latJitter: -0.0003, lngJitter: 0.0003, baseSpeed: 76 },
      'rider-sameer': { tOffset: -0.0036, latJitter: 0.0003, lngJitter: -0.0002, baseSpeed: 74 },
      'rider-rahul':  { tOffset: -0.0058, latJitter: -0.0002, lngJitter: 0.0001, baseSpeed: 73 }
    };

    let leaderPos: { lat: number; lng: number } = { lat: 0, lng: 0 };
    let sweeperPos: { lat: number; lng: number } = { lat: 0, lng: 0 };

    this.riders.forEach((rider) => {
      const config = offsets[rider.id] || { tOffset: 0, latJitter: 0, lngJitter: 0, baseSpeed: 70 };
      const riderT = Math.max(0, (this.currentProgress + config.tOffset) % 1.0);
      const pos = this.getPointAtProgress(riderT);

      // Add realistic motorcycle road speed fluctuation
      const speedFluctuation = Math.sin(Date.now() / 4000 + rider.lat) * 4;
      const currentSpeed = Math.max(45, Math.round(config.baseSpeed + speedFluctuation));

      // Battery slow drain
      const battery = Math.max(15, Math.round(rider.battery - 0.005));

      rider.lat = pos.lat + config.latJitter;
      rider.lng = pos.lng + config.lngJitter;
      rider.heading = pos.heading;
      rider.speed = currentSpeed;
      rider.battery = battery;
      rider.lastPing = Date.now();
      rider.distanceCoveredKm = Math.round(this.currentProgress * 550 * 10) / 10;

      if (rider.role === 'leader') {
        leaderPos = { lat: rider.lat, lng: rider.lng };
      }
      if (rider.role === 'sweeper') {
        sweeperPos = { lat: rider.lat, lng: rider.lng };
      }
    });

    // Update relative distance from leader
    this.riders.forEach((rider) => {
      if (rider.role !== 'leader') {
        rider.distanceFromLeader = Math.round(this.haversine(
          rider.lat, rider.lng, leaderPos.lat, leaderPos.lng
        ));
      } else {
        rider.distanceFromLeader = 0;
      }
    });

    const packSpread = Math.round(this.haversine(
      leaderPos.lat, leaderPos.lng, sweeperPos.lat, sweeperPos.lng
    ));

    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.riders, packSpread);
    }
  }

  private triggerRandomRadioChatter() {
    if (!this.isRunning || !this.onRadioChatterCallback) return;

    const randomIndex = Math.floor(Math.random() * RADIO_CHATTER_SCRIPTS.length);
    const chatter = RADIO_CHATTER_SCRIPTS[randomIndex];

    // Find rider
    const speaker = this.riders.find(r => r.id === chatter.senderId);
    if (speaker) {
      speaker.isTalking = true;
      audioEffects.playIncomingTransmission();

      setTimeout(() => {
        if (speaker) speaker.isTalking = false;
        audioEffects.playRogerBeep();
      }, 3500);
    }

    this.onRadioChatterCallback(chatter);
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

export const convoySimulation = new ConvoySimulationEngine();
