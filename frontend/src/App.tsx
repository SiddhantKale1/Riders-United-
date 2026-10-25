import React, { useState, useEffect, useMemo } from 'react';
import { ClassicMobileApp, MobileTab } from './components/ClassicMobileApp';
import { StagingLobby } from './components/StagingLobby';
import { MapView } from './components/MapView';
import { GoogleMapsTurnCard } from './components/GoogleMapsTurnCard';
import { GoogleMapsTopBar } from './components/GoogleMapsTopBar';
import { SpeedometerPill } from './components/SpeedometerPill';
import { GoogleMapsBottomBar } from './components/GoogleMapsBottomBar';
import { FuelStopsModal } from './components/FuelStopsModal';
import { ConvoyRoster } from './components/ConvoyRoster';
import { CreateJoinModal } from './components/CreateJoinModal';
import { RideCompletionModal, ExitConfirmModal } from './components/RideCompletionModal';
import { AuthModal } from './components/AuthModal';
import {
  RideChannel,
  Rider,
  RiderRole,
  Waypoint,
  TacticalAlert,
  ChatMessage,
  TrackingMode,
  CameraMode,
  AlertType,
  ActiveRoute,
  CompletedRide,
  AuthUser
} from './types';
import { socketService } from './services/socket';
import { audioEffects } from './services/audioEffects';
import { geolocationService } from './services/geolocationService';
import { routingService } from './services/routingService';
import { nativeMobile } from './services/nativeMobile';
import { getApiBaseUrl } from './services/apiConfig';

export type AppScreen = 'mobile' | 'lobby' | 'cockpit';

export function App() {
  // Classic Mobile App Router: 'mobile' (Bottom Tab App Shell) | 'lobby' (Convoy Squad Staging) | 'cockpit'
  const [mobileTab, setMobileTab] = useState<MobileTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('code')) return 'squad';
    }
    return 'ride';
  });
  const [screen, setScreen] = useState<AppScreen>('mobile');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // User Authentication & Database Session
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('riders_auth_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Ride History (Persisted in SQLite database + LocalStorage)
  const [rideHistory, setRideHistory] = useState<CompletedRide[]>(() => {
    try {
      const saved = localStorage.getItem('riders_ride_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Navigation Timing & In-App Completion Modals
  const [rideStartTime, setRideStartTime] = useState<number | null>(null);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState<boolean>(false);
  const [completedRideData, setCompletedRideData] = useState<CompletedRide | null>(null);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState<boolean>(false);

  // Sync ride history from database for logged in user
  useEffect(() => {
    if (authUser?.id) {
      fetch(`${getApiBaseUrl()}/api/rides/history?userId=${authUser.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.history)) {
            setRideHistory(data.history);
            localStorage.setItem('riders_ride_history', JSON.stringify(data.history));
          }
        })
        .catch(() => {});
    }
  }, [authUser?.id]);

  // User Profile with LocalStorage Persistence
  const [profile, setProfile] = useState<{
    id: string;
    name: string;
    callsign: string;
    bikeModel: string;
    avatarColor: string;
    role: RiderRole;
  }>(() => {
    try {
      const saved = localStorage.getItem('riders_user_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    const newId = `rider-${Math.random().toString(36).substring(2, 9)}`;
    return {
      id: newId,
      name: 'Rider Vikram',
      callsign: 'Thunder Lead',
      bikeModel: 'Royal Enfield Himalayan 450',
      avatarColor: '#ef4444',
      role: 'leader'
    };
  });

  const handleUpdateProfile = (updated: any) => {
    setProfile((prev) => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem('riders_user_profile', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Active Ride & Telemetry State
  const [ride, setRide] = useState<RideChannel | null>(null);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [packSpreadMeters, setPackSpreadMeters] = useState<number>(0);
  const [alerts, setAlerts] = useState<TacticalAlert[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Navigation Route State
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);
  const activeRouteRef = React.useRef<ActiveRoute | null>(null);

  useEffect(() => {
    activeRouteRef.current = activeRoute;
  }, [activeRoute]);
  const [customWaypoints, setCustomWaypoints] = useState<Waypoint[]>([]);
  const [currentGpsCoords, setCurrentGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isRideActive, setIsRideActive] = useState<boolean>(false);

  // Cockpit Controls & Modals
  const [cameraMode, setCameraMode] = useState<CameraMode>('me');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [voiceChannel, _setVoiceChannel] = useState<string>('convoy-main');

  const [activeSpeaker, setActiveSpeaker] = useState<{
    riderId: string;
    callsign: string;
    role?: string;
  } | null>(null);

  const [isRosterOpen, setIsRosterOpen] = useState<boolean>(false);
  const [isRideModalOpen, setIsRideModalOpen] = useState<boolean>(false);
  const [isFuelModalOpen, setIsFuelModalOpen] = useState<boolean>(false);

  // Check URL query param for instant group join (e.g., ?code=RD-492)
  const initialUrlCode = useMemo(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get('code');
      if (codeParam) return codeParam.toUpperCase();
      const match = window.location.pathname.match(/\/join\/([A-Za-z0-9_-]+)/);
      if (match) return match[1].toUpperCase();
    }
    return '';
  }, []);

  // Initialize Socket.io and Listeners
  useEffect(() => {
    nativeMobile.init();
    socketService.init();

    socketService.setOnConnectionStatusChange((status) => {
      setIsConnected(status);
    });

    // Ride state snapshot
    socketService.setOnRideState((state: RideChannel) => {
      setRide(state);
      setRiders(state.riders || []);
      setMessages(state.messages || []);
      if (state.activeRoute) {
        setActiveRoute(state.activeRoute);
        activeRouteRef.current = state.activeRoute;
      }

      // Filter initial alerts against active route corridor (500m)
      const routeCoords = state.activeRoute?.coordinates;
      if (state.alerts && routeCoords && routeCoords.length > 0) {
        const filtered = state.alerts.filter((a) =>
          !['hazard', 'police', 'fuel', 'breakdown'].includes(a.type) ||
          routingService.isHazardOnRoute(a.lat, a.lng, routeCoords, 500)
        );
        setAlerts(filtered);
      } else {
        setAlerts(state.alerts || []);
      }

      if (state.status === 'active' && screen === 'lobby') {
        setScreen('cockpit');
        setIsRideActive(true);
      }
    });

    // Real-time telemetry updates from peer devices
    socketService.setOnTelemetry((riderId, telemetry) => {
      setRiders((prev) =>
        prev.map((r) => (r.id === riderId ? { ...r, ...telemetry, lastPing: Date.now(), isOnline: true } : r))
      );
    });

    // Rider joined / left notifications
    socketService.setOnRiderJoined(({ rider, ride: updatedRide, message }) => {
      if (updatedRide) setRide(updatedRide);
      setRiders((prev) => {
        const filtered = prev.filter((r) => r.id !== rider.id);
        return [...filtered, rider];
      });
      if (message) {
        addChatMessage({
          id: `sys-${Date.now()}`,
          senderId: 'system',
          senderName: 'Convoy System',
          text: message,
          timestamp: Date.now(),
          type: 'system'
        });
      }
    });

    socketService.setOnRiderLeft(({ riderId, ride: updatedRide, message }) => {
      if (updatedRide) setRide(updatedRide);
      setRiders((prev) =>
        prev.map((r) => (r.id === riderId ? { ...r, isOnline: false } : r))
      );
      if (message) {
        addChatMessage({
          id: `sys-${Date.now()}`,
          senderId: 'system',
          senderName: 'Convoy System',
          text: message,
          timestamp: Date.now(),
          type: 'system'
        });
      }
    });

    // Ride flag-off started
    socketService.setOnRideStarted(({ ride: startedRide, message }) => {
      setRide(startedRide);
      setScreen('cockpit');
      setIsRideActive(true);
      if (message) {
        addChatMessage({
          id: `start-${Date.now()}`,
          senderId: 'system',
          senderName: 'Road Captain',
          text: message,
          timestamp: Date.now(),
          type: 'system'
        });
      }
    });

    // Ride completed / ended via broadcast
    socketService.setOnRideEnded(({ ride: endedRide }) => {
      setRide(endedRide);
      recordCompletedRide(endedRide);
    });

    // Route updated by leader
    socketService.setOnRouteSet((newRoute: ActiveRoute, msg?: string) => {
      setActiveRoute(newRoute);
      activeRouteRef.current = newRoute;
      setRide((prev) => (prev ? { ...prev, activeRoute: newRoute } : prev));

      // Re-filter alerts: immediately dismiss any alerts that are off the new route
      setAlerts((prev) =>
        prev.filter((a) =>
          !['hazard', 'police', 'fuel', 'breakdown'].includes(a.type) ||
          routingService.isHazardOnRoute(a.lat, a.lng, newRoute.coordinates, 500)
        )
      );

      audioEffects.playAlertSound('regroup');
      if (msg) {
        addChatMessage({
          id: `route-${Date.now()}`,
          senderId: 'system',
          senderName: 'Navigation',
          text: msg,
          timestamp: Date.now(),
          type: 'system'
        });
      }
    });

    // Tactical Alert broadcast (Strictly filtered by active route corridor)
    socketService.setOnAlert((newAlert, msg) => {
      const currentRoute = activeRouteRef.current;
      const isSpatialHazard = ['hazard', 'police', 'fuel', 'breakdown'].includes(newAlert.type);
      const hasRoute = Boolean(currentRoute && currentRoute.coordinates && currentRoute.coordinates.length > 0);

      // Check if hazard is within 500 meters corridor of our active route
      const isOnRoute = !hasRoute || !isSpatialHazard
        ? true
        : routingService.isHazardOnRoute(newAlert.lat, newAlert.lng, currentRoute?.coordinates, 500);

      // IF NOT ON ROUTE: DO NOT trigger alert chime, DO NOT show banner, DO NOT notify rider!
      if (!isOnRoute) {
        console.log(`[Riders United] Hazard "${newAlert.title}" is off your active route corridor. Alert suppressed.`);
        return;
      }

      // On-route hazard: play audio alert chime and show banner
      audioEffects.playAlertSound(newAlert.type);
      setAlerts((prev) => [newAlert, ...prev.filter((a) => a.id !== newAlert.id)]);
      if (msg) {
        addChatMessage({
          id: `msg-${Date.now()}`,
          senderId: newAlert.createdBy,
          senderName: newAlert.creatorName,
          text: msg,
          timestamp: Date.now(),
          type: 'alert'
        });
      }
    });

    socketService.setOnAlertDismissed((alertId) => {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    });

    // PTT Voice Comms
    socketService.setOnVoiceIncomingStart(({ riderId, callsign }) => {
      setActiveSpeaker({ riderId, callsign });
      setRiders((prev) =>
        prev.map((r) => (r.id === riderId ? { ...r, isTalking: true } : r))
      );
    });

    socketService.setOnVoiceIncomingStop(({ riderId }) => {
      setActiveSpeaker(null);
      setRiders((prev) =>
        prev.map((r) => (r.id === riderId ? { ...r, isTalking: false } : r))
      );
    });

    socketService.setOnChat((msg) => {
      addChatMessage(msg);
    });

    socketService.setOnRoleChanged(({ riderId, newRole, message }) => {
      setRiders((prev) =>
        prev.map((r) => (r.id === riderId ? { ...r, role: newRole as RiderRole } : r))
      );
      if (message) {
        addChatMessage({
          id: `msg-${Date.now()}`,
          senderId: 'system',
          senderName: 'Convoy System',
          text: message,
          timestamp: Date.now(),
          type: 'system'
        });
      }
    });
  }, []);

  // Connect Real Phone GPS Tracking (Zero Bots)
  useEffect(() => {
    geolocationService.setOnPositionUpdate((pos) => {
      setCurrentGpsCoords({ lat: pos.lat, lng: pos.lng });

      const updateData: Partial<Rider> = {
        lat: pos.lat,
        lng: pos.lng,
        heading: pos.heading,
        speed: pos.speed,
        altitude: pos.altitude,
        battery: 95
      };

      // Update local user rider state when in Cockpit or Lobby
      if (screen === 'cockpit' || screen === 'lobby') {
        setRiders((prev) => {
          const exists = prev.some((r) => r.id === profile.id);
          if (!exists) {
            return [
              ...prev,
              {
                ...profile,
                ...updateData,
                isOnline: true,
                isTalking: false,
                lastPing: Date.now(),
                distanceFromLeader: 0,
                distanceCoveredKm: 0,
                channel: 'convoy-main'
              } as Rider
            ];
          }
          return prev.map((r) => (r.id === profile.id ? { ...r, ...updateData } : r));
        });

        // Broadcast real GPS telemetry over Socket.IO to other riders
        socketService.sendTelemetry({
          riderId: profile.id,
          ...updateData
        });
      }
    });

    geolocationService.startTracking();

    return () => {
      geolocationService.stopTracking();
    };
  }, [screen, profile]);

  useEffect(() => {
    if (screen === 'cockpit' || screen === 'lobby') {
      geolocationService.requestWakeLock().then((active) => setWakeLockActive(active));
    } else {
      geolocationService.releaseWakeLock();
      setWakeLockActive(false);
    }
  }, [screen]);

  const addChatMessage = (msg: ChatMessage) => {
    setMessages((prev) => [...prev.slice(-99), msg]);
  };

  // ══════════════════════════════════════════════════════════════════════
  // ACTION HANDLERS
  // ══════════════════════════════════════════════════════════════════════

  // 1. Create a Ride Group
  const handleCreateGroup = async (title: string, targetSpeed: number) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/rides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          leaderId: profile.id,
          leaderName: profile.name,
          leaderCallsign: profile.callsign,
          leaderBike: profile.bikeModel,
          leaderColor: profile.avatarColor,
          targetSpeed
        })
      });

      if (!res.ok) throw new Error('Failed to create ride room');
      const data = await res.json();

      setProfile((prev) => ({ ...prev, role: 'leader' }));
      setRide(data.ride);
      setRiders(data.ride.riders || []);
      setAlerts([]);
      setMessages(data.ride.messages || []);

      socketService.joinRide(data.ride.code, { ...profile, role: 'leader' });
      setScreen('lobby');
    } catch (err: any) {
      alert(`Could not create ride group: ${err.message}`);
    }
  };

  // 2. Join a Ride Group via Code
  const handleJoinGroup = async (code: string) => {
    const formattedCode = code.trim().toUpperCase();
    const res = await fetch(`${getApiBaseUrl()}/api/rides/${formattedCode}`);
    if (!res.ok) {
      throw new Error(`Convoy code "${formattedCode}" does not exist.`);
    }

    const data = await res.json();
    setRide(data);
    setRiders(data.riders || []);
    setAlerts(data.alerts || []);
    setMessages(data.messages || []);
    if (data.activeRoute) setActiveRoute(data.activeRoute);

    const isUserLeader = data.leaderId === profile.id;
    const memberRole: RiderRole = isUserLeader ? 'leader' : 'rider';

    socketService.joinRide(formattedCode, { ...profile, role: memberRole });

    if (data.status === 'active') {
      setScreen('cockpit');
      setIsRideActive(true);
    } else {
      setScreen('lobby');
    }
  };

  // 3. Start Solo Ride (No Group) - MANDATORY DESTINATION REQUIRED
  const handleStartSoloRide = async (
    startPoint: { name: string; lat: number; lng: number },
    destPoint: { name: string; lat: number; lng: number }
  ) => {
    if (!destPoint || !destPoint.lat || !destPoint.lng) {
      alert('Without putting a destination location, you cannot start the ride.');
      return;
    }

    const routeRes = await routingService.calculateRoute([startPoint, destPoint]);
    if (!routeRes) {
      alert('Could not calculate driving route between these points. Please try another destination.');
      return;
    }

    const startShort = startPoint.name.split(',')[0];
    const destShort = destPoint.name.split(',')[0];

    const fuelWaypoints: Waypoint[] = (routeRes.fuelStops || []).map((fs) => ({
      id: fs.id,
      name: fs.name,
      lat: fs.lat,
      lng: fs.lng,
      type: 'fuel' as const,
      description: fs.description,
      distanceFromStartKm: fs.distanceFromStartKm
    }));

    const newActiveRoute: ActiveRoute = {
      title: `${startShort} ➔ ${destShort}`,
      startName: startPoint.name,
      destName: destPoint.name,
      coordinates: routeRes.coordinates,
      distanceKm: routeRes.distanceKm,
      durationMinutes: routeRes.durationMinutes,
      maneuvers: routeRes.maneuvers,
      summary: routeRes.summary,
      fuelStops: fuelWaypoints
    };

    setActiveRoute(newActiveRoute);
    activeRouteRef.current = newActiveRoute;

    const newWaypoints: Waypoint[] = [
      { id: 'wp-start', name: `${startShort} (Start)`, lat: startPoint.lat, lng: startPoint.lng, type: 'start' },
      ...fuelWaypoints,
      { id: 'wp-dest', name: `${destShort} (Destination)`, lat: destPoint.lat, lng: destPoint.lng, type: 'destination' }
    ];
    setCustomWaypoints(newWaypoints);

    const soloId = `solo-${Math.random().toString(36).substring(2, 7)}`;
    const soloRider: Rider = {
      id: profile.id,
      name: profile.name,
      callsign: profile.callsign,
      bikeModel: profile.bikeModel,
      avatarColor: profile.avatarColor,
      role: 'leader',
      lat: currentGpsCoords?.lat || startPoint.lat,
      lng: currentGpsCoords?.lng || startPoint.lng,
      heading: 0,
      speed: 0,
      altitude: 0,
      battery: 98,
      isOnline: true,
      isTalking: false,
      lastPing: Date.now(),
      distanceFromLeader: 0,
      distanceCoveredKm: 0,
      channel: 'solo'
    };

    const soloRide: RideChannel = {
      id: soloId,
      code: 'SOLO',
      title: `${startShort} ➔ ${destShort}`,
      description: 'Solo Motorcycle Navigation',
      leaderId: profile.id,
      createdAt: Date.now(),
      status: 'active',
      targetSpeed: 80,
      activeRoute: newActiveRoute,
      route: newWaypoints,
      riders: [soloRider],
      alerts: [],
      messages: []
    };

    setRideStartTime(Date.now());
    setRide(soloRide);
    setRiders([soloRider]);
    setIsRideActive(true);
    setScreen('cockpit');
  };

  // Route Selection Anywhere (Nominatim + OSRM)
  const handleRouteSelected = async (
    start: { name: string; lat: number; lng: number },
    dest: { name: string; lat: number; lng: number }
  ) => {
    const routeRes = await routingService.calculateRoute([start, dest]);
    if (!routeRes) {
      alert('Could not calculate driving route between these points. Please try another destination.');
      return;
    }

    const startShort = start.name.split(',')[0];
    const destShort = dest.name.split(',')[0];

    const fuelWaypoints: Waypoint[] = (routeRes.fuelStops || []).map((fs) => ({
      id: fs.id,
      name: fs.name,
      lat: fs.lat,
      lng: fs.lng,
      type: 'fuel' as const,
      description: fs.description,
      distanceFromStartKm: fs.distanceFromStartKm
    }));

    const newActiveRoute: ActiveRoute = {
      title: `${startShort} ➔ ${destShort}`,
      startName: start.name,
      destName: dest.name,
      coordinates: routeRes.coordinates,
      distanceKm: routeRes.distanceKm,
      durationMinutes: routeRes.durationMinutes,
      maneuvers: routeRes.maneuvers,
      summary: routeRes.summary,
      fuelStops: fuelWaypoints
    };

    setActiveRoute(newActiveRoute);
    activeRouteRef.current = newActiveRoute;

    // Immediately filter existing alerts against the new route
    setAlerts((prev) =>
      prev.filter((a) =>
        !['hazard', 'police', 'fuel', 'breakdown'].includes(a.type) ||
        routingService.isHazardOnRoute(a.lat, a.lng, newActiveRoute.coordinates, 500)
      )
    );

    const newWaypoints: Waypoint[] = [
      { id: 'wp-start', name: `${startShort} (Start)`, lat: start.lat, lng: start.lng, type: 'start' },
      ...fuelWaypoints,
      { id: 'wp-dest', name: `${destShort} (Destination)`, lat: dest.lat, lng: dest.lng, type: 'destination' }
    ];
    setCustomWaypoints(newWaypoints);
    setRide((prev) => (prev ? { ...prev, activeRoute: newActiveRoute, route: newWaypoints } : prev));

    socketService.sendRouteSet(newActiveRoute);
    audioEffects.playAlertSound('regroup');

    addChatMessage({
      id: `route-${Date.now()}`,
      senderId: profile.id,
      senderName: profile.callsign,
      text: `Route Locked: ${startShort} ➔ ${destShort} (${routeRes.distanceKm} km, ~${Math.floor(routeRes.durationMinutes / 60)}h ${routeRes.durationMinutes % 60}m) • ${fuelWaypoints.length} Fuel Pumps mapped!`,
      timestamp: Date.now(),
      type: 'system'
    });
  };

  // Leader Flags-Off the Ride - MANDATORY DESTINATION REQUIRED
  const handleStartConvoyRide = () => {
    if (!ride?.activeRoute || !ride.activeRoute.coordinates || ride.activeRoute.coordinates.length === 0) {
      alert('Without putting a destination location, you cannot start the ride. Please set a destination first!');
      return;
    }
    setRideStartTime(Date.now());
    socketService.startConvoyRide();
    setIsRideActive(true);
    setScreen('cockpit');
  };

  // User Authentication Handlers
  const handleAuthSuccess = (user: AuthUser) => {
    setAuthUser(user);
    setProfile((prev) => ({
      ...prev,
      name: user.name || prev.name,
      callsign: user.callsign || prev.callsign,
      bikeModel: user.bikeModel || prev.bikeModel,
      avatarColor: user.avatarColor || prev.avatarColor
    }));

    // Fetch user's saved ride history from SQLite database
    fetch(`${getApiBaseUrl()}/api/rides/history?userId=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.history)) {
          setRideHistory(data.history);
          localStorage.setItem('riders_ride_history', JSON.stringify(data.history));
        }
      })
      .catch(() => {});
  };

  const handleSignOut = () => {
    localStorage.removeItem('riders_auth_user');
    localStorage.removeItem('riders_auth_token');
    setAuthUser(null);
  };

  const handleClearHistory = () => {
    if (authUser?.id) {
      fetch(`${getApiBaseUrl()}/api/rides/history?userId=${authUser.id}`, { method: 'DELETE' }).catch(() => {});
    }
    localStorage.removeItem('riders_ride_history');
    setRideHistory([]);
  };

  // Complete and record ride metrics to database and local state
  const recordCompletedRide = (endedRide?: RideChannel | null) => {
    const durationMinutes = rideStartTime
      ? Math.max(1, Math.round((Date.now() - rideStartTime) / 60000))
      : (activeRoute?.durationMinutes || 15);

    const distanceKm = activeRoute?.distanceKm
      ? Number(activeRoute.distanceKm.toFixed(1))
      : (currentRider?.distanceCoveredKm ? Number(currentRider.distanceCoveredKm.toFixed(1)) : 10.0);

    const avgSpeed = durationMinutes > 0
      ? Math.round((distanceKm / (durationMinutes / 60)))
      : (ride?.targetSpeed || 55);

    const completedRide: CompletedRide = {
      id: `hist-${Date.now()}`,
      routeTitle: activeRoute?.title || `${activeRoute?.startName || 'Start'} ➔ ${activeRoute?.destName || 'Destination'}`,
      startName: activeRoute?.startName || 'My Current Location',
      destName: activeRoute?.destName || 'Destination',
      distanceKm,
      durationMinutes,
      avgSpeedKmh: avgSpeed > 0 && avgSpeed < 200 ? avgSpeed : (ride?.targetSpeed || 55),
      completedAt: Date.now(),
      mode: (ride?.code === 'SOLO' || !ride) ? 'solo' : 'convoy',
      code: endedRide?.code || ride?.code || null
    };

    // Save to local state and localStorage
    setRideHistory((prev) => {
      const updated = [completedRide, ...prev];
      localStorage.setItem('riders_ride_history', JSON.stringify(updated));
      return updated;
    });

    // Save to SQLite database
    fetch(`${getApiBaseUrl()}/api/rides/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: authUser?.id || null, ride: completedRide })
    }).catch(() => {});

    setCompletedRideData(completedRide);
    setIsCompletionModalOpen(true);
    setIsRideActive(false);
    setRideStartTime(null);
  };

  // Trigger In-App Exit Modal (Replaces browser confirm)
  const handleEndRide = () => {
    setIsExitConfirmOpen(true);
  };

  // Confirm In-App Exit Navigation
  const handleConfirmEndRide = () => {
    setIsExitConfirmOpen(false);
    if (ride && ride.leaderId === profile.id && ride.code !== 'SOLO') {
      socketService.endConvoyRide();
    }
    recordCompletedRide(ride);
  };

  const handleLeaveLobby = () => {
    setRide(null);
    setRiders([]);
    setScreen('mobile');
  };

  // Toggle Tracking Mode (Live GPS)
  const handleToggleTrackingMode = () => {
    // 100% Real GPS
    alert('Using 100% Live Device GPS. Fake bot simulations are permanently disabled.');
  };

  // Sound / Audio SFX Toggle
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audioEffects.setSoundEnabled(next);
  };

  // Handle Screen WakeLock
  const handleToggleWakeLock = async () => {
    if (wakeLockActive) {
      geolocationService.releaseWakeLock();
      setWakeLockActive(false);
    } else {
      const ok = await geolocationService.requestWakeLock();
      setWakeLockActive(ok);
    }
  };

  // Trigger Road Hazard
  const handleTriggerAlert = (type: AlertType, title: string, detail: string) => {
    const alertData: Partial<TacticalAlert> = {
      type,
      title,
      detail,
      lat: currentGpsCoords?.lat || 18.5204,
      lng: currentGpsCoords?.lng || 73.8567,
      createdBy: profile.id,
      creatorName: profile.callsign
    };
    socketService.sendAlert(alertData);
  };

  const handleDismissAlert = (alertId: string) => {
    socketService.dismissAlert(alertId);
  };

  const handleSendMessage = (text: string) => {
    socketService.sendChat(text, profile.id, `${profile.name} (${profile.callsign})`);
  };

  const handleAssignRole = (targetRiderId: string, newRole: RiderRole) => {
    socketService.assignRole(targetRiderId, newRole);
  };

  const currentRider = useMemo(() => {
    return riders.find((r) => r.id === profile.id) || riders[0] || null;
  }, [riders, profile.id]);

  const activeWaypoints = customWaypoints.length > 0
    ? customWaypoints
    : (ride ? ride.route : []);

  const totalTripKm = activeRoute ? activeRoute.distanceKm : 50;
  const distanceToDestinationKm = currentRider
    ? Math.max(0, Math.round(totalTripKm - (currentRider.distanceCoveredKm || 0)))
    : totalTripKm;

  const isLeader = profile.role === 'leader' || (ride && ride.leaderId === profile.id);

  // ══════════════════════════════════════════════════════════════════════
  // RENDER SCREENS
  // ══════════════════════════════════════════════════════════════════════

  // 1. Classic Mobile App Shell (Persistent Top App Bar, Scrollable View & Bottom Tab Bar)
  if (screen === 'mobile') {
    return (
      <>
        <ClassicMobileApp
          currentProfile={profile}
          onUpdateProfile={handleUpdateProfile}
          onCreateGroup={handleCreateGroup}
          onJoinGroup={handleJoinGroup}
          onStartSoloRide={handleStartSoloRide}
          isConnected={isConnected}
          initialTab={mobileTab}
          initialCode={initialUrlCode}
          currentGpsCoords={currentGpsCoords}
          authUser={authUser}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onSignOut={handleSignOut}
          rideHistory={rideHistory}
          onClearHistory={handleClearHistory}
        />

        {/* In-App Ride Completed & Congratulations Modal */}
        <RideCompletionModal
          isOpen={isCompletionModalOpen}
          rideData={completedRideData}
          onClose={() => setIsCompletionModalOpen(false)}
          onViewHistory={() => {
            setIsCompletionModalOpen(false);
            setMobileTab('garage');
          }}
        />

        {/* Database Rider Authentication Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  // 2. Staging Lobby (Pre-ride Group Staging)
  if (screen === 'lobby' && ride) {
    return (
      <>
        <StagingLobby
          ride={ride}
          currentRiderId={profile.id}
          isLeader={Boolean(isLeader)}
          onStartRide={handleStartConvoyRide}
          onLeaveRide={handleLeaveLobby}
          onRouteSelected={handleRouteSelected}
          currentGpsCoords={currentGpsCoords}
        />

        {/* In-App Ride Completed Modal if broadcasted */}
        <RideCompletionModal
          isOpen={isCompletionModalOpen}
          rideData={completedRideData}
          onClose={() => {
            setIsCompletionModalOpen(false);
            setScreen('mobile');
          }}
          onViewHistory={() => {
            setIsCompletionModalOpen(false);
            setMobileTab('garage');
            setScreen('mobile');
          }}
        />
      </>
    );
  }

  // 3. Landscape Cockpit (Active Navigation)
  return (
    <div className="relative w-full h-dvh max-h-dvh overflow-hidden bg-[#0b0f19] font-sans select-none text-black">
      {/* Fullscreen Interactive Leaflet Map (Satellite Imagery ONLY) */}
      <div className="absolute inset-0 w-full h-full z-0">
        <MapView
          riders={riders}
          waypoints={activeWaypoints}
          currentRiderId={profile.id}
          cameraMode={cameraMode}
          onSetCameraMode={setCameraMode}
          activeRoutePath={activeRoute?.coordinates}
          isRideActive={isRideActive}
          startPoint={activeRoute && activeRoute.coordinates.length > 0 ? { lat: activeRoute.coordinates[0][0], lng: activeRoute.coordinates[0][1] } : null}
        />
      </div>

      {/* Top Left: Neobrutalism Turn-by-Turn Card */}
      <GoogleMapsTurnCard
        currentManeuver={activeRoute?.maneuvers ? activeRoute.maneuvers[0] : null}
        destinationName={activeRoute ? activeRoute.destName.split(',')[0] : 'Destination'}
        distanceToDestinationKm={distanceToDestinationKm}
      />

      {/* Top Center & Right: Search Route & Quick Settings */}
      <GoogleMapsTopBar
        ride={ride}
        trackingMode="device_gps"
        onToggleTrackingMode={handleToggleTrackingMode}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        wakeLockActive={wakeLockActive}
        onToggleWakeLock={handleToggleWakeLock}
        onOpenRideModal={() => setIsRideModalOpen(true)}
        onRouteSelected={handleRouteSelected}
        currentGpsCoords={currentGpsCoords}
        activeRouteSummary={activeRoute?.title}
        isLeader={Boolean(isLeader)}
      />

      {/* Bottom Left: Speedometer & Pack Spread */}
      <SpeedometerPill
        speed={currentRider ? currentRider.speed : 0}
        heading={currentRider ? currentRider.heading : 0}
        packSpreadMeters={packSpreadMeters}
      />

      {/* Bottom Right: Cockpit Navigation Bar */}
      <GoogleMapsBottomBar
        durationMinutes={activeRoute?.durationMinutes || 45}
        distanceKm={activeRoute?.distanceKm || 30}
        destinationName={activeRoute ? activeRoute.destName.split(',')[0] : 'Destination'}
        isRideActive={isRideActive}
        hasActiveRoute={Boolean(activeRoute && activeRoute.coordinates && activeRoute.coordinates.length > 0)}
        onStartRide={() => {
          if (!activeRoute) {
            alert('Without putting a destination location, you cannot start navigation. Please search a destination.');
            return;
          }
          setIsRideActive(true);
        }}
        onEndRide={handleEndRide}
        onOpenRoster={() => setIsRosterOpen(true)}
        onHighlightFuel={() => setIsFuelModalOpen(true)}
        ridersCount={riders.length}
        currentRiderId={profile.id}
        callsign={profile.callsign}
        activeSpeaker={activeSpeaker}
        channel={voiceChannel}
      />

      {/* Highway Fuel Stops Modal */}
      <FuelStopsModal
        isOpen={isFuelModalOpen}
        onClose={() => setIsFuelModalOpen(false)}
        fuelStops={activeRoute?.fuelStops || []}
        onSelectFuelStop={(_lat, _lng) => {
          setCameraMode('free');
        }}
      />

      {/* Convoy Roster & Comms Drawer */}
      <ConvoyRoster
        isOpen={isRosterOpen}
        onClose={() => setIsRosterOpen(false)}
        riders={riders}
        currentRiderId={profile.id}
        isLeader={Boolean(isLeader)}
        messages={messages}
        onSendMessage={handleSendMessage}
        onAssignRole={handleAssignRole}
        onFocusRider={(_id) => setCameraMode('free')}
        onTriggerRegroup={() => handleTriggerAlert('regroup', 'Convoy Regroup', 'Leader requested immediate pack regroup')}
      />

      {/* Profile & Lobby Settings Modal */}
      <CreateJoinModal
        isOpen={isRideModalOpen}
        onClose={() => setIsRideModalOpen(false)}
        onJoinRide={(code) => handleJoinGroup(code)}
        onCreateRide={(rideData) => handleCreateGroup(rideData.title, rideData.targetSpeed)}
        currentProfile={profile}
        onUpdateProfile={handleUpdateProfile}
      />

      {/* In-App Exit Confirmation Modal (Replaces browser confirm) */}
      <ExitConfirmModal
        isOpen={isExitConfirmOpen}
        onCancel={() => setIsExitConfirmOpen(false)}
        onConfirm={handleConfirmEndRide}
      />

      {/* In-App Ride Completed & Congratulations Modal (Replaces browser alert) */}
      <RideCompletionModal
        isOpen={isCompletionModalOpen}
        rideData={completedRideData}
        onClose={() => {
          setIsCompletionModalOpen(false);
          setScreen('mobile');
        }}
        onViewHistory={() => {
          setIsCompletionModalOpen(false);
          setMobileTab('garage');
          setScreen('mobile');
        }}
      />
    </div>
  );
}

export default App;
