import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { io as createSocket } from '../../frontend/node_modules/socket.io-client/build/esm/index.js';

test('sandbox: multi-rider convoy, spoofing, network recovery, persistence and security controls', async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'riders-united-test-'));
  const child = spawn(process.execPath, [path.resolve('server.js')], {
    cwd: path.resolve('.'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      TRUST_PROXY: 'true',
      PORT: '0',
      AUTH_SECRET: 'test-only-secret-that-is-long-enough-for-signing',
      CORS_ALLOWED_ORIGINS: 'https://app.test',
      DATABASE_PATH: path.join(tempDir, 'test.sqlite')
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let restoredServer;

  let output = '';
  let anonymousSocket;
  let aliceSocket;
  let bobSocket;
  child.stdout.setEncoding('utf8').on('data', (chunk) => { output += chunk; });
  child.stderr.setEncoding('utf8').on('data', (chunk) => { output += chunk; });
  t.after(async () => {
    anonymousSocket?.disconnect();
    aliceSocket?.disconnect();
    bobSocket?.disconnect();
    restoredServer?.kill('SIGTERM');
    if (restoredServer) await Promise.race([once(restoredServer, 'exit'), new Promise((resolve) => setTimeout(resolve, 6000))]);
    child.kill('SIGTERM');
    await Promise.race([once(child, 'exit'), new Promise((resolve) => setTimeout(resolve, 6000))]);
    await rm(tempDir, { recursive: true, force: true });
  });

  const startedAt = Date.now();
  let port;
  while (!port && Date.now() - startedAt < 10000) {
    const match = output.match(/running on http:\/\/localhost:(\d+)/);
    if (match) port = Number(match[1]);
    else if (child.exitCode !== null) throw new Error(`Backend exited during startup:\n${output}`);
    else await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(port, `Backend did not start:\n${output}`);

  const base = `http://127.0.0.1:${port}`;
  const secureHeaders = { 'x-forwarded-proto': 'https' };
  const request = (url, options = {}) => fetch(`${base}${url}`, {
    ...options,
    headers: { ...secureHeaders, ...options.headers }
  });

  const insecureHealth = await fetch(`${base}/api/health`);
  assert.equal(insecureHealth.status, 426);
  const health = await request('/api/health');
  assert.equal(health.status, 200);
  const healthData = await health.json();
  assert.equal(healthData.database, 'ok');
  assert.ok(Number.isFinite(healthData.apiLatencyP95Ms));

  const disallowedOrigin = await request('/api/health', { headers: { Origin: 'https://evil.test' } });
  assert.equal(disallowedOrigin.headers.get('access-control-allow-origin'), null);
  const allowedOrigin = await request('/api/health', { headers: { Origin: 'https://app.test' } });
  assert.equal(allowedOrigin.headers.get('access-control-allow-origin'), 'https://app.test');

  assert.equal((await request('/api/rides/history')).status, 401);
  assert.equal((await request('/api/rides')).status, 401);
  const shortPassword = await request('/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alice@example.com', password: 'short' })
  });
  assert.equal(shortPassword.status, 400);

  const register = async (email) => request('/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'strong-password-123', name: email.split('@')[0] })
  });
  const aliceResponse = await register('alice@example.com');
  const bobResponse = await register('bob@example.com');
  assert.equal(aliceResponse.status, 200);
  assert.equal(bobResponse.status, 200);
  const alice = await aliceResponse.json();
  const bob = await bobResponse.json();

  const [tokenPayload, tokenSignature] = alice.token.split('.');
  const tamperedToken = `${tokenPayload}.${tokenSignature[0] === 'a' ? 'b' : 'a'}${tokenSignature.slice(1)}`;
  assert.equal((await request('/api/rides/history', {
    headers: { Authorization: `Bearer ${tamperedToken}` }
  })).status, 401);

  const created = await request('/api/rides', {
    method: 'POST', headers: { Authorization: `Bearer ${alice.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Test ride', leaderId: 'forged-user-id' })
  });
  assert.equal(created.status, 200);
  const createdData = await created.json();
  assert.equal(createdData.ride.leaderId, alice.user.id);
  assert.match(createdData.ride.code, /^RU-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$/);
  assert.ok(createdData.ride.expiresAt > Date.now());

  const socketOptions = { transports: ['websocket'], extraHeaders: { 'x-forwarded-proto': 'https' }, reconnection: false };
  anonymousSocket = createSocket(`http://127.0.0.1:${port}`, socketOptions);
  const rejectedConnection = once(anonymousSocket, 'connect_error');
  await rejectedConnection;
  anonymousSocket.disconnect();

  aliceSocket = createSocket(`http://127.0.0.1:${port}`, { ...socketOptions, auth: { token: alice.token } });
  bobSocket = createSocket(`http://127.0.0.1:${port}`, { ...socketOptions, auth: { token: bob.token } });
  await Promise.all([once(aliceSocket, 'connect'), once(bobSocket, 'connect')]);
  const aliceState = once(aliceSocket, 'ride:state');
  aliceSocket.emit('ride:join', { code: createdData.ride.code, rider: { id: 'forged-rider', role: 'leader' } });
  const [aliceSnapshot] = await aliceState;
  assert.equal(aliceSnapshot.leaderId, alice.user.id);
  assert.ok(aliceSnapshot.riders.some((rider) => rider.id === alice.user.id));
  assert.ok(!aliceSnapshot.riders.some((rider) => rider.id === 'forged-rider'));

  const bobState = once(bobSocket, 'ride:state');
  bobSocket.emit('ride:join', { code: createdData.ride.code });
  const [bobSnapshot] = await bobState;
  assert.ok(bobSnapshot.riders.some((rider) => rider.id === bob.user.id && rider.role === 'rider'));

  const telemetryEvent = once(aliceSocket, 'telemetry:broadcast');
  bobSocket.emit('telemetry:update', {
    riderId: alice.user.id,
    id: alice.user.id,
    name: 'Spoofed Captain',
    role: 'leader',
    lat: 37.7749,
    lng: -122.4194,
    speed: 42
  });
  const [telemetry] = await telemetryEvent;
  assert.equal(telemetry.riderId, bob.user.id);
  assert.equal(telemetry.telemetry.name, 'bob');
  assert.equal(telemetry.telemetry.role, 'rider');
  assert.equal(telemetry.telemetry.lat, 37.7749);

  const chatEvent = once(aliceSocket, 'chat:broadcast');
  bobSocket.emit('chat:send', {
    text: 'simulation check-in',
    senderId: alice.user.id,
    senderName: 'Spoofed Captain',
    type: 'system'
  });
  const [chat] = await chatEvent;
  assert.equal(chat.senderId, bob.user.id);
  assert.equal(chat.senderName, 'bob');
  assert.equal(chat.type, 'chat');

  const alertEvent = once(aliceSocket, 'alert:broadcast');
  bobSocket.emit('alert:create', {
    type: 'system',
    title: 'x'.repeat(200),
    detail: 'simulated hazard',
    createdBy: alice.user.id,
    creatorName: 'Spoofed Captain',
    lat: 37.7749,
    lng: -122.4194
  });
  const [alert] = await alertEvent;
  assert.equal(alert.alert.createdBy, bob.user.id);
  assert.equal(alert.alert.creatorName, 'bob');
  assert.equal(alert.alert.type, 'hazard');
  assert.equal(alert.alert.title.length, 120);

  const riderLeft = once(aliceSocket, 'rider:left');
  bobSocket.disconnect();
  const [leftEvent] = await riderLeft;
  assert.equal(leftEvent.riderId, bob.user.id);
  const offlineState = await request(`/api/rides/${createdData.ride.code}`, {
    headers: { Authorization: `Bearer ${alice.token}` }
  });
  assert.equal((await offlineState.json()).riders.find((rider) => rider.id === bob.user.id).isOnline, false);

  bobSocket = createSocket(`http://127.0.0.1:${port}`, { ...socketOptions, auth: { token: bob.token } });
  await once(bobSocket, 'connect');
  const rejoinedState = once(bobSocket, 'ride:state');
  bobSocket.emit('ride:join', { code: createdData.ride.code });
  const [rejoined] = await rejoinedState;
  assert.equal(rejoined.riders.find((rider) => rider.id === bob.user.id).isOnline, true);

  bobSocket.emit('ride:start');
  bobSocket.emit('ride:assign_role', { targetRiderId: bob.user.id, newRole: 'leader' });
  await new Promise((resolve) => setTimeout(resolve, 100));
  const unchangedRide = await request(`/api/rides/${createdData.ride.code}`, { headers: { Authorization: `Bearer ${alice.token}` } });
  assert.equal((await unchangedRide.json()).status, 'lobby');
  const rideStarted = once(aliceSocket, 'ride:started');
  aliceSocket.emit('ride:start');
  await rideStarted;

  // A second backend process over the same database must recover the active convoy.
  restoredServer = spawn(process.execPath, [path.resolve('server.js')], {
    cwd: path.resolve('.'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      TRUST_PROXY: 'true',
      PORT: '0',
      AUTH_SECRET: 'test-only-secret-that-is-long-enough-for-signing',
      CORS_ALLOWED_ORIGINS: 'https://app.test',
      DATABASE_PATH: path.join(tempDir, 'test.sqlite')
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let restoredOutput = '';
  restoredServer.stdout.setEncoding('utf8').on('data', (chunk) => { restoredOutput += chunk; });
  restoredServer.stderr.setEncoding('utf8').on('data', (chunk) => { restoredOutput += chunk; });
  const restoreStartedAt = Date.now();
  let restoredPort;
  while (!restoredPort && Date.now() - restoreStartedAt < 10000) {
    const match = restoredOutput.match(/running on http:\/\/localhost:(\d+)/);
    if (match) restoredPort = Number(match[1]);
    else if (restoredServer.exitCode !== null) throw new Error(`Restore backend exited during startup:\n${restoredOutput}`);
    else await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(restoredPort, `Restore backend did not start:\n${restoredOutput}`);
  const restoredRide = await fetch(`http://127.0.0.1:${restoredPort}/api/rides/${createdData.ride.code}`, {
    headers: { ...secureHeaders, Authorization: `Bearer ${alice.token}` }
  });
  assert.equal(restoredRide.status, 200);
  const restoredRideData = await restoredRide.json();
  assert.equal(restoredRideData.leaderId, alice.user.id);
  assert.equal(restoredRideData.status, 'active');

  const ride = { id: 'test-history-entry', routeTitle: 'Test route', startName: 'A', destName: 'B' };
  const save = await request('/api/rides/history', {
    method: 'POST', headers: { Authorization: `Bearer ${alice.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: bob.user.id, ride })
  });
  assert.equal(save.status, 200);
  const aliceHistory = await request('/api/rides/history', { headers: { Authorization: `Bearer ${alice.token}` } });
  const bobHistory = await request('/api/rides/history', { headers: { Authorization: `Bearer ${bob.token}` } });
  assert.equal((await aliceHistory.json()).history.length, 1);
  assert.equal((await bobHistory.json()).history.length, 0);

  let throttled = false;
  for (let i = 0; i < 12; i++) {
    const response = await request('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'missing@example.com', password: 'wrong-password' })
    });
    if (response.status === 429) throttled = true;
  }
  assert.equal(throttled, true, 'repeated authentication attempts should be rate limited');

  const passwordChange = await request('/api/auth/password', {
    method: 'POST', headers: { Authorization: `Bearer ${alice.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword: 'strong-password-123', newPassword: 'another-password-456' })
  });
  assert.equal(passwordChange.status, 200);
  const newAliceToken = (await passwordChange.json()).token;
  assert.equal((await request('/api/rides/history', { headers: { Authorization: `Bearer ${alice.token}` } })).status, 401);
  assert.equal((await request('/api/rides/history', { headers: { Authorization: `Bearer ${newAliceToken}` } })).status, 200);

  const revokeSessions = await request('/api/auth/sessions/revoke', {
    method: 'POST', headers: { Authorization: `Bearer ${newAliceToken}` }
  });
  assert.equal(revokeSessions.status, 200);
  assert.equal((await request('/api/rides/history', { headers: { Authorization: `Bearer ${newAliceToken}` } })).status, 401);
});
