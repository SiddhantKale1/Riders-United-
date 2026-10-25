// Socket.IO Client Wrapper for Riders United Realtime Telemetry & Comms

import { io, Socket } from 'socket.io-client';
import { RideChannel, Rider, TacticalAlert, ChatMessage } from '../types';
import { voiceComms } from './voiceComms';
import { audioEffects } from './audioEffects';
import { getApiBaseUrl } from './apiConfig';

class SocketService {
  private socket: Socket | null = null;
  private connected: boolean = false;
  private currentRideCode: string | null = null;

  // Callbacks
  private onRideStateCallback: ((ride: RideChannel) => void) | null = null;
  private onTelemetryCallback: ((riderId: string, telemetry: Partial<Rider>) => void) | null = null;
  private onAlertCallback: ((alert: TacticalAlert, message?: string) => void) | null = null;
  private onAlertDismissedCallback: ((alertId: string) => void) | null = null;
  private onChatCallback: ((message: ChatMessage) => void) | null = null;
  private onRoleChangedCallback: ((data: { riderId: string; newRole: string; ride: RideChannel; message: string }) => void) | null = null;
  private onVoiceIncomingStartCallback: ((data: { riderId: string; callsign: string; channel: string }) => void) | null = null;
  private onVoiceIncomingStopCallback: ((data: { riderId: string; callsign: string; channel: string }) => void) | null = null;
  private onRouteSetCallback: ((route: any, message?: string) => void) | null = null;
  private onRideStartedCallback: ((data: { ride: RideChannel; message: string }) => void) | null = null;
  private onRideEndedCallback: ((data: { ride: RideChannel; message: string }) => void) | null = null;
  private onRiderJoinedCallback: ((data: { rider: Rider; ride?: RideChannel; message: string }) => void) | null = null;
  private onRiderLeftCallback: ((data: { riderId: string; ride?: RideChannel; message: string }) => void) | null = null;
  private onConnectionStatusChange: ((status: boolean) => void) | null = null;

  public init() {
    if (this.socket) return;

    const socketUrl = getApiBaseUrl();

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      this.connected = true;
      if (this.onConnectionStatusChange) this.onConnectionStatusChange(true);
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      if (this.onConnectionStatusChange) this.onConnectionStatusChange(false);
    });

    // Wire voice transmission
    voiceComms.setSocketEmitter((event, data) => {
      this.emit(event, data);
    });

    // State events
    this.socket.on('ride:state', (ride: RideChannel) => {
      if (this.onRideStateCallback) this.onRideStateCallback(ride);
    });

    this.socket.on('rider:joined', (data) => {
      if (this.onRiderJoinedCallback) this.onRiderJoinedCallback(data);
    });

    this.socket.on('rider:left', (data) => {
      if (this.onRiderLeftCallback) this.onRiderLeftCallback(data);
    });

    this.socket.on('ride:started', (data) => {
      audioEffects.playAlertSound('regroup');
      if (this.onRideStartedCallback) this.onRideStartedCallback(data);
    });

    this.socket.on('ride:ended', (data) => {
      if (this.onRideEndedCallback) this.onRideEndedCallback(data);
    });

    this.socket.on('telemetry:broadcast', ({ riderId, telemetry }: { riderId: string; telemetry: Partial<Rider> }) => {
      if (this.onTelemetryCallback) this.onTelemetryCallback(riderId, telemetry);
    });

    this.socket.on('alert:broadcast', ({ alert, message }: { alert: TacticalAlert; message: string }) => {
      if (this.onAlertCallback) this.onAlertCallback(alert, message);
    });

    this.socket.on('alert:dismissed', ({ alertId }: { alertId: string }) => {
      if (this.onAlertDismissedCallback) this.onAlertDismissedCallback(alertId);
    });

    this.socket.on('chat:broadcast', (msg: ChatMessage) => {
      if (this.onChatCallback) this.onChatCallback(msg);
    });

    this.socket.on('ride:role_changed', (data) => {
      if (this.onRoleChangedCallback) this.onRoleChangedCallback(data);
    });

    // Voice events
    this.socket.on('voice:incoming_start', (data) => {
      audioEffects.playIncomingTransmission();
      if (this.onVoiceIncomingStartCallback) this.onVoiceIncomingStartCallback(data);
    });

    this.socket.on('voice:incoming_chunk', ({ audioBlobBase64 }) => {
      voiceComms.playIncomingAudioChunk(audioBlobBase64);
    });

    this.socket.on('voice:incoming_stop', (data) => {
      audioEffects.playRogerBeep();
      if (this.onVoiceIncomingStopCallback) this.onVoiceIncomingStopCallback(data);
    });

    this.socket.on('route:set_broadcast', ({ activeRoute, message }) => {
      if (this.onRouteSetCallback) this.onRouteSetCallback(activeRoute, message);
    });
  }

  public joinRide(code: string, rider: Partial<Rider>) {
    this.currentRideCode = code.toUpperCase();
    this.emit('ride:join', { code: this.currentRideCode, rider });
  }

  public startConvoyRide() {
    this.emit('ride:start', {});
  }

  public endConvoyRide() {
    this.emit('ride:end', {});
  }

  public sendRouteSet(routeData: any) {
    this.emit('route:set', routeData);
  }

  public sendTelemetry(data: Partial<Rider> & { riderId?: string }) {
    this.emit('telemetry:update', data);
  }

  public sendAlert(alert: Partial<TacticalAlert>) {
    this.emit('alert:create', alert);
  }

  public dismissAlert(alertId: string) {
    this.emit('alert:dismiss', { alertId });
  }

  public sendChat(text: string, senderId: string, senderName: string, type: string = 'chat') {
    this.emit('chat:send', { text, senderId, senderName, type });
  }

  public assignRole(targetRiderId: string, newRole: string) {
    this.emit('ride:assign_role', { targetRiderId, newRole });
  }

  public emit(event: string, data: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  // Setters for listeners
  public setOnRideState(cb: (ride: RideChannel) => void) { this.onRideStateCallback = cb; }
  public setOnRiderJoined(cb: (data: any) => void) { this.onRiderJoinedCallback = cb; }
  public setOnRiderLeft(cb: (data: any) => void) { this.onRiderLeftCallback = cb; }
  public setOnRideStarted(cb: (data: any) => void) { this.onRideStartedCallback = cb; }
  public setOnRideEnded(cb: (data: any) => void) { this.onRideEndedCallback = cb; }
  public setOnTelemetry(cb: (riderId: string, telemetry: Partial<Rider>) => void) { this.onTelemetryCallback = cb; }
  public setOnAlert(cb: (alert: TacticalAlert, message?: string) => void) { this.onAlertCallback = cb; }
  public setOnAlertDismissed(cb: (alertId: string) => void) { this.onAlertDismissedCallback = cb; }
  public setOnChat(cb: (message: ChatMessage) => void) { this.onChatCallback = cb; }
  public setOnRoleChanged(cb: (data: any) => void) { this.onRoleChangedCallback = cb; }
  public setOnVoiceIncomingStart(cb: (data: any) => void) { this.onVoiceIncomingStartCallback = cb; }
  public setOnVoiceIncomingStop(cb: (data: any) => void) { this.onVoiceIncomingStopCallback = cb; }
  public setOnRouteSet(cb: (route: any, message?: string) => void) { this.onRouteSetCallback = cb; }
  public setOnConnectionStatusChange(cb: (status: boolean) => void) { this.onConnectionStatusChange = cb; }
}

export const socketService = new SocketService();
