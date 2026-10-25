import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { dbService } from './database.js';

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

const PORT = process.env.PORT || 5001;

// In-Memory Real Rides Data Store (NO FAKE BOTS)
const rides = new Map();

// Helper to generate simple auth token
function generateToken(userId) {
  return `ru_token_${userId}_${Date.now()}`;
}

// Helper to serialize ride for JSON output
function serializeRide(ride) {
  return {
    ...ride,
    riders: Array.from(ride.riders.values())
  };
}

// Generate human-friendly 6-character ride codes (e.g., "RD-492")
function generateRideCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'RD-';
  for (let i = 0; i < 3; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

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

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    totalActiveRides: rides.size
  });
});

// ══════════════════════════════════════════════════════════════════════
// AUTHENTICATION & USER MANAGEMENT (SQLite DATABASE)
// ══════════════════════════════════════════════════════════════════════

// Register a new rider account
app.post('/api/auth/register', (req, res) => {
  const { email, password, name, callsign, bikeModel, avatarColor } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = dbService.findUserByEmail(normalizedEmail);
  if (existingUser) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  const userId = `user-${uuidv4().substring(0, 8)}`;
  const passwordHash = bcrypt.hashSync(password, 10);

  const newUser = dbService.createUser({
    id: userId,
    email: normalizedEmail,
    passwordHash,
    name: name?.trim() || 'Rider',
    callsign: callsign?.trim() || 'Apex',
    bikeModel: bikeModel?.trim() || 'Motorcycle',
    avatarColor: avatarColor || '#ef4444'
  });

  const token = generateToken(userId);
  res.json({ user: newUser, token });
});

// Email & Password Rider Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = dbService.findUserByEmail(normalizedEmail);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken(user.id);
  const userProfile = {
    id: user.id,
    email: user.email,
    name: user.name,
    callsign: user.callsign,
    bikeModel: user.bike_model,
    avatarColor: user.avatar_color,
    createdAt: user.created_at
  };

  res.json({ user: userProfile, token });
});

// ══════════════════════════════════════════════════════════════════════
// RIDE HISTORY ENDPOINTS (SQLite DATABASE)
// ══════════════════════════════════════════════════════════════════════

// Save a completed ride to database history
app.post('/api/rides/history', (req, res) => {
  const { userId, ride } = req.body;
  if (!ride) {
    return res.status(400).json({ error: 'Ride details are required' });
  }

  const rideId = ride.id || `hist-${uuidv4().substring(0, 8)}`;
  const completedRide = dbService.saveCompletedRide({
    id: rideId,
    userId: userId || null,
    routeTitle: ride.routeTitle || `${ride.startName || 'Start'} ➔ ${ride.destName || 'Finish'}`,
    startName: ride.startName || 'Start Point',
    destName: ride.destName || 'Destination',
    distanceKm: Number(ride.distanceKm) || 0,
    durationMinutes: Number(ride.durationMinutes) || 0,
    avgSpeedKmh: Number(ride.avgSpeedKmh) || 0,
    mode: ride.mode || 'solo',
    code: ride.code || null,
    completedAt: ride.completedAt || Date.now()
  });

  res.json({ success: true, ride: completedRide });
});

// Get rider's completed ride history from database
app.get('/api/rides/history', (req, res) => {
  const userId = req.query.userId;
  const history = dbService.getRideHistory(userId || null);
  res.json({ history });
});

// Clear rider's completed ride history
app.delete('/api/rides/history', (req, res) => {
  const userId = req.query.userId;
  dbService.clearRideHistory(userId || null);
  res.json({ success: true });
});

// List all active public rides
app.get('/api/rides', (req, res) => {
  const list = Array.from(rides.values()).map(serializeRide);
  res.json({ rides: list });
});

// Check if a ride exists by code
app.get('/api/rides/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const ride = rides.get(code);
  if (!ride) {
    return res.status(404).json({ error: 'Convoy channel not found' });
  }
  res.json(serializeRide(ride));
});

// Create a new real ride
app.post('/api/rides', (req, res) => {
  const { title, description, leaderName, leaderCallsign, leaderBike, leaderColor, targetSpeed } = req.body;
  
  let code = req.body.code ? req.body.code.toUpperCase() : generateRideCode();
  while (rides.has(code)) {
    code = generateRideCode();
  }

  const leaderId = req.body.leaderId || `rider-${uuidv4().substring(0, 8)}`;
  const leaderRider = {
    id: leaderId,
    name: leaderName || 'Ride Captain',
    callsign: leaderCallsign || 'Thunder Lead',
    bikeModel: leaderBike || 'Motorcycle',
    avatarColor: leaderColor || '#ef4444',
    role: 'leader',
    lat: 0,
    lng: 0,
    heading: 0,
    speed: 0,
    altitude: 0,
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
    title: title || `${leaderRider.name}'s Convoy`,
    description: description || 'Live GPS motorcycle convoy',
    leaderId: leaderId,
    createdAt: Date.now(),
    status: 'lobby', // 'lobby' | 'active' | 'completed'
    targetSpeed: Number(targetSpeed) || 75,
    route: [],
    activeRoute: null,
    riders: new Map([[leaderId, leaderRider]]),
    alerts: [],
    messages: [
      {
        id: `msg-${uuidv4()}`,
        senderId: leaderId,
        senderName: 'System',
        text: `Convoy "${title || code}" established. Code: ${code}. Share this code with your group!`,
        timestamp: Date.now(),
        type: 'system'
      }
    ]
  };

  rides.set(code, newRide);
  res.json({ ride: serializeRide(newRide), leaderRider });
});

// Socket.io Realtime Telemetry & Communications (Real Riders Only)
io.on('connection', (socket) => {
  let currentRideCode = null;
  let currentRiderId = null;

  // Join Ride Channel
  socket.on('ride:join', ({ code, rider }) => {
    if (!code) return;
    code = code.trim().toUpperCase();
    const ride = rides.get(code);

    if (!ride) {
      socket.emit('ride:error', { message: `Convoy code "${code}" not found. Verify the code and try again.` });
      return;
    }

    currentRideCode = code;
    socket.join(code);

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
          distanceFromLeader: 0,
          channel: 'convoy-main'
        });
      }

      // Broadcast join notification to room
      io.to(code).emit('rider:joined', {
        rider: ride.riders.get(rider.id),
        ride: serializeRide(ride),
        message: `${rider.name} (${rider.callsign || 'Rider'}) joined the convoy!`
      });
    }

    // Send full current state to joining socket
    socket.emit('ride:state', serializeRide(ride));
  });

  // Start Ride (Leader flags off the convoy)
  socket.on('ride:start', () => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride) return;

    ride.status = 'active';
    io.to(currentRideCode).emit('ride:started', {
      ride: serializeRide(ride),
      message: 'Convoy flag-off! Safe riding, watch your mirrors.'
    });
  });

  // End Ride (Leader terminates or archives ride)
  socket.on('ride:end', () => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride) return;

    ride.status = 'completed';
    io.to(currentRideCode).emit('ride:ended', {
      ride: serializeRide(ride),
      message: 'Ride complete! Good job pack.'
    });
  });

  // Real GPS Telemetry stream from phone device
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

    // Calculate real distance from leader
    const leader = ride.riders.get(ride.leaderId);
    if (leader && rider.id !== leader.id && rider.lat && leader.lat && rider.lat !== 0 && leader.lat !== 0) {
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

  // Assign Role (Leader, Sweeper, Scout, Rider)
  socket.on('ride:assign_role', ({ targetRiderId, newRole }) => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride) return;

    const rider = ride.riders.get(targetRiderId);
    if (rider) {
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

  // Tactical Road Alerts
  socket.on('alert:create', (alertData) => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride) return;

    const newAlert = {
      id: `alert-${uuidv4()}`,
      type: alertData.type || 'hazard',
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

  // Chat message
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

  // Set real road route (synced from Leader)
  socket.on('route:set', (routeData) => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride) return;

    ride.activeRoute = routeData;
    io.to(currentRideCode).emit('route:set_broadcast', {
      activeRoute: routeData,
      ride: serializeRide(ride),
      message: `Convoy route updated: ${routeData.title || 'Road Route'}`
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
          ride: serializeRide(ride),
          message: `${rider.name} went offline.`
        });
      }
    }
  });
});

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
  console.log(`📡 Ready for real rider group creation & live GPS tracking (Zero Bots)`);
});
