import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e7 // 10 MB for voice packets
});

// Port configuration
const PORT = process.env.PORT || 5001;

// Default Mumbai to Goa Route Waypoints
const DEFAULT_MUMBAI_GOA_ROUTE = [
  { id: 'wp-1', name: 'Gateway of India, Mumbai (Start)', lat: 18.9220, lng: 72.8347, type: 'start', description: 'Convoy flag-off point' },
  { id: 'wp-2', name: 'Panvel Junction (Regroup)', lat: 18.9894, lng: 73.1175, type: 'regroup', description: 'Toll plaza regroup & tyre pressure check' },
  { id: 'wp-3', name: 'Kolad River Stretch', lat: 18.4234, lng: 73.1256, type: 'scenic', description: 'Kundalika river bridge' },
  { id: 'wp-4', name: 'Mangaon Dhaba (Breakfast)', lat: 18.2520, lng: 73.2878, type: 'food', description: 'Misal Pav & Chai pitstop' },
  { id: 'wp-5', name: 'Mahad Ghats Gateway', lat: 18.0833, lng: 73.4167, type: 'waypoint', description: 'Caution: Winding curves' },
  { id: 'wp-6', name: 'Khed HP Petrol Pump', lat: 17.7167, lng: 73.3833, type: 'fuel', description: 'Refueling stop for all bikes' },
  { id: 'wp-7', name: 'Chiplun Overlook (Lunch)', lat: 17.5323, lng: 73.5186, type: 'food', description: 'Vashishti River valley lunch halt' },
  { id: 'wp-8', name: 'Sangameshwar Ghat Section', lat: 17.1895, lng: 73.5487, type: 'scenic', description: 'Scenic mountain curves' },
  { id: 'wp-9', name: 'Hathkhamba Junction (Ratnagiri)', lat: 16.9902, lng: 73.3120, type: 'waypoint', description: 'Coastal highway connector' },
  { id: 'wp-10', name: 'Rajapur IndianOil Fuel Station', lat: 16.6547, lng: 73.5167, type: 'fuel', description: 'Mandatory refuel point' },
  { id: 'wp-11', name: 'Kankavli Tea Break', lat: 16.2667, lng: 73.7167, type: 'food', description: 'Quick refresh & hydration' },
  { id: 'wp-12', name: 'Sawantwadi Woods Stretch', lat: 15.9056, lng: 73.8194, type: 'waypoint', description: 'Final highway sprint before Goa' },
  { id: 'wp-13', name: 'Pernem Toll (Goa Border)', lat: 15.7198, lng: 73.7972, type: 'regroup', description: 'Goa border entry checkpoint' },
  { id: 'wp-14', name: 'Baga Beach, North Goa (Finish)', lat: 15.5553, lng: 73.7517, type: 'destination', description: 'Victory halt! Beachside celebration' }
];

// In-Memory Rides Data Store
const rides = new Map();

// Helper to initialize Mumbai to Goa ride
function initDefaultRide() {
  const code = 'MUM-GOA';
  const ride = {
    id: 'ride-mum-goa-default',
    code: code,
    title: 'Mumbai to Goa Thunder Run 2026',
    description: '5-Bike Highway Convoy across NH 66 through Western Ghats to Baga Beach',
    leaderId: 'rider-vikram',
    createdAt: Date.now(),
    status: 'in-progress',
    targetSpeed: 75, // km/h
    route: DEFAULT_MUMBAI_GOA_ROUTE,
    riders: new Map([
      ['rider-vikram', {
        id: 'rider-vikram',
        name: 'Vikram Singh',
        callsign: 'Thunder Lead',
        bikeModel: 'Royal Enfield Himalayan 450',
        avatarColor: '#f59e0b', // Amber/Gold
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
      }],
      ['rider-priya', {
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
      }],
      ['rider-arjun', {
        id: 'rider-arjun',
        name: 'Arjun Mehta',
        callsign: 'Ghost 03',
        bikeModel: 'Kawasaki Ninja 650',
        avatarColor: '#10b981', // Emerald
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
      }],
      ['rider-sameer', {
        id: 'rider-sameer',
        name: 'Sameer Khan',
        callsign: 'Torque 04',
        bikeModel: 'Triumph Scrambler 400X',
        avatarColor: '#3b82f6', // Blue
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
      }],
      ['rider-rahul', {
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
      }]
    ]),
    alerts: [
      {
        id: 'alert-initial-1',
        type: 'hazard',
        title: 'Road Work Ahead',
        detail: 'Single lane bridge repair near Mangaon bypass. Slow down.',
        lat: 18.2410,
        lng: 73.2910,
        createdBy: 'rider-priya',
        createdAt: Date.now() - 1000 * 60 * 5,
        active: true
      }
    ],
    messages: [
      {
        id: 'msg-1',
        senderId: 'rider-vikram',
        senderName: 'Vikram (Leader)',
        text: 'Welcome to Riders United! Route is locked: Gateway to Baga Beach. Keep staggered formation.',
        timestamp: Date.now() - 1000 * 60 * 15,
        type: 'system'
      },
      {
        id: 'msg-2',
        senderId: 'rider-priya',
        senderName: 'Priya (Scout)',
        text: 'Road is clear after the Mangaon bend. Surface is dry, good grip.',
        timestamp: Date.now() - 1000 * 60 * 8,
        type: 'chat'
      },
      {
        id: 'msg-3',
        senderId: 'rider-rahul',
        senderName: 'Rahul (Sweeper)',
        text: 'Tail Gunner check. Convoy spacing is 1.4km. Pack is tight and riding safe.',
        timestamp: Date.now() - 1000 * 60 * 3,
        type: 'chat'
      }
    ]
  };
  rides.set(code, ride);
}

initDefaultRide();

// Helper to serialize ride for JSON
function serializeRide(ride) {
  return {
    ...ride,
    riders: Array.from(ride.riders.values())
  };
}

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), totalRides: rides.size });
});

app.get('/api/rides/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const ride = rides.get(code);
  if (!ride) {
    return res.status(404).json({ error: 'Ride channel not found' });
  }
  res.json(serializeRide(ride));
});

app.post('/api/rides', (req, res) => {
  const { title, description, leaderName, leaderBike, targetSpeed, waypoints } = req.body;
  const code = (req.body.code || Math.random().toString(36).substring(2, 8)).toUpperCase();

  if (rides.has(code)) {
    return res.status(400).json({ error: 'Ride code already exists' });
  }

  const leaderId = `rider-${uuidv4().substring(0, 8)}`;
  const leaderRider = {
    id: leaderId,
    name: leaderName || 'Ride Leader',
    callsign: 'Road Captain',
    bikeModel: leaderBike || 'Adventure Tourer',
    avatarColor: '#f59e0b',
    role: 'leader',
    lat: waypoints && waypoints.length > 0 ? waypoints[0].lat : 18.9220,
    lng: waypoints && waypoints.length > 0 ? waypoints[0].lng : 72.8347,
    heading: 0,
    speed: 0,
    altitude: 10,
    battery: 100,
    isOnline: true,
    isTalking: false,
    lastPing: Date.now(),
    distanceFromLeader: 0,
    distanceCoveredKm: 0,
    channel: 'convoy-main'
  };

  const newRide = {
    id: `ride-${uuidv4()}`,
    code,
    title: title || 'New Motorcycle Convoy',
    description: description || 'United riders on the road',
    leaderId: leaderId,
    createdAt: Date.now(),
    status: 'setup',
    targetSpeed: targetSpeed || 70,
    route: waypoints && waypoints.length > 0 ? waypoints : DEFAULT_MUMBAI_GOA_ROUTE,
    riders: new Map([[leaderId, leaderRider]]),
    alerts: [],
    messages: [
      {
        id: `msg-${uuidv4()}`,
        senderId: leaderId,
        senderName: 'System',
        text: `Ride "${title || code}" created by ${leaderName}. Code: ${code}`,
        timestamp: Date.now(),
        type: 'system'
      }
    ]
  };

  rides.set(code, newRide);
  res.json({ ride: serializeRide(newRide), leaderRider });
});

// Socket.io Realtime Telemetry & Audio Signaling
io.on('connection', (socket) => {
  let currentRideCode = null;
  let currentRiderId = null;

  // Join Ride Channel
  socket.on('ride:join', ({ code, rider }) => {
    code = (code || 'MUM-GOA').toUpperCase();
    const ride = rides.get(code);

    if (!ride) {
      socket.emit('ride:error', { message: 'Ride channel not found' });
      return;
    }

    currentRideCode = code;
    socket.join(code);

    // If rider details provided
    if (rider && rider.id) {
      currentRiderId = rider.id;
      const existing = ride.riders.get(rider.id);
      if (existing) {
        Object.assign(existing, rider, { isOnline: true, lastPing: Date.now() });
      } else {
        ride.riders.set(rider.id, {
          ...rider,
          isOnline: true,
          lastPing: Date.now(),
          distanceFromLeader: 0
        });
      }

      // Notify room
      io.to(code).emit('rider:joined', {
        rider: ride.riders.get(rider.id),
        message: `${rider.name} joined the ride convoy!`
      });
    }

    // Send complete current state to joining socket
    socket.emit('ride:state', serializeRide(ride));
  });

  // Telemetry stream (GPS, speed, heading, battery, etc.)
  socket.on('telemetry:update', (data) => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride) return;

    const riderId = data.riderId || currentRiderId;
    if (!riderId) return;

    let rider = ride.riders.get(riderId);
    if (!rider) {
      rider = { ...data, id: riderId, isOnline: true };
      ride.riders.set(riderId, rider);
    } else {
      Object.assign(rider, data, {
        lastPing: Date.now(),
        isOnline: true
      });
    }

    // Calculate distance from leader
    const leader = ride.riders.get(ride.leaderId);
    if (leader && rider.id !== leader.id && rider.lat && leader.lat) {
      rider.distanceFromLeader = Math.round(calculateDistanceMeters(
        rider.lat, rider.lng, leader.lat, leader.lng
      ));
    } else {
      rider.distanceFromLeader = 0;
    }

    // Broadcast updated telemetry to room
    io.to(currentRideCode).emit('telemetry:broadcast', {
      riderId,
      telemetry: rider
    });
  });

  // Batch simulation updates (for Mumbai to Goa simulated convoy)
  socket.on('telemetry:batch', ({ updates }) => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride || !Array.isArray(updates)) return;

    const leader = ride.riders.get(ride.leaderId);

    updates.forEach((u) => {
      let r = ride.riders.get(u.id);
      if (r) {
        Object.assign(r, u, { lastPing: Date.now(), isOnline: true });
        if (leader && r.id !== leader.id) {
          r.distanceFromLeader = Math.round(calculateDistanceMeters(
            r.lat, r.lng, leader.lat, leader.lng
          ));
        }
      }
    });

    io.to(currentRideCode).emit('telemetry:batch_broadcast', {
      riders: Array.from(ride.riders.values())
    });
  });

  // Role Assignment (Road Captain, Sweeper, Scout, Rider)
  socket.on('ride:assign_role', ({ targetRiderId, newRole }) => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride) return;

    const rider = ride.riders.get(targetRiderId);
    if (rider) {
      // If transferring leader role
      if (newRole === 'leader') {
        const oldLeader = ride.riders.get(ride.leaderId);
        if (oldLeader) oldLeader.role = 'rider';
        ride.leaderId = targetRiderId;
      }
      rider.role = newRole;

      io.to(currentRideCode).emit('ride:role_changed', {
        riderId: targetRiderId,
        newRole,
        ride: serializeRide(ride),
        message: `${rider.name} is now designated as ${newRole.toUpperCase()}!`
      });
    }
  });

  // Push-To-Talk Voice Comms
  socket.on('voice:start', ({ riderId, callsign, channel }) => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (ride && ride.riders.has(riderId)) {
      ride.riders.get(riderId).isTalking = true;
    }

    socket.to(currentRideCode).emit('voice:incoming_start', {
      riderId,
      callsign,
      channel: channel || 'convoy-main',
      timestamp: Date.now()
    });
  });

  socket.on('voice:chunk', ({ riderId, audioBlobBase64, channel }) => {
    if (!currentRideCode) return;
    // Broadcast raw audio chunk to peer riders in same channel
    socket.to(currentRideCode).emit('voice:incoming_chunk', {
      riderId,
      audioBlobBase64,
      channel: channel || 'convoy-main'
    });
  });

  socket.on('voice:stop', ({ riderId, callsign, channel }) => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (ride && ride.riders.has(riderId)) {
      ride.riders.get(riderId).isTalking = false;
    }

    socket.to(currentRideCode).emit('voice:incoming_stop', {
      riderId,
      callsign,
      channel: channel || 'convoy-main',
      timestamp: Date.now()
    });
  });

  // WebRTC Audio Signaling (Mesh for ultra-low latency audio)
  socket.on('webrtc:signal', ({ targetSocketId, signal, fromRiderId }) => {
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc:signal', {
        fromSocketId: socket.id,
        fromRiderId,
        signal
      });
    } else if (currentRideCode) {
      socket.to(currentRideCode).emit('webrtc:signal', {
        fromSocketId: socket.id,
        fromRiderId,
        signal
      });
    }
  });

  // Tactical Road Alerts (Hazard, Fuel, Police, Regroup, SOS)
  socket.on('alert:create', (alertData) => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride) return;

    const newAlert = {
      id: `alert-${uuidv4()}`,
      type: alertData.type || 'hazard', // 'hazard' | 'fuel' | 'police' | 'sos' | 'regroup' | 'stop'
      title: alertData.title,
      detail: alertData.detail,
      lat: alertData.lat,
      lng: alertData.lng,
      createdBy: alertData.createdBy || currentRiderId,
      creatorName: alertData.creatorName || 'Rider',
      createdAt: Date.now(),
      active: true
    };

    ride.alerts.unshift(newAlert);
    if (ride.alerts.length > 20) ride.alerts.pop();

    io.to(currentRideCode).emit('alert:broadcast', {
      alert: newAlert,
      message: `ALERT: ${newAlert.title} reported by ${newAlert.creatorName}!`
    });
  });

  socket.on('alert:dismiss', ({ alertId }) => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride) return;

    const target = ride.alerts.find(a => a.id === alertId);
    if (target) {
      target.active = false;
      io.to(currentRideCode).emit('alert:dismissed', { alertId });
    }
  });

  // Chat message in ride channel
  socket.on('chat:send', ({ text, senderId, senderName, type }) => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride) return;

    const msg = {
      id: `msg-${uuidv4()}`,
      senderId: senderId || currentRiderId,
      senderName: senderName || 'Rider',
      text,
      timestamp: Date.now(),
      type: type || 'chat'
    };

    ride.messages.push(msg);
    if (ride.messages.length > 100) ride.messages.shift();

    io.to(currentRideCode).emit('chat:broadcast', msg);
  });

  // Route Waypoint addition or update
  socket.on('route:add_waypoint', (waypoint) => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride) return;

    const wp = {
      id: `wp-${uuidv4()}`,
      ...waypoint
    };
    ride.route.push(wp);

    io.to(currentRideCode).emit('route:updated', {
      route: ride.route,
      message: `New waypoint added: ${wp.name}`
    });
  });

  // Set full custom route anywhere in the world
  socket.on('route:set', (routeData) => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride) return;

    ride.activeRoute = routeData;
    io.to(currentRideCode).emit('route:set_broadcast', {
      activeRoute: routeData,
      message: `Convoy route updated: ${routeData.title || 'Custom Route'}`
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (currentRideCode && currentRiderId) {
      const ride = rides.get(currentRideCode);
      if (ride && ride.riders.has(currentRiderId)) {
        const rider = ride.riders.get(currentRiderId);
        rider.isOnline = false;
        rider.isTalking = false;
        io.to(currentRideCode).emit('rider:left', {
          riderId: currentRiderId,
          message: `${rider.name} went offline.`
        });
      }
    }
  });
});

// Haversine distance formula in meters
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
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

// Serve frontend static build if available
const distPath = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🏍️ Riders United Server running on http://localhost:${PORT}`);
  console.log(`📍 Mumbai to Goa default ride initialized with 5 convoy riders`);
});
