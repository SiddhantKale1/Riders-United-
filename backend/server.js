import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { dbService } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
const defaultDevOrigins = 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5001,http://127.0.0.1:5001,https://localhost,capacitor://localhost';
const allowedOrigins = new Set((process.env.CORS_ALLOWED_ORIGINS || (isProduction ? '' : defaultDevOrigins))
  .split(',').map((origin) => origin.trim()).filter(Boolean));
const corsOptions = {
  origin(origin, callback) {
    // Native Capacitor requests may omit Origin; permit those while restricting browser origins.
    callback(null, !origin || allowedOrigins.has(origin));
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use((req, res, next) => {
  const secureViaTrustedProxy = process.env.TRUST_PROXY === 'true' && req.get('x-forwarded-proto') === 'https';
  if (isProduction && !req.secure && !secureViaTrustedProxy) {
    return res.status(426).json({ error: 'HTTPS is required.' });
  }
  next();
});
app.use(express.json({ limit: '1mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
  maxHttpBufferSize: 1e7 // 10 MB for voice packets
});
io.use((socket, next) => {
  const secureViaTrustedProxy = process.env.TRUST_PROXY === 'true' && socket.handshake.headers['x-forwarded-proto'] === 'https';
  if (isProduction && !socket.request.secure && !secureViaTrustedProxy) {
    return next(new Error('HTTPS is required.'));
  }
  const userId = verifyToken(socket.handshake.auth?.token);
  if (!userId) return next(new Error('Authentication required.'));
  socket.data.userId = userId;
  next();
});

const PORT = process.env.PORT || 5001;

// In-Memory Real Rides Data Store (NO FAKE BOTS)
const rides = new Map();

// Signed, expiring bearer tokens. Set AUTH_SECRET to a long random value in deployments.
const authSecret = process.env.AUTH_SECRET || crypto.randomBytes(32).toString('hex');
if (isProduction && !process.env.AUTH_SECRET) throw new Error('AUTH_SECRET must be set in production.');
if (isProduction && Buffer.byteLength(authSecret) < 32) throw new Error('AUTH_SECRET must be at least 32 bytes in production.');
if (!process.env.AUTH_SECRET) console.warn('AUTH_SECRET is not set; sessions will be invalidated whenever the backend restarts.');
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const authAttempts = new Map();
const metrics = { apiRequests: 0, apiErrors: 0, apiClientErrors: 0, durationsMs: [] };
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/')) return next();
  const started = performance.now();
  metrics.apiRequests += 1;
  res.on('finish', () => {
    if (res.statusCode >= 500) metrics.apiErrors += 1;
    if (res.statusCode >= 400 && res.statusCode < 500) metrics.apiClientErrors += 1;
    metrics.durationsMs.push(performance.now() - started);
    if (metrics.durationsMs.length > 200) metrics.durationsMs.shift();
  });
  next();
});
function limitAuthAttempts(req, res, next) {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const windowMs = 15 * 60 * 1000;
  const entry = authAttempts.get(key);
  if (entry && entry.resetAt > now && entry.count >= 10) {
    res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
    return res.status(429).json({ error: 'Too many sign-in attempts. Try again later.' });
  }
  authAttempts.set(key, !entry || entry.resetAt <= now ? { count: 1, resetAt: now + windowMs } : { ...entry, count: entry.count + 1 });
  if (authAttempts.size > 10000) {
    for (const [address, attempt] of authAttempts) if (attempt.resetAt <= now) authAttempts.delete(address);
  }
  next();
}

function generateToken(userId) {
  const user = dbService.findUserById(userId);
  const payload = Buffer.from(JSON.stringify({ sub: userId, ver: user?.authVersion || 0, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS })).toString('base64url');
  const signature = crypto.createHmac('sha256', authSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  if (typeof token !== 'string') return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;
  const expected = crypto.createHmac('sha256', authSecret).update(payload).digest();
  let supplied;
  try { supplied = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
    return null;
  }
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof claims.sub !== 'string' || !claims.sub || !Number.isFinite(claims.exp) || claims.exp <= Date.now() / 1000) {
      return null;
    }
    const user = dbService.findUserById(claims.sub);
    if (!user || claims.ver !== user.authVersion) return null;
    return claims.sub;
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const tokenMatch = authorization.match(/^Bearer\s+(\S+)$/i);
  const userId = tokenMatch ? verifyToken(tokenMatch[1]) : null;
  if (!userId) return res.status(401).json({ error: 'Authentication required or session expired' });
  req.userId = userId;
  next();
}

async function disconnectUserSockets(userId) {
  const sockets = await io.fetchSockets();
  for (const socket of sockets) {
    if (socket.data.userId === userId) socket.disconnect(true);
  }
}

// Helper to serialize ride for JSON output
function serializeRide(ride) {
  return {
    ...ride,
    riders: Array.from(ride.riders.values())
  };
}

function persistRide(ride) {
  if (ride.status === 'completed') {
    dbService.deleteActiveRide(ride.code);
    return;
  }
  const now = Date.now();
  ride.lastActivityAt = now;
  ride.expiresAt = now + (ride.status === 'active' ? 48 : 24) * 60 * 60 * 1000;
  dbService.saveActiveRide(ride.code, JSON.stringify({
    ...ride,
    riders: Array.from(ride.riders.values())
  }));
}

for (const saved of dbService.getActiveRides()) {
  try {
    const data = JSON.parse(saved.data);
    if ((data.expiresAt || data.createdAt + (data.status === 'active' ? 48 : 24) * 60 * 60 * 1000) <= Date.now()) {
      dbService.deleteActiveRide(saved.code);
      continue;
    }
    const riderMap = new Map((data.riders || []).map((rider) => [rider.id, { ...rider, isOnline: false, isTalking: false }]));
    rides.set(saved.code, { ...data, riders: riderMap });
  } catch (error) {
    console.error(`Unable to restore saved ride ${saved.code}:`, error);
    dbService.deleteActiveRide(saved.code);
  }
}

function pruneExpiredRides() {
  const now = Date.now();
  for (const [code, ride] of rides) {
    const expiresAt = ride.expiresAt || (ride.createdAt || now) + (ride.status === 'active' ? 48 : 24) * 60 * 60 * 1000;
    if (expiresAt <= now) {
      rides.delete(code);
      dbService.deleteActiveRide(code);
    }
  }
}

const RIDE_HISTORY_RETENTION_MS = 365 * 24 * 60 * 60 * 1000;
dbService.deleteRideHistoryBefore(Date.now() - RIDE_HISTORY_RETENTION_MS);
setInterval(() => {
  pruneExpiredRides();
  dbService.deleteRideHistoryBefore(Date.now() - RIDE_HISTORY_RETENTION_MS);
}, 60 * 60 * 1000).unref();

// Generate human-friendly 6-character ride codes (e.g., "RD-492")
function generateRideCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'RU-';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(crypto.randomInt(chars.length));
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
  pruneExpiredRides();
  const durations = [...metrics.durationsMs].sort((a, b) => a - b);
  const p95Index = durations.length ? Math.ceil(durations.length * 0.95) - 1 : 0;
  let databaseOk = false;
  try { databaseOk = dbService.healthCheck(); } catch {}
  res.json({
    status: databaseOk ? 'ok' : 'degraded',
    time: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    totalActiveRides: rides.size,
    connectedSockets: io.engine.clientsCount,
    database: databaseOk ? 'ok' : 'error',
    memoryRssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    apiRequests: metrics.apiRequests,
    apiErrors: metrics.apiErrors,
    apiClientErrors: metrics.apiClientErrors,
    apiLatencyP95Ms: Math.round(durations[p95Index] || 0)
  });
});

// ══════════════════════════════════════════════════════════════════════
// AUTHENTICATION & USER MANAGEMENT (SQLite DATABASE)
// ══════════════════════════════════════════════════════════════════════

// Register a new rider account
app.post('/api/auth/register', limitAuthAttempts, (req, res) => {
  const { email, password, name, callsign, bikeModel, avatarColor } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ error: 'Password must be at least 12 characters and no more than 72 UTF-8 bytes.' });
  }
  const profileFields = [name, callsign, bikeModel].filter((value) => value !== undefined && value !== null);
  if (profileFields.some((value) => typeof value !== 'string')) {
    return res.status(400).json({ error: 'Profile fields must be text.' });
  }
  if ([name, callsign, bikeModel].some((value) => typeof value === 'string' && value.trim().length > 60)) {
    return res.status(400).json({ error: 'Name, callsign, and bike model must be 60 characters or fewer.' });
  }
  if (avatarColor !== undefined && (typeof avatarColor !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(avatarColor))) {
    return res.status(400).json({ error: 'Avatar color must be a six-digit hex color.' });
  }
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
app.post('/api/auth/login', limitAuthAttempts, (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
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

function validNewPassword(password) {
  return typeof password === 'string' && password.length >= 12 && Buffer.byteLength(password, 'utf8') <= 72;
}

app.post('/api/auth/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || !validNewPassword(newPassword)) {
    return res.status(400).json({ error: 'Provide your current password and a new password of 12–72 UTF-8 bytes.' });
  }
  const credentials = dbService.findUserCredentials(req.userId);
  if (!credentials || !bcrypt.compareSync(currentPassword, credentials.passwordHash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }
  const updatedUser = dbService.updatePasswordAndRevokeSessions(req.userId, bcrypt.hashSync(newPassword, 10));
  await disconnectUserSockets(req.userId);
  res.json({ success: true, token: generateToken(updatedUser.id) });
});

app.post('/api/auth/sessions/revoke', requireAuth, async (req, res) => {
  dbService.revokeUserSessions(req.userId);
  await disconnectUserSockets(req.userId);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════
// RIDE HISTORY ENDPOINTS (SQLite DATABASE)
// ══════════════════════════════════════════════════════════════════════

// Save a completed ride to database history
app.post('/api/rides/history', requireAuth, (req, res) => {
  const { ride } = req.body || {};
  if (!ride) {
    return res.status(400).json({ error: 'Ride details are required' });
  }

  const rideId = ride.id || `hist-${uuidv4().substring(0, 8)}`;
  const completedRide = dbService.saveCompletedRide({
    id: rideId,
    userId: req.userId,
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
app.get('/api/rides/history', requireAuth, (req, res) => {
  const history = dbService.getRideHistory(req.userId);
  res.json({ history });
});

// Clear rider's completed ride history
app.delete('/api/rides/history', requireAuth, (req, res) => {
  dbService.clearRideHistory(req.userId);
  res.json({ success: true });
});

// List all active public rides
app.get('/api/rides', requireAuth, (req, res) => {
  pruneExpiredRides();
  const list = Array.from(rides.values())
    .filter((ride) => ride.riders.has(req.userId))
    .map(serializeRide);
  res.json({ rides: list });
});

// Check if a ride exists by code
app.get('/api/rides/:code', requireAuth, (req, res) => {
  pruneExpiredRides();
  const code = req.params.code.toUpperCase();
  const ride = rides.get(code);
  if (!ride) {
    return res.status(404).json({ error: 'Convoy channel not found' });
  }
  res.json(serializeRide(ride));
});

// Create a new real ride
app.post('/api/rides', requireAuth, (req, res) => {
  const { title, description, leaderName, leaderCallsign, leaderBike, leaderColor, targetSpeed } = req.body || {};
  if (title !== undefined && (typeof title !== 'string' || title.trim().length > 100)) {
    return res.status(400).json({ error: 'Ride title must be 100 characters or fewer.' });
  }
  
  let code = generateRideCode();
  while (rides.has(code)) {
    code = generateRideCode();
  }

  const leaderId = req.userId;
  const account = dbService.findUserById(leaderId);
  const leaderRider = {
    id: leaderId,
    name: account.name || leaderName || 'Ride Captain',
    callsign: account.callsign || leaderCallsign || 'Thunder Lead',
    bikeModel: account.bikeModel || leaderBike || 'Motorcycle',
    avatarColor: account.avatarColor || leaderColor || '#ef4444',
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
  persistRide(newRide);
  res.json({ ride: serializeRide(newRide), leaderRider });
});

// Socket.io Realtime Telemetry & Communications (Real Riders Only)
io.on('connection', (socket) => {
  let currentRideCode = null;
  const currentRiderId = socket.data.userId;
  const sessionCheck = setInterval(() => {
    if (!verifyToken(socket.handshake.auth?.token)) socket.disconnect(true);
  }, 30_000);
  sessionCheck.unref();

  // Join Ride Channel
  socket.on('ride:join', async ({ code } = {}) => {
    if (typeof code !== 'string' || !code.trim()) return;
    pruneExpiredRides();
    code = code.trim().toUpperCase();
    const ride = rides.get(code);

    if (!ride) {
      socket.emit('ride:error', { message: `Convoy code "${code}" not found. Verify the code and try again.` });
      return;
    }

    if (currentRideCode && currentRideCode !== code) await leaveCurrentRide();
    currentRideCode = code;
    socket.join(code);

    const profile = dbService.findUserById(currentRiderId);
    const existing = ride.riders.get(currentRiderId);
    const rider = {
      ...(existing || {}),
      id: currentRiderId,
      name: profile.name,
      callsign: profile.callsign,
      bikeModel: profile.bikeModel,
      avatarColor: profile.avatarColor,
      role: currentRiderId === ride.leaderId ? 'leader' : (existing?.role === 'sweeper' || existing?.role === 'scout' ? existing.role : 'rider'),
      isOnline: true,
      lastPing: Date.now(),
      distanceFromLeader: existing?.distanceFromLeader || 0,
      channel: existing?.channel || 'convoy-main'
    };
    ride.riders.set(currentRiderId, rider);
    persistRide(ride);

      // Broadcast join notification to room
      io.to(code).emit('rider:joined', {
        rider,
        ride: serializeRide(ride),
        message: `${rider.name} (${rider.callsign || 'Rider'}) joined the convoy!`
      });

    // Send full current state to joining socket
    socket.emit('ride:state', serializeRide(ride));
  });

  // Start Ride (Leader flags off the convoy)
  socket.on('ride:start', () => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride) return;

    if (currentRiderId !== ride.leaderId) return;
    ride.status = 'active';
    persistRide(ride);
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

    if (currentRiderId !== ride.leaderId) return;
    ride.status = 'completed';
    dbService.deleteActiveRide(currentRideCode);
    io.to(currentRideCode).emit('ride:ended', {
      ride: serializeRide(ride),
      message: 'Ride complete! Good job pack.'
    });
    rides.delete(currentRideCode);
  });

  // Real GPS Telemetry stream from phone device
  socket.on('telemetry:update', (data = {}) => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride) return;

    const riderId = currentRiderId;
    if (!riderId) return;

    let rider = ride.riders.get(riderId);
    if (!rider) {
      rider = { id: riderId, isOnline: true };
      ride.riders.set(riderId, rider);
    } else {
      rider.lastPing = Date.now();
      rider.isOnline = true;
    }
    for (const key of ['lat', 'lng', 'heading', 'speed', 'altitude', 'battery', 'distanceCoveredKm']) {
      const value = Number(data[key]);
      if (!Number.isFinite(value)) continue;
      if (key === 'lat' && (value < -90 || value > 90)) continue;
      if (key === 'lng' && (value < -180 || value > 180)) continue;
      if (key === 'speed' && (value < 0 || value > 400)) continue;
      if (key === 'battery' && (value < 0 || value > 100)) continue;
      rider[key] = value;
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
    persistRide(ride);
  });

  // Assign Role (Leader, Sweeper, Scout, Rider)
  socket.on('ride:assign_role', ({ targetRiderId, newRole } = {}) => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride) return;
    if (currentRiderId !== ride.leaderId || !['leader', 'sweeper', 'scout', 'rider'].includes(newRole)) return;

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
      persistRide(ride);
    }
  });

  // Push-To-Talk Voice Comms
  socket.on('voice:start', ({ channel } = {}) => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride?.riders.has(currentRiderId)) return;
    ride.riders.get(currentRiderId).isTalking = true;

    socket.to(currentRideCode).emit('voice:incoming_start', {
      riderId: currentRiderId,
      callsign: ride.riders.get(currentRiderId).callsign,
      channel: channel || 'convoy-main',
      timestamp: Date.now()
    });
  });

  socket.on('voice:chunk', ({ audioBlobBase64, channel } = {}) => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride?.riders.has(currentRiderId) || typeof audioBlobBase64 !== 'string' || audioBlobBase64.length > 200000) return;
    socket.to(currentRideCode).emit('voice:incoming_chunk', {
      riderId: currentRiderId,
      audioBlobBase64,
      channel: channel || 'convoy-main'
    });
  });

  socket.on('voice:stop', ({ channel } = {}) => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride?.riders.has(currentRiderId)) return;
    ride.riders.get(currentRiderId).isTalking = false;

    socket.to(currentRideCode).emit('voice:incoming_stop', {
      riderId: currentRiderId,
      callsign: ride.riders.get(currentRiderId).callsign,
      channel: channel || 'convoy-main',
      timestamp: Date.now()
    });
  });

  // Tactical Road Alerts
  socket.on('alert:create', (alertData = {}) => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride) return;

    const validAlertTypes = ['hazard', 'fuel', 'police', 'breakdown', 'sos', 'regroup'];
    const lat = Number(alertData.lat);
    const lng = Number(alertData.lng);
    const newAlert = {
      id: `alert-${uuidv4()}`,
      type: validAlertTypes.includes(alertData.type) ? alertData.type : 'hazard',
      title: typeof alertData.title === 'string' ? alertData.title.slice(0, 120) : 'Road alert',
      detail: typeof alertData.detail === 'string' ? alertData.detail.slice(0, 500) : '',
      lat: Number.isFinite(lat) && lat >= -90 && lat <= 90 ? lat : null,
      lng: Number.isFinite(lng) && lng >= -180 && lng <= 180 ? lng : null,
      createdBy: currentRiderId,
      creatorName: ride.riders.get(currentRiderId)?.name || 'Rider',
      createdAt: Date.now(),
      active: true
    };

    ride.alerts.unshift(newAlert);
    if (ride.alerts.length > 20) ride.alerts.pop();

    io.to(currentRideCode).emit('alert:broadcast', {
      alert: newAlert,
      message: `ALERT: ${newAlert.title} reported by ${newAlert.creatorName}!`
    });
    persistRide(ride);
  });

  socket.on('alert:dismiss', ({ alertId } = {}) => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride) return;

    const target = ride.alerts.find(a => a.id === alertId);
    if (target && (currentRiderId === ride.leaderId || target.createdBy === currentRiderId)) {
      target.active = false;
      io.to(currentRideCode).emit('alert:dismissed', { alertId });
      persistRide(ride);
    }
  });

  // Chat message
  socket.on('chat:send', ({ text } = {}) => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride) return;

    const msg = {
      id: `msg-${uuidv4()}`,
      senderId: currentRiderId,
      senderName: ride.riders.get(currentRiderId)?.name || 'Rider',
      text: typeof text === 'string' ? text.slice(0, 500) : '',
      timestamp: Date.now(),
      type: 'chat'
    };

    ride.messages.push(msg);
    if (ride.messages.length > 100) ride.messages.shift();

    io.to(currentRideCode).emit('chat:broadcast', msg);
    persistRide(ride);
  });

  // Set real road route (synced from Leader)
  socket.on('route:set', (routeData) => {
    if (!currentRideCode) return;
    const ride = rides.get(currentRideCode);
    if (!ride) return;
    if (currentRiderId !== ride.leaderId) return;
    if (!routeData || typeof routeData !== 'object' || Buffer.byteLength(JSON.stringify(routeData)) > 1_000_000) return;

    ride.activeRoute = routeData;
    io.to(currentRideCode).emit('route:set_broadcast', {
      activeRoute: routeData,
      ride: serializeRide(ride),
      message: `Convoy route updated: ${routeData.title || 'Road Route'}`
    });
    persistRide(ride);
  });

  const leaveCurrentRide = async () => {
    const code = currentRideCode;
    if (!code || !currentRiderId) return;
    currentRideCode = null;
    const ride = rides.get(code);
    socket.leave(code);
    if (!ride || !ride.riders.has(currentRiderId)) return;
    const sameUserSockets = (await io.in(code).fetchSockets()).filter((peer) => peer.data.userId === currentRiderId);
    if (sameUserSockets.length > 0) return;
    const rider = ride.riders.get(currentRiderId);
    rider.isOnline = false;
    rider.isTalking = false;
    io.to(code).emit('rider:left', {
      riderId: currentRiderId,
      ride: serializeRide(ride),
      message: `${rider.name} went offline.`
    });
    persistRide(ride);
  };

  socket.on('ride:leave', leaveCurrentRide);
  socket.on('disconnect', () => {
    clearInterval(sessionCheck);
    leaveCurrentRide();
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
  const address = server.address();
  const activePort = typeof address === 'object' && address ? address.port : PORT;
  console.log(`🏍️ Riders United Server running on http://localhost:${activePort}`);
  console.log(`📡 Ready for real rider group creation & live GPS tracking (Zero Bots)`);
});

function persistAllActiveRides() {
  for (const ride of rides.values()) {
    if (ride.status !== 'completed') persistRide(ride);
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    persistAllActiveRides();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  });
}
