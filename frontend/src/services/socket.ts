// Socket.IO Client Wrapper for Riders United Realtime Telemetry & Comms

import { io, Socket } from 'socket.io-client';
import { RideChannel, Rider, TacticalAlert, ChatMessage } from '../types';
import { voiceComms } from './voiceComms';
import { audioEffects } from './audioEffects';
import { getApiBaseUrl } from './apiConfig';

class SocketService {
  private socket: Socket | null = null;
  private connected: boolean = false;
  private currentRideCode: string = 'MUM-GOA';

  // Callbacks
  private onRideStateCallback: ((ride: RideChannel) => void) | null = null;
  private onTelemetryCallback: ((riderId: string, telemetry: Partial<Rider>) => void) | null = null;
  private onBatchTelemetryCallback: ((riders: Rider[]) => void) | null = null;
  private onAlertCallback: ((alert: TacticalAlert, message?: string) => void) | null = null;
  private onAlertDismissedCallback: ((alertId: string) => void) | null = null;
  private onChatCallback: ((message: ChatMessage) => void) | null = null;
  private onRoleChangedCallback: ((data: { riderId: string; newRole: string; ride: RideChannel; message: string }) => void) | null = null;
  private onVoiceIncomingStartCallback: ((data: { riderId: string; callsign: string; channel: string }) => void) | null = null;
  private onVoiceIncomingStopCallback: ((data: { riderId: string; callsign: string; channel: string }) => void) | null = null;
  private onRouteSetCallback: ((route: any, message?: string) => void) | null = null;
  private onConnectionStatusChange: ((status: boolean) => void) | null = null;

  public init() {
    if (this.socket) return;

    // Dynamic resolver: works on localhost, local Wi-Fi LAN, and Native iOS/Android
    const socketUrl = getApiBaseUrl();

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
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

    this.socket.on('telemetry:broadcast', ({ riderId, telemetry }: { riderId: string; telemetry: Partial<Rider> }) => {
      if (this.onTelemetryCallback) this.onTelemetryCallback(riderId, telemetry);
    });

    this.socket.on('telemetry:batch_broadcast', ({ riders }: { riders: Rider[] }) => {
      if (this.onBatchTelemetryCallback) this.onBatchTelemetryCallback(riders);
    });

    this.socket.on('alert:broadcast', ({ alert, message }: { alert: TacticalAlert; message: string }) => {
      audioEffects.playAlertSound(alert.type);
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

  public sendRouteSet(routeData: any) {
    this.emit('route:set', routeData);
  }

  public joinRide(code: string, rider: Partial<Rider>) {
    this.currentRideCode = code.toUpperCase();
    this.emit('ride:join', { code: this.currentRideCode, rider });
  }

  public sendTelemetry(data: Partial<Rider> & { riderId?: string }) {
    this.emit('telemetry:update', data);
  }

  public sendBatchTelemetry(updates: Partial<Rider>[]) {
    this.emit('telemetry:batch', { updates });
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
  public setOnTelemetry(cb: (riderId: string, telemetry: Partial<Rider>) => void) { this.onTelemetryCallback = cb; }
  public setOnBatchTelemetry(cb: (riders: Rider[]) => void) { this.onBatchTelemetryCallback = cb; }
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
