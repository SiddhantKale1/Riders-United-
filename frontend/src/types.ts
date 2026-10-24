export type RiderRole = 'leader' | 'sweeper' | 'scout' | 'rider';

export interface Rider {
  id: string;
  name: string;
  callsign: string;
  bikeModel: string;
  avatarColor: string;
  role: RiderRole;
  lat: number;
  lng: number;
  heading: number; // 0 - 360
  speed: number; // km/h
  altitude: number; // meters
  battery: number; // percentage
  isOnline: boolean;
  isTalking: boolean;
  lastPing: number;
  distanceFromLeader: number; // meters
  distanceCoveredKm: number;
  channel: string;
}

export type WaypointType = 'start' | 'destination' | 'fuel' | 'food' | 'regroup' | 'scenic' | 'waypoint';

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: WaypointType;
  description?: string;
  distanceFromStartKm?: number;
}

export type AlertType = 'hazard' | 'fuel' | 'police' | 'breakdown' | 'sos' | 'regroup';

export interface TacticalAlert {
  id: string;
  type: AlertType;
  title: string;
  detail: string;
  lat: number;
  lng: number;
  createdBy: string;
  creatorName: string;
  createdAt: number;
  active: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  type: 'chat' | 'system' | 'radio_transcript' | 'alert';
}

export interface RouteManeuver {
  type: string;
  modifier?: string;
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
}

export interface ActiveRoute {
  title: string;
  startName: string;
  destName: string;
  coordinates: [number, number][];
  distanceKm: number;
  durationMinutes: number;
  maneuvers: RouteManeuver[];
  summary?: string;
  fuelStops?: Waypoint[];
}

export interface RideChannel {
  id: string;
  code: string;
  title: string;
  description: string;
  leaderId: string;
  createdAt: number;
  status: 'setup' | 'in-progress' | 'paused' | 'completed';
  targetSpeed: number;
  route: Waypoint[];
  riders: Rider[];
  alerts: TacticalAlert[];
  messages: ChatMessage[];
  activeRoute?: ActiveRoute;
}

export type TrackingMode = 'simulation' | 'device_gps';
export type CameraMode = 'convoy' | 'leader' | 'me' | 'free';
