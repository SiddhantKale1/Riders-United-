import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  AlertType
} from './types';
import { socketService } from './services/socket';
import { audioEffects } from './services/audioEffects';
import { convoySimulation } from './services/simulationEngine';
import { geolocationService } from './services/geolocationService';

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
    socketService.init();

    // Listen to initial full state from backend
    socketService.setOnRideState((state: RideChannel) => {
      setRide(state);
      setRiders(state.riders);
      setAlerts(state.alerts);
      setMessages(state.messages);
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

    // Fetch initial HTTP snapshot if needed
    fetch('http://localhost:5001/api/rides/MUM-GOA')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.code) {
          setRide(data);
          setRiders(data.riders);
          setAlerts(data.alerts || []);
          setMessages(data.messages || []);
        }
      })
      .catch(() => {
        // In case backend is just spinning up, initialize simulation directly
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
        // Optionally stream simulation updates over socket to any other connected browser
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

  // Connect Real Device GPS if selected
  useEffect(() => {
    if (trackingMode === 'device_gps') {
      convoySimulation.pause();
      setIsSimulating(false);

      geolocationService.setOnPositionUpdate((pos) => {
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

  // Focus on specific rider or waypoint
  const handleFocusRider = (riderId: string) => {
    const target = riders.find((r) => r.id === riderId);
    if (target) {
      setCameraMode('free');
    }
  };

  const currentRider = useMemo(() => {
    return riders.find((r) => r.id === profile.id) || riders[0] || null;
  }, [riders, profile.id]);

  const activeWaypoints = ride ? ride.route : [];
  const nextWaypoint = activeWaypoints.length > 6 ? activeWaypoints[6] : null;
  const distanceToDestinationKm = currentRider
    ? Math.max(0, Math.round(550 - (currentRider.distanceCoveredKm || 142)))
    : 408;

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
          onMapClickReportAlert={(lat, lng) => {
            handleTriggerAlert('hazard', 'Reported Hazard Pin', `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }}
        />
      </div>

      {/* Floating Modern CarPlay Style Top Island */}
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
      />

      {/* Speedometer & Convoy Spread Cockpit Card (Top Right) */}
      <CockpitHUD
        currentRider={currentRider}
        packSpreadMeters={packSpreadMeters}
        nextWaypoint={nextWaypoint}
        distanceToDestinationKm={distanceToDestinationKm}
      />

      {/* Tactical Alerts Bar & Big PTT Thumb Button (Bottom Center Dock) */}
      <div className="absolute bottom-6 left-0 right-0 z-20 flex flex-col items-center justify-center px-3 space-y-2.5 pointer-events-none">
        <TacticalAlertsBar
          alerts={alerts}
          onTriggerAlert={handleTriggerAlert}
          onDismissAlert={handleDismissAlert}
        />

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

      {/* Mumbai to Goa Route Schedule Modal */}
      <RouteScheduleModal
        isOpen={isRouteOpen}
        onClose={() => setIsRouteOpen(false)}
        waypoints={activeWaypoints}
        onSelectWaypoint={(wp) => {
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
