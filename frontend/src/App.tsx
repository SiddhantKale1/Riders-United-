import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { MapView } from './components/MapView';
import { PushToTalk } from './components/PushToTalk';
import { CockpitHUD } from './components/CockpitHUD';
import { TacticalAlertsBar } from './components/TacticalAlertsBar';
import { ConvoyRoster } from './components/ConvoyRoster';
import { RouteScheduleModal } from './components/RouteScheduleModal';
import { CreateJoinModal } from './components/CreateJoinModal';
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
  ActiveRoute
} from './types';
import { socketService } from './services/socket';
import { audioEffects } from './services/audioEffects';
import { convoySimulation } from './services/simulationEngine';
import { geolocationService } from './services/geolocationService';
import { routingService } from './services/routingService';
import { nativeMobile } from './services/nativeMobile';

export function App() {
  // Current user's profile
  const [profile, setProfile] = useState<{
    id: string;
    name: string;
    callsign: string;
    bikeModel: string;
    avatarColor: string;
    role: RiderRole;
  }>({
    id: 'rider-vikram',
    name: 'Vikram Singh',
    callsign: 'Thunder Lead',
    bikeModel: 'Royal Enfield Himalayan 450',
    avatarColor: '#f59e0b',
    role: 'leader'
  });

  // State
  const [ride, setRide] = useState<RideChannel | null>(null);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [packSpreadMeters, setPackSpreadMeters] = useState<number>(1420);
  const [alerts, setAlerts] = useState<TacticalAlert[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Dynamic Route Anywhere State (OSRM + Nominatim)
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);
  const [customWaypoints, setCustomWaypoints] = useState<Waypoint[]>([]);
  const [currentGpsCoords, setCurrentGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Controls & Modals
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('simulation');
  const [cameraMode, setCameraMode] = useState<CameraMode>('convoy');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [voiceChannel, setVoiceChannel] = useState<string>('convoy-main');

  const [activeSpeaker, setActiveSpeaker] = useState<{
    riderId: string;
    callsign: string;
    role?: string;
  } | null>(null);

  const [isRosterOpen, setIsRosterOpen] = useState<boolean>(false);
  const [isRouteOpen, setIsRouteOpen] = useState<boolean>(false);
  const [isRideModalOpen, setIsRideModalOpen] = useState<boolean>(false);

  // Initialize Socket.io and Load Initial Ride
  useEffect(() => {
    nativeMobile.init();
    socketService.init();

    // Listen to initial full state from backend
    socketService.setOnRideState((state: RideChannel) => {
      setRide(state);
      setRiders(state.riders);
      setAlerts(state.alerts);
      setMessages(state.messages);
      if (state.activeRoute) {
        setActiveRoute(state.activeRoute);
        convoySimulation.setCustomPath(state.activeRoute.coordinates, state.activeRoute.distanceKm);
      }
    });

    // Listen to telemetry updates
    socketService.setOnTelemetry((riderId, telemetry) => {
      setRiders((prev) =>
        prev.map((r) => (r.id === riderId ? { ...r, ...telemetry } : r))
      );
    });

    socketService.setOnBatchTelemetry((batchRiders) => {
      setRiders(batchRiders);
    });

    // Listen to route updates from other riders/leader
    socketService.setOnRouteSet((newRoute: ActiveRoute, msg?: string) => {
      setActiveRoute(newRoute);
      convoySimulation.setCustomPath(newRoute.coordinates, newRoute.distanceKm);
      audioEffects.playAlertSound('regroup');
      if (msg) {
        addChatMessage({
          id: `route-${Date.now()}`,
          senderId: 'system',
          senderName: 'Convoy Navigation',
          text: msg,
          timestamp: Date.now(),
          type: 'system'
        });
      }
    });

    // Listen to alerts
    socketService.setOnAlert((newAlert, msg) => {
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

    // Listen to incoming voice
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

    // Listen to chat
    socketService.setOnChat((msg) => {
      addChatMessage(msg);
    });

    // Listen to role changes
    socketService.setOnRoleChanged(({ riderId, newRole, message }) => {
      setRiders((prev) =>
        prev.map((r) => (r.id === riderId ? { ...r, role: newRole as RiderRole } : r))
      );
      if (message) {
        addChatMessage({
          id: `msg-${Date.now()}`,
          senderId: 'system',
          senderName: 'System',
          text: message,
          timestamp: Date.now(),
          type: 'system'
        });
      }
    });

    // Attempt to join default ride MUM-GOA
    socketService.joinRide('MUM-GOA', profile);

    // Fetch initial HTTP snapshot
    fetch('http://localhost:5001/api/rides/MUM-GOA')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.code) {
          setRide(data);
          setRiders(data.riders);
          setAlerts(data.alerts || []);
          setMessages(data.messages || []);
          if (data.activeRoute) {
            setActiveRoute(data.activeRoute);
            convoySimulation.setCustomPath(data.activeRoute.coordinates, data.activeRoute.distanceKm);
          }
        }
      })
      .catch(() => {
        const initialSimRiders = convoySimulation.getRiders();
        setRiders(initialSimRiders);
      });
  }, []);

  // Connect Simulation Engine
  useEffect(() => {
    convoySimulation.setOnUpdate((simRiders, spread) => {
      if (trackingMode === 'simulation') {
        setRiders(simRiders);
        setPackSpreadMeters(spread);
        socketService.sendBatchTelemetry(simRiders);
      }
    });

    convoySimulation.setOnRadioChatter((chatter) => {
      addChatMessage({
        id: `radio-${Date.now()}`,
        senderId: chatter.senderId,
        senderName: chatter.senderId.replace('rider-', '').toUpperCase(),
        text: `[RADIO] ${chatter.text}`,
        timestamp: Date.now(),
        type: 'radio_transcript'
      });
    });

    if (trackingMode === 'simulation') {
      convoySimulation.start();
      setIsSimulating(true);
    }

    return () => {
      convoySimulation.pause();
    };
  }, [trackingMode]);

  // Connect Real Device GPS if selected (Works anywhere in the world)
  useEffect(() => {
    if (trackingMode === 'device_gps') {
      convoySimulation.pause();
      setIsSimulating(false);

      geolocationService.setOnPositionUpdate((pos) => {
        setCurrentGpsCoords({ lat: pos.lat, lng: pos.lng });

        const updateData: Partial<Rider> = {
          lat: pos.lat,
          lng: pos.lng,
          heading: pos.heading,
          speed: pos.speed,
          altitude: pos.altitude,
          battery: 94
        };

        setRiders((prev) =>
          prev.map((r) => (r.id === profile.id ? { ...r, ...updateData } : r))
        );

        socketService.sendTelemetry({
          riderId: profile.id,
          ...updateData
        });
      });

      geolocationService.startTracking();
    } else {
      geolocationService.stopTracking();
    }

    return () => {
      geolocationService.stopTracking();
    };
  }, [trackingMode, profile.id]);

  const addChatMessage = (msg: ChatMessage) => {
    setMessages((prev) => [...prev.slice(-99), msg]);
  };

  // Dynamic Route Selection Anywhere (Google Maps style)
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

    const newActiveRoute: ActiveRoute = {
      title: `${startShort} ➔ ${destShort}`,
      startName: start.name,
      destName: dest.name,
      coordinates: routeRes.coordinates,
      distanceKm: routeRes.distanceKm,
      durationMinutes: routeRes.durationMinutes,
      maneuvers: routeRes.maneuvers,
      summary: routeRes.summary
    };

    setActiveRoute(newActiveRoute);

    // Dynamic Waypoints for the new route
    const newWaypoints: Waypoint[] = [
      { id: 'wp-start', name: `${startShort} (Start)`, lat: start.lat, lng: start.lng, type: 'start' },
      { id: 'wp-dest', name: `${destShort} (Destination)`, lat: dest.lat, lng: dest.lng, type: 'destination' }
    ];
    setCustomWaypoints(newWaypoints);

    // Update simulation engine so all 5 bikes ride along this new route!
    convoySimulation.setCustomPath(routeRes.coordinates, routeRes.distanceKm);

    // Broadcast to all other riders in room over Socket.IO
    socketService.sendRouteSet(newActiveRoute);

    // Play route audio chime
    audioEffects.playAlertSound('regroup');

    addChatMessage({
      id: `route-${Date.now()}`,
      senderId: profile.id,
      senderName: profile.callsign,
      text: `🏁 New route locked: ${startShort} ➔ ${destShort} (${routeRes.distanceKm} km, ~${Math.floor(routeRes.durationMinutes / 60)}h ${routeRes.durationMinutes % 60}m)`,
      timestamp: Date.now(),
      type: 'system'
    });
  };

  // Toggle Tracking Mode (Live GPS vs Sim)
  const handleToggleTrackingMode = () => {
    const nextMode = trackingMode === 'simulation' ? 'device_gps' : 'simulation';
    setTrackingMode(nextMode);
    if (nextMode === 'simulation') {
      convoySimulation.start();
      setIsSimulating(true);
    } else {
      convoySimulation.pause();
      setIsSimulating(false);
    }
  };

  // Toggle Sound SFX
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audioEffects.setSoundEnabled(next);
  };

  // Toggle Bike Handlebar Screen WakeLock
  const handleToggleWakeLock = async () => {
    if (wakeLockActive) {
      geolocationService.releaseWakeLock();
      setWakeLockActive(false);
    } else {
      const success = await geolocationService.requestWakeLock();
      if (success) setWakeLockActive(true);
    }
  };

  // Simulation Controls
  const handleToggleSimulation = () => {
    if (isSimulating) {
      convoySimulation.pause();
      setIsSimulating(false);
    } else {
      convoySimulation.start();
      setIsSimulating(true);
    }
  };

  const handleChangeSimSpeed = (speed: number) => {
    setSimSpeed(speed);
    convoySimulation.setSpeedMultiplier(speed);
  };

  // Send Tactical Alert
  const handleTriggerAlert = (type: AlertType, title: string, detail: string) => {
    const currentRider = riders.find((r) => r.id === profile.id) || riders[0];
    const newAlert: Partial<TacticalAlert> = {
      type,
      title,
      detail,
      lat: currentRider ? currentRider.lat : 18.2520,
      lng: currentRider ? currentRider.lng : 73.2878,
      createdBy: profile.id,
      creatorName: `${profile.name} (${profile.callsign})`
    };

    socketService.sendAlert(newAlert);
  };

  const handleDismissAlert = (alertId: string) => {
    socketService.dismissAlert(alertId);
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  // Role Assignment
  const handleAssignRole = (riderId: string, newRole: RiderRole) => {
    socketService.assignRole(riderId, newRole);
    setRiders((prev) =>
      prev.map((r) => (r.id === riderId ? { ...r, role: newRole } : r))
    );
  };

  // Send Chat message
  const handleSendMessage = (text: string) => {
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: profile.id,
      senderName: `${profile.callsign} (${profile.name})`,
      text,
      timestamp: Date.now(),
      type: 'chat'
    };
    socketService.sendChat(text, profile.id, `${profile.callsign} (${profile.name})`);
    addChatMessage(msg);
  };

  // Trigger Regroup Chime (Leader action)
  const handleTriggerRegroup = () => {
    audioEffects.playAlertSound('regroup');
    handleTriggerAlert('regroup', 'Convoy Regroup Signal', 'Lead rider requested immediate pack regroup');
  };

  // Join or Create Ride
  const handleJoinRide = (code: string, riderInfo: any) => {
    socketService.joinRide(code, { ...profile, ...riderInfo });
  };

  const handleCreateRide = (rideData: any) => {
    fetch('http://localhost:5001/api/rides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rideData)
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ride) {
          setRide(data.ride);
          setRiders(data.ride.riders);
          socketService.joinRide(data.ride.code, profile);
        }
      });
  };

  const handleFocusRider = (_riderId: string) => {
    setCameraMode('free');
  };

  const currentRider = useMemo(() => {
    return riders.find((r) => r.id === profile.id) || riders[0] || null;
  }, [riders, profile.id]);

  const activeWaypoints = customWaypoints.length > 0
    ? customWaypoints
    : (ride ? ride.route : []);

  const nextWaypoint = activeWaypoints.length > 1 ? activeWaypoints[1] : null;

  const totalTripKm = activeRoute ? activeRoute.distanceKm : 550;
  const distanceToDestinationKm = currentRider
    ? Math.max(0, Math.round(totalTripKm - (currentRider.distanceCoveredKm || 0)))
    : totalTripKm;

  const isLeader = profile.role === 'leader' || (ride && ride.leaderId === profile.id);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none text-slate-100">
      {/* Fullscreen Interactive Leaflet Map */}
      <div className="absolute inset-0 w-full h-full z-0">
        <MapView
          riders={riders}
          waypoints={activeWaypoints}
          alerts={alerts}
          currentRiderId={profile.id}
          cameraMode={cameraMode}
          onSetCameraMode={setCameraMode}
          activeRoutePath={activeRoute?.coordinates}
          onMapClickReportAlert={(lat, lng) => {
            handleTriggerAlert('hazard', 'Reported Hazard Pin', `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }}
        />
      </div>

      {/* Floating Modern CarPlay Style Top Island with Route Search Anywhere */}
      <Navbar
        ride={ride}
        trackingMode={trackingMode}
        onToggleTrackingMode={handleToggleTrackingMode}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        wakeLockActive={wakeLockActive}
        onToggleWakeLock={handleToggleWakeLock}
        isSimulating={isSimulating}
        simSpeed={simSpeed}
        onToggleSimulation={handleToggleSimulation}
        onChangeSimSpeed={handleChangeSimSpeed}
        onOpenRoster={() => setIsRosterOpen(true)}
        onOpenRoute={() => setIsRouteOpen(true)}
        onOpenAlerts={() => setIsRosterOpen(true)}
        onOpenRideModal={() => setIsRideModalOpen(true)}
        unreadAlertsCount={alerts.filter((a) => a.active).length}
        onRouteSelected={handleRouteSelected}
        currentGpsCoords={currentGpsCoords}
        activeRouteSummary={activeRoute?.title}
      />

      {/* Speedometer & Turn-by-Turn Maneuver Cockpit HUD (Top Right) */}
      <CockpitHUD
        currentRider={currentRider}
        packSpreadMeters={packSpreadMeters}
        nextWaypoint={nextWaypoint}
        distanceToDestinationKm={distanceToDestinationKm}
        currentManeuver={activeRoute?.maneuvers ? activeRoute.maneuvers[0] : null}
        destinationName={activeRoute ? activeRoute.destName.split(',')[0] : 'Baga Beach, Goa'}
        durationMinutes={activeRoute?.durationMinutes}
      />

      {/* Bottom Center: Tactical Alerts Quick Action Dock */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none">
        <TacticalAlertsBar
          alerts={alerts}
          onTriggerAlert={handleTriggerAlert}
          onDismissAlert={handleDismissAlert}
        />
      </div>

      {/* Right Wing (Handlebar Right Thumb Station): Big Push-To-Talk Button */}
      <div className="absolute bottom-4 right-4 z-20 pointer-events-none flex flex-col items-end">
        <PushToTalk
          currentRiderId={profile.id}
          callsign={profile.callsign}
          activeSpeaker={activeSpeaker}
          channel={voiceChannel}
          onChangeChannel={setVoiceChannel}
        />
      </div>

      {/* Discord-style Convoy Roster & Voice Channels Drawer */}
      <ConvoyRoster
        isOpen={isRosterOpen}
        onClose={() => setIsRosterOpen(false)}
        riders={riders}
        currentRiderId={profile.id}
        isLeader={Boolean(isLeader)}
        messages={messages}
        onSendMessage={handleSendMessage}
        onAssignRole={handleAssignRole}
        onFocusRider={handleFocusRider}
        onTriggerRegroup={handleTriggerRegroup}
      />

      {/* Route Schedule / Waypoints Modal */}
      <RouteScheduleModal
        isOpen={isRouteOpen}
        onClose={() => setIsRouteOpen(false)}
        waypoints={activeWaypoints}
        onSelectWaypoint={(_wp) => {
          setCameraMode('free');
        }}
        onJumpSimulation={(fraction) => {
          convoySimulation.setProgress(fraction);
        }}
      />

      {/* Profile & Ride Lobby Modal */}
      <CreateJoinModal
        isOpen={isRideModalOpen}
        onClose={() => setIsRideModalOpen(false)}
        onJoinRide={handleJoinRide}
        onCreateRide={handleCreateRide}
        currentProfile={profile}
        onUpdateProfile={(updated) => setProfile((prev) => ({ ...prev, ...updated }))}
      />
    </div>
  );
}

export default App;
