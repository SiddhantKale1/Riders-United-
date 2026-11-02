import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Compass,
  Users,
  Fuel,
  Bike,
  Navigation,
  Crosshair,
  ArrowRight,
  ArrowLeft,
  Check,
  Search,
  Loader2,
  X,
  Plus,
  LogIn,
  User,
  Radio,
  RefreshCw,
  Gauge,
  MapPin,
  Sparkles,
  Wifi,
  History,
  LogOut,
  Award,
  Clock,
  Server,
  Settings,
  Share2,
  AlertTriangle,
  Volume2,
  Download,
  ShieldCheck,
  Heart,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Star,
  Calendar,
  Map,
  Grid
} from 'lucide-react';
import { RiderRole, ActiveRoute, CompletedRide, AuthUser, Rider, Waypoint, CameraMode, TacticalAlert } from '../types';
import { MapView } from './MapView';
import { routingService, LocationSearchResult, FuelStop } from '../services/routingService';
import { getApiBaseUrl, setApiBaseUrl, testServerConnection, DEFAULT_BACKEND_URL } from '../services/apiConfig';
import { socketService } from '../services/socket';
import { speechService } from '../services/speechService';
import { offlineMapService } from '../services/offlineMapService';

export type MobileTab = 'ride' | 'map' | 'squad' | 'fuel' | 'garage';

interface ClassicMobileAppProps {
  currentProfile: {
    id: string;
    name: string;
    callsign: string;
    bikeModel: string;
    avatarColor: string;
    role: RiderRole;
  };
  onUpdateProfile: (profile: any) => void;
  onCreateGroup: (title: string, targetSpeed: number) => Promise<void>;
  onJoinGroup: (code: string) => Promise<void>;
  onStartSoloRide: (
    start: { name: string; lat: number; lng: number },
    dest: { name: string; lat: number; lng: number }
  ) => Promise<void> | void;
  isConnected: boolean;
  initialTab?: MobileTab;
  initialCode?: string;
  currentGpsCoords?: { lat: number; lng: number } | null;
  authUser?: AuthUser | null;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  onChangePassword?: () => void;
  onRevokeSessions?: () => Promise<void>;
  rideHistory?: CompletedRide[];
  onClearHistory?: () => void;
  onOpenShare?: (code: string) => void;
  onTestCrash?: () => void;
  onOpenCockpit?: () => void;
  activeRoutePath?: [number, number][];
  activeRoute?: ActiveRoute | null;
  riders?: Rider[];
  waypoints?: Waypoint[];
  cameraMode?: CameraMode;
  onSetCameraMode?: (mode: CameraMode) => void;
  isRideActive?: boolean;
  onReplayStartup?: () => void;
  alerts?: TacticalAlert[];
}

const PRESET_COLORS = [
  '#ef4444', // Signal Red
  '#2563eb', // Signal Blue
  '#111827', // Obsidian Black
  '#f59e0b', // Amber Gold
  '#10b981', // Emerald Green
  '#8b5cf6'  // Tactical Purple
];

interface TourWaypoint {
  title: string;
  subtitle: string;
  image: string;
  morning?: string;
  afternoon?: string;
  evening?: string;
  tip?: string;
}

interface TourPackage {
  id: string;
  title: string;
  region: string;
  tag: string;
  distance: string;
  duration: string;
  rating: number;
  reviewsCount: number;
  coverImage: string;
  description: string;
  dest: { name: string; lat: number; lng: number };
  waypoints: TourWaypoint[];
}

const FEATURED_TOURS: TourPackage[] = [
  {
    id: 'ladakh-pangong',
    title: 'Manali ➔ Pangong Tso Lake',
    region: 'Ladakh Trans-Himalayas • 4,350m',
    tag: 'High Passes',
    distance: '475 km',
    duration: '14h ride',
    rating: 5.0,
    reviewsCount: 214,
    coverImage: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=1000&q=80',
    description: 'The ultimate high-altitude pilgrimage across snow-capped Himalayan passes, Rohtang & Khardung La, arriving at the azure glacial waters of Pangong Tso.',
    dest: { name: 'Pangong Tso Lake, Ladakh', lat: 33.7595, lng: 78.6674 },
    waypoints: [
      {
        title: 'Stage 1: Manali Pine Valley Flag-off',
        subtitle: 'Flag-off • 05:00 AM • High Altitude Briefing',
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
        morning: 'Dawn rollout through cedar and pine forests. Check oxygen canisters and carburettor tuning.',
        tip: 'Keep rain gear accessible for sudden mountain weather shifts.'
      },
      {
        title: 'Stage 2: Atal Tunnel & Rohtang Pass',
        subtitle: '50 KM • 08:30 AM • Glacial Viewpoints',
        image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80',
        morning: 'Emerging from the North Portal into the stark grandeur of Chandra Valley.',
        tip: 'Stagger headlights across foggy gorge switchbacks.'
      },
      {
        title: 'Stage 3: Khardung La Mountain Pass (17,982 ft)',
        subtitle: '380 KM • 01:15 PM • Roof of the World',
        image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=400&q=80',
        morning: 'Crest the highest motorable road in the world amidst prayer flags and glacial winds.',
        tip: 'Limit stop to 15 minutes to avoid altitude sickness.'
      },
      {
        title: 'Stage 4: Pangong Tso Glacial Shoreline',
        subtitle: '475 KM • 05:45 PM • Turquoise Sunset Finish',
        image: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=400&q=80',
        evening: 'The world-famous colour-shifting blue saltwater lake surrounded by jagged Himalayan peaks.',
        tip: 'Camp beside the lake shore and photograph the Milky Way.'
      }
    ]
  },
  {
    id: 'munnar-ghats',
    title: 'Munnar & Anamalai Tea Trails',
    region: 'Cardamom Hills • Kerala',
    tag: 'Scenic Ghats',
    distance: '130 km',
    duration: '3.5h ride',
    rating: 4.9,
    reviewsCount: 189,
    coverImage: 'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=1000&q=80',
    description: 'Ride through emerald green tea plantations shrouded in mountain mist, cascading waterfalls, and cool mountain switchbacks rising to Top Station.',
    dest: { name: 'Top Station, Munnar, Kerala', lat: 10.1264, lng: 77.2443 },
    waypoints: [
      {
        title: 'Stage 1: Kochi Coastal Foothills',
        subtitle: '06:00 AM • Rollout',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
        morning: 'Roll out through spice markets and coconut groves as morning fog settles.',
        tip: 'Watch for wet tarmac patches in morning dew.'
      },
      {
        title: 'Stage 2: Cheeyappara Waterfalls Pass',
        subtitle: '55 KM • 08:15 AM • Tea & Waterfall Stop',
        image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&q=80',
        morning: 'Multi-tiered waterfall gushing right beside the mountain road with hot cardamom tea.',
        tip: 'Stay in 2nd gear on steep uphill hairpins.'
      },
      {
        title: 'Stage 3: Top Station Mountain Summit',
        subtitle: '130 KM • 11:30 AM • Panoramic Cloud Valley Finish',
        image: 'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=400&q=80',
        morning: '360-degree viewpoint overlooking the Western Ghats and Tamil Nadu plains.',
        tip: 'Park at the cliffside viewpoint for panoramic photos.'
      }
    ]
  },
  {
    id: 'mumbai-goa',
    title: 'Mumbai ➔ Goa Coastal Run',
    region: 'Western Coast • NH 66',
    tag: 'Coastal Highway',
    distance: '550 km',
    duration: '11h ride',
    rating: 4.9,
    reviewsCount: 142,
    coverImage: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1000&q=80',
    description: 'The legendary coastal highway convoy across the Konkan belt, through twisty mountain ghats, river bridges, and palm-fringed ocean beaches.',
    dest: { name: 'Baga Beach, North Goa', lat: 15.5553, lng: 73.7517 },
    waypoints: [
      {
        title: 'Stage 1: Gateway of India Flag-off',
        subtitle: '05:30 AM • Harbor Assembly',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
        morning: 'Early morning sea breeze assembly and Road Captain convoy briefing.',
        tip: 'Maintain staggered pack formation across highway bridges.'
      },
      {
        title: 'Stage 2: Kashedi Ghats Mountain Pass',
        subtitle: '190 KM • 11:00 AM • Scenic Twisties',
        image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80',
        morning: 'High-camber mountain sweepers and lush valley overlooks.',
        tip: 'Keep headlights on low beam through shaded turns.'
      },
      {
        title: 'Stage 3: Chiplun River Valley Overlook',
        subtitle: '260 KM • 01:30 PM • Refuel & Lunch',
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
        morning: 'Panoramic view of the winding Vashishti River.',
        tip: 'Top up water bladders and inspect chain tension.'
      },
      {
        title: 'Stage 4: Baga Beach Ocean Finish',
        subtitle: '550 KM • 06:45 PM • Sunset Finish Line',
        image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=400&q=80',
        evening: 'Arrive at the ocean shore. Sunset celebration and certificate of completion.',
        tip: 'Park bikes in designated beachfront enclosure.'
      }
    ]
  },
  {
    id: 'jaisalmer-dunes',
    title: 'Jaisalmer Thar Golden Dunes Run',
    region: 'Great Indian Desert • Rajasthan',
    tag: 'Solo Runs',
    distance: '280 km',
    duration: '4.5h ride',
    rating: 4.8,
    reviewsCount: 95,
    coverImage: 'https://images.unsplash.com/photo-1508672019048-805b876b67e2?auto=format&fit=crop&w=1000&q=80',
    description: 'Endless desert highways cutting through golden sand dunes, historic sandstone forts, and mesmerizing desert sunset horizons.',
    dest: { name: 'Sam Sand Dunes, Jaisalmer', lat: 26.8317, lng: 70.5186 },
    waypoints: [
      {
        title: 'Stage 1: Blue City Jodhpur Flag-off',
        subtitle: '06:30 AM • Historic Fortress Rollout',
        image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=400&q=80',
        morning: 'Roll out under the shadow of Mehrangarh Fort onto smooth desert tarmac.',
        tip: 'Hydrate well before reaching arid stretches.'
      },
      {
        title: 'Stage 2: Pokhran Desert Straightaways',
        subtitle: '150 KM • 10:00 AM • Infinite Horizons',
        image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80',
        morning: 'Arrow-straight arrow highways with vast golden sand vistas on either side.',
        tip: 'Watch for sudden crosswinds and crossing camels.'
      },
      {
        title: 'Stage 3: Sam Golden Sand Dunes Finish',
        subtitle: '280 KM • 05:30 PM • Desert Sunset Camp',
        image: 'https://images.unsplash.com/photo-1508672019048-805b876b67e2?auto=format&fit=crop&w=400&q=80',
        evening: 'Golden hour sunset over shifting sand dunes with desert campfire.',
        tip: 'Lower tyre pressures slightly if riding on loose sand edges.'
      }
    ]
  },
  {
    id: 'spiti-valley',
    title: 'Spiti Valley Trans-Himalayan Pass',
    region: 'High Altitude Desert • 3,800m',
    tag: 'High Passes',
    distance: '420 km',
    duration: '12h ride',
    rating: 5.0,
    reviewsCount: 176,
    coverImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1000&q=80',
    description: 'Raw mountain cliffs, ancient thousand-year-old cliffside monasteries, and barren moonscapes tucked deep inside the inner Himalayas.',
    dest: { name: 'Key Monastery, Spiti Valley', lat: 32.2982, lng: 78.0125 },
    waypoints: [
      {
        title: 'Stage 1: Shimla Pine Ridge Rollout',
        subtitle: '06:00 AM • Valley Entry',
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
        morning: 'Climb into Sutlej river gorge towards Kinnaur mountain gate.',
        tip: 'Check engine oil and cold tyre pressures.'
      },
      {
        title: 'Stage 2: Kinnaur Rock Cut Highway',
        subtitle: '180 KM • 11:30 AM • Cliff Overhangs',
        image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80',
        morning: 'Carved stone roadways hanging directly over sheer thousand-foot river drops.',
        tip: 'Maintain low speed and stay alert for falling pebbles.'
      },
      {
        title: 'Stage 3: Key Monastery High Altitude Plateau',
        subtitle: '420 KM • 05:00 PM • Thousand-Year Heritage',
        image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=400&q=80',
        evening: 'Iconic fortress-monastery perched on a conical hill overlooking Spiti river.',
        tip: 'Respect local monastic customs and quiet zones.'
      }
    ]
  },
  {
    id: 'gokarna-coast',
    title: 'Gokarna & Om Beach Coastal Trail',
    region: 'Karavali Coastline • Karnataka',
    tag: 'Coastal Highway',
    distance: '210 km',
    duration: '4h ride',
    rating: 4.8,
    reviewsCount: 112,
    coverImage: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1000&q=80',
    description: 'Ride along cliffside Arabian Sea roads overlooking golden rocky coves, secluded turquoise beaches, and historic coastal temples.',
    dest: { name: 'Om Beach, Gokarna, Karnataka', lat: 14.5204, lng: 74.3168 },
    waypoints: [
      {
        title: 'Stage 1: Karwar Harbor Rollout',
        subtitle: '06:30 AM • Coastal Breeze Start',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
        morning: 'Roll out alongside the blue waters of Kali river estuary.',
        tip: 'Clean visor regularly from salty sea spray.'
      },
      {
        title: 'Stage 2: Mirjan Fort Heritage Stop',
        subtitle: '90 KM • 09:00 AM • Ancient Stone Ramparts',
        image: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=400&q=80',
        morning: 'Explore 16th-century laterite fort nestled amidst towering coconut groves.',
        tip: 'Hydrate well before coastal noon heat.'
      },
      {
        title: 'Stage 3: Om Beach Rocky Horizon Finish',
        subtitle: '210 KM • 12:30 PM • Sacred Coastline',
        image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=400&q=80',
        morning: 'Iconic Om-shaped naturally carved bay with crashing ocean waves.',
        tip: 'Park at clifftop cafe overlooking the waves.'
      }
    ]
  },
  {
    id: 'lonavala-ghats',
    title: 'Lonavala & Tiger Point Misty Ghats',
    region: 'Sahyadri Ridges • Maharashtra',
    tag: 'Scenic Ghats',
    distance: '85 km',
    duration: '1.5h ride',
    rating: 4.8,
    reviewsCount: 96,
    coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
    description: 'Classic weekend twisties climb through Khandala Ghats to Tiger Point, with misty mountain canyons and panoramic cloud inversions.',
    dest: { name: 'Tiger Point, Lonavala Ghats', lat: 18.7557, lng: 73.4091 },
    waypoints: [
      {
        title: 'Stage 1: Highway Toll Plaza Dawn Rollout',
        subtitle: '06:00 AM • Assembly',
        image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80',
        morning: 'Dawn rollout from toll gate with cool morning mountain air.',
        tip: 'Watch for wet tarmac patches in morning fog.'
      },
      {
        title: 'Stage 2: Khandala Hairpin Curves',
        subtitle: '07:15 AM • Elevation Climb',
        image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&q=80',
        morning: 'Steep incline cornering with panoramic highway canyon views.',
        tip: 'Stay in 2nd/3rd gear for instant throttle response.'
      },
      {
        title: 'Stage 3: Tiger Point Cliff Edge Finish',
        subtitle: '08:30 AM • Finish & Hot Chai',
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
        morning: 'Hot corn bhajiyas, chai and misty cliff views overlooking the valley.',
        tip: 'Regroup in designated viewpoint parking.'
      }
    ]
  },
  {
    id: 'rann-kutch',
    title: 'Rann of Kutch Endless White Horizon',
    region: 'Salt Plains • Gujarat',
    tag: 'Solo Runs',
    distance: '320 km',
    duration: '5h ride',
    rating: 4.9,
    reviewsCount: 134,
    coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
    description: 'Ride out to the infinite white salt desert where the bleached horizon blurs seamlessly into azure skies under glowing sunset hues.',
    dest: { name: 'White Rann of Kutch, Gujarat', lat: 23.7845, lng: 69.5135 },
    waypoints: [
      {
        title: 'Stage 1: Bhuj Historic Gate Flag-off',
        subtitle: '07:00 AM • Palace Town Rollout',
        image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=400&q=80',
        morning: 'Roll through ancient arched gateways onto smooth desert corridor.',
        tip: 'Carry plenty of drinking water.'
      },
      {
        title: 'Stage 2: Tropic of Cancer Marker',
        subtitle: '120 KM • 10:15 AM • Geographic Landmark',
        image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80',
        morning: 'Commemorative marker crossing the official Tropic of Cancer line.',
        tip: 'High heat index; wear UV protective riding gear.'
      },
      {
        title: 'Stage 3: White Desert Tent City Finish',
        subtitle: '320 KM • 05:45 PM • White Salt Sunset',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
        evening: 'Walk onto the crystallized white salt crust under a pink and purple twilight sky.',
        tip: 'Wear tinted sunglasses against harsh salt glare.'
      }
    ]
  },
  {
    id: 'coorg-hills',
    title: 'Coorg Rainforest & Coffee Trails',
    region: 'Western Ghats • Karnataka',
    tag: 'Scenic Ghats',
    distance: '120 km',
    duration: '3h ride',
    rating: 4.8,
    reviewsCount: 88,
    coverImage: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1000&q=80',
    description: 'Dense rainforest roads flanked by blooming coffee plants, spice plantations, and misty mountain viewpoints at Mandalpatti Peak.',
    dest: { name: 'Mandalpatti Peak, Coorg', lat: 12.4833, lng: 75.7167 },
    waypoints: [
      {
        title: 'Stage 1: Madikeri Coffee Plantation Entry',
        subtitle: '06:30 AM • Spice Canopy Start',
        image: 'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=400&q=80',
        morning: 'Deep forest canopy with rich scents of arabica coffee and black pepper.',
        tip: 'Watch for wet leaf litter on corners.'
      },
      {
        title: 'Stage 2: Mandalpatti Peak Ridge Finish',
        subtitle: '120 KM • 10:45 AM • Cloud Horizon',
        image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&q=80',
        morning: 'Rugged jeep track trail culminating in rolling Sahyadri grassland peaks.',
        tip: 'Maintain stand-up riding posture over rocky stretches.'
      }
    ]
  },
  {
    id: 'lavasa-lake',
    title: 'Lavasa Valley Lake Switchbacks',
    region: 'Temghar Valley • Maharashtra',
    tag: 'Scenic Ghats',
    distance: '65 km',
    duration: '1.2h ride',
    rating: 4.7,
    reviewsCount: 74,
    coverImage: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1000&q=80',
    description: 'Continuous asphalt switchbacks winding around Temghar Dam reservoir, with pristine lake reflections and waterfront cafes.',
    dest: { name: 'Lavasa Lake Promenade, Maharashtra', lat: 18.4102, lng: 73.5074 },
    waypoints: [
      {
        title: 'Stage 1: Temghar Dam Viewpoint',
        subtitle: '07:00 AM • Reservoir Valley Entry',
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
        morning: 'Entry into the scenic valley corridor along the shimmering reservoir.',
        tip: 'Watch for occasional stray gravel.'
      },
      {
        title: 'Stage 2: Waterfront Promenade Finish',
        subtitle: '08:45 AM • Italian Style Lake Arrival',
        image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=400&q=80',
        morning: 'Waterfront promenade parking and fresh morning espresso break.',
        tip: 'Check tyre pressures before return descent.'
      }
    ]
  }
];

const DEFAULT_MUMBAI_GOA_COORDS: [number, number][] = [
  [18.9220, 72.8347],
  [18.9000, 72.8200],
  [18.7557, 73.4091],
  [18.4500, 73.4500],
  [18.1500, 73.3400],
  [17.7200, 73.5300],
  [17.3000, 73.4000],
  [17.0000, 73.3000],
  [16.1500, 73.7000],
  [15.5553, 73.7517]
];

const DEFAULT_WAYPOINTS: Waypoint[] = [
  { id: 'wp-start', name: 'Gateway of India, Mumbai', lat: 18.9220, lng: 72.8347, type: 'start' },
  { id: 'wp-fuel-1', name: 'Mangaon Dhaba & IndianOil', lat: 18.1500, lng: 73.3400, type: 'fuel', description: 'Mandatory refuel point' },
  { id: 'wp-dest', name: 'Baga Beach, Goa', lat: 15.5553, lng: 73.7517, type: 'destination' }
];

export const ClassicMobileApp: React.FC<ClassicMobileAppProps> = ({
  currentProfile,
  onUpdateProfile,
  onCreateGroup,
  onJoinGroup,
  onStartSoloRide,
  isConnected,
  initialTab = 'ride',
  initialCode = '',
  currentGpsCoords,
  authUser = null,
  onOpenAuth,
  onSignOut,
  onChangePassword,
  onRevokeSessions,
  rideHistory = [],
  onClearHistory,
  onOpenShare,
  onTestCrash,
  onOpenCockpit,
  activeRoutePath,
  activeRoute,
  riders = [],
  waypoints = [],
  cameraMode: propCameraMode,
  onSetCameraMode,
  isRideActive = false,
  onReplayStartup,
  alerts = []
}) => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<MobileTab>(initialTab);
  const [internalCameraMode, setInternalCameraMode] = useState<CameraMode>('me');
  const effectiveCameraMode = propCameraMode || internalCameraMode;
  const effectiveSetCameraMode = onSetCameraMode || setInternalCameraMode;

  const effectiveRoutePath = (activeRoutePath && activeRoutePath.length > 1)
    ? activeRoutePath
    : (activeRoute?.coordinates && activeRoute.coordinates.length > 1)
    ? activeRoute.coordinates
    : DEFAULT_MUMBAI_GOA_COORDS;

  const effectiveWaypoints = (waypoints && waypoints.length > 0)
    ? waypoints
    : DEFAULT_WAYPOINTS;

  const effectiveRiders: Rider[] = (riders && riders.length > 0)
    ? riders
    : [
        {
          id: currentProfile.id,
          name: currentProfile.name,
          callsign: currentProfile.callsign,
          bikeModel: currentProfile.bikeModel,
          avatarColor: currentProfile.avatarColor,
          role: currentProfile.role,
          lat: currentGpsCoords?.lat || 18.9220,
          lng: currentGpsCoords?.lng || 72.8347,
          heading: 45,
          speed: 0,
          altitude: 12,
          battery: 100,
          isOnline: true,
          isTalking: false,
          lastPing: Date.now(),
          distanceFromLeader: 0,
          distanceCoveredKm: 0,
          channel: 'convoy-main'
        }
      ];
  const [selectedTourDetail, setSelectedTourDetail] = useState<TourPackage | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [savedFavorites, setSavedFavorites] = useState<string[]>(['mumbai-goa']);
  const [expandedWaypointIdx, setExpandedWaypointIdx] = useState<number>(0);
  const [detailActiveTab, setDetailActiveTab] = useState<'schedule' | 'fuel' | 'squad'>('schedule');

  // Sync initial tab when changed externally
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Profile Edit State
  const [profileName, setProfileName] = useState(currentProfile.name);
  const [profileCallsign, setProfileCallsign] = useState(currentProfile.callsign);
  const [profileBike, setProfileBike] = useState(currentProfile.bikeModel);
  const [profileColor, setProfileColor] = useState(currentProfile.avatarColor);
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  // Squad Sub-mode: 'join' | 'create'
  const [squadMode, setSquadMode] = useState<'join' | 'create'>('join');
  const [joinCode, setJoinCode] = useState(initialCode);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [createTitle, setCreateTitle] = useState('');
  const [targetSpeed, setTargetSpeed] = useState(75);
  const [isCreating, setIsCreating] = useState(false);

  // Ride Route Search State
  const [gpsAddress, setGpsAddress] = useState<string>('');
  const [startQuery, setStartQuery] = useState('My Current Location');
  const [destQuery, setDestQuery] = useState('');
  const [selectedStart, setSelectedStart] = useState<{ name: string; lat: number; lng: number } | null>(
    currentGpsCoords
      ? { name: 'My Current Location', lat: currentGpsCoords.lat, lng: currentGpsCoords.lng }
      : { name: 'My Current Location', lat: 18.5204, lng: 73.8567 }
  );
  const [selectedDest, setSelectedDest] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [destSuggestions, setDestSuggestions] = useState<LocationSearchResult[]>([]);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [isStartingSolo, setIsStartingSolo] = useState(false);
  const [showCustomRouteCard, setShowCustomRouteCard] = useState(false);
  const destDebounceRef = useRef<any>(null);

  // Fuel Radar State
  const [nearbyFuelStops, setNearbyFuelStops] = useState<FuelStop[]>([]);
  const [isLoadingFuel, setIsLoadingFuel] = useState(false);

  // Server Host Config State
  const [garageServerUrl, setGarageServerUrl] = useState(getApiBaseUrl());
  const [isTestingGarageServer, setIsTestingGarageServer] = useState(false);
  const [garageServerStatus, setGarageServerStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleSaveGarageServer = async () => {
    setIsTestingGarageServer(true);
    setGarageServerStatus(null);
    const res = await testServerConnection(garageServerUrl);
    setIsTestingGarageServer(false);
    setGarageServerStatus(res);
    if (res.success) {
      setApiBaseUrl(garageServerUrl);
      socketService.reconnect();
    }
  };

  const handleResetGarageServer = () => {
    setGarageServerUrl(DEFAULT_BACKEND_URL);
    setApiBaseUrl(DEFAULT_BACKEND_URL);
    socketService.reconnect();
    setGarageServerStatus({ success: true, message: `Reset to default: ${DEFAULT_BACKEND_URL}` });
  };

  // Emergency Contact & Prompts
  const [emergencyPhone, setEmergencyPhone] = useState(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('riders_emergency_phone') || '' : '';
  });
  const [bloodGroup, setBloodGroup] = useState(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('riders_blood_group') || 'O+' : 'O+';
  });
  const [spokenPrompts, setSpokenPrompts] = useState(() => speechService.getIsEnabled());
  const [cachedTileCount, setCachedTileCount] = useState<number>(0);
  const [isCachingMap, setIsCachingMap] = useState<boolean>(false);
  const [cacheProgress, setCacheProgress] = useState<number>(0);

  useEffect(() => {
    offlineMapService.getCachedCount().then(setCachedTileCount);
  }, []);

  const handleToggleSpokenPrompts = () => {
    const next = !spokenPrompts;
    setSpokenPrompts(next);
    speechService.setEnabled(next);
    if (next) {
      speechService.speak('Spoken convoy alerts enabled.');
    }
  };

  const handleSaveIceInfo = () => {
    localStorage.setItem('riders_emergency_phone', emergencyPhone);
    localStorage.setItem('riders_blood_group', bloodGroup);
    setProfileSavedToast(true);
    setTimeout(() => setProfileSavedToast(false), 2000);
  };

  const handleDownloadOfflineRoute = async () => {
    setIsCachingMap(true);
    setCacheProgress(0);
    const corridorPoints: [number, number][] = [
      [18.922, 72.8346],
      [18.7557, 73.4091],
      [18.1500, 73.3400],
      [17.7200, 73.5300],
      [17.0000, 73.3000],
      [16.1500, 73.7000],
      [15.5500, 73.7500]
    ];
    await offlineMapService.downloadRouteTiles(corridorPoints, (percent) => {
      setCacheProgress(percent);
    });
    const count = await offlineMapService.getCachedCount();
    setCachedTileCount(count);
    setIsCachingMap(false);
  };

  // Reverse geocode live GPS to enhance location label
  useEffect(() => {
    if (currentGpsCoords) {
      setSelectedStart({
        name: 'My Current Location',
        lat: currentGpsCoords.lat,
        lng: currentGpsCoords.lng
      });

      routingService.reverseGeocode(currentGpsCoords.lat, currentGpsCoords.lng).then((addr) => {
        if (addr) {
          const parts = addr.split(',').slice(0, 2).map((s) => s.trim()).join(', ');
          setGpsAddress(parts);
          const resolvedText = `My Current Location (${parts})`;
          setSelectedStart({
            name: resolvedText,
            lat: currentGpsCoords.lat,
            lng: currentGpsCoords.lng
          });
          setStartQuery(resolvedText);
        }
      });
    }
  }, [currentGpsCoords]);

  // Load nearby fuel stops on GPS update or fuel tab select
  useEffect(() => {
    const lat = currentGpsCoords ? currentGpsCoords.lat : 18.5204;
    const lng = currentGpsCoords ? currentGpsCoords.lng : 73.8567;
    setIsLoadingFuel(true);
    routingService.getNearbyFuelStops(lat, lng).then((stops) => {
      setNearbyFuelStops(stops);
      setIsLoadingFuel(false);
    });
  }, [currentGpsCoords, activeTab]);

  const getCurrentLocationLabel = () => {
    return gpsAddress ? `My Current Location (${gpsAddress})` : 'My Current Location';
  };

  const handleDestInputChange = (val: string) => {
    setDestQuery(val);
    setSelectedDest(null);
    if (destDebounceRef.current) clearTimeout(destDebounceRef.current);

    if (!startQuery.trim()) {
      const loc = getCurrentLocationLabel();
      setStartQuery(loc);
      if (currentGpsCoords) {
        setSelectedStart({ name: loc, lat: currentGpsCoords.lat, lng: currentGpsCoords.lng });
      }
    }

    if (val.trim().length >= 3) {
      destDebounceRef.current = setTimeout(async () => {
        setIsSearchingDest(true);
        const results = await routingService.searchPlaces(val);
        setDestSuggestions(results);
        setIsSearchingDest(false);
      }, 350);
    } else {
      setDestSuggestions([]);
    }
  };

  const handleSelectDestSuggestion = (item: LocationSearchResult) => {
    const locText = getCurrentLocationLabel();
    setStartQuery(locText);
    setSelectedStart(
      currentGpsCoords
        ? { name: locText, lat: currentGpsCoords.lat, lng: currentGpsCoords.lng }
        : { name: locText, lat: 18.5204, lng: 73.8567 }
    );
    setSelectedDest(item);
    setDestQuery(item.name);
    setDestSuggestions([]);
  };

  const handleRouteToFuelStop = (stop: FuelStop) => {
    const locText = getCurrentLocationLabel();
    setStartQuery(locText);
    setSelectedStart(
      currentGpsCoords
        ? { name: locText, lat: currentGpsCoords.lat, lng: currentGpsCoords.lng }
        : { name: locText, lat: 18.5204, lng: 73.8567 }
    );
    setSelectedDest({ name: stop.name, lat: stop.lat, lng: stop.lng });
    setDestQuery(stop.name);
    setActiveTab('ride');
    setShowCustomRouteCard(true);
  };

  const handleLaunchSoloRide = async (overrideDest?: { name: string; lat: number; lng: number }) => {
    let startPoint = selectedStart;
    if (!startPoint) {
      if (currentGpsCoords) {
        startPoint = {
          name: getCurrentLocationLabel(),
          lat: currentGpsCoords.lat,
          lng: currentGpsCoords.lng
        };
      } else {
        startPoint = { name: 'My Current Location (GPS)', lat: 18.5204, lng: 73.8567 };
      }
    }

    const destination = overrideDest || selectedDest;

    if (!destination) {
      if (destQuery.trim().length >= 3) {
        setIsStartingSolo(true);
        const results = await routingService.searchPlaces(destQuery.trim());
        if (results && results.length > 0) {
          const dest = results[0];
          setSelectedDest(dest);
          await onStartSoloRide(startPoint, dest);
        } else {
          alert('Could not find destination. Please pick a corridor or enter a valid city.');
        }
        setIsStartingSolo(false);
      } else {
        // Automatically start the Mumbai ➔ Goa coastal tour corridor
        const defaultDest = { name: 'Baga Beach, North Goa', lat: 15.5553, lng: 73.7517 };
        setIsStartingSolo(true);
        await onStartSoloRide(startPoint, defaultDest);
        setIsStartingSolo(false);
      }
      return;
    }

    setIsStartingSolo(true);
    await onStartSoloRide(startPoint, destination);
    setIsStartingSolo(false);
  };

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSavedFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      name: profileName.trim() || 'Rider',
      callsign: profileCallsign.trim() || 'Solo Rider',
      bikeModel: profileBike.trim() || 'Motorcycle',
      avatarColor: profileColor
    });
    setProfileSavedToast(true);
    setTimeout(() => setProfileSavedToast(false), 2500);
  };

  const handleSubmitJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setJoinError('Enter the ride code from your Road Captain.');
      return;
    }
    setIsJoining(true);
    setJoinError(null);
    try {
      await onJoinGroup(joinCode.trim().toUpperCase());
    } catch (err: any) {
      const isFetchErr = err?.message?.toLowerCase().includes('fetch') || err?.name === 'TypeError';
      if (isFetchErr) {
        setJoinError(`Cannot connect to server at ${getApiBaseUrl()}. Check Wi-Fi or update Server IP in Garage.`);
      } else {
        setJoinError(err?.message || 'Could not find convoy squad. Verify code.');
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = createTitle.trim() || `${currentProfile.callsign}'s Squad`;
    setIsCreating(true);
    try {
      await onCreateGroup(title, targetSpeed);
    } catch (err: any) {
      const isFetchErr = err?.message?.toLowerCase().includes('fetch') || err?.name === 'TypeError';
      alert(isFetchErr ? `Cannot connect to server at ${getApiBaseUrl()}. Check Wi-Fi or update Server IP in Garage.` : (err?.message || 'Failed to create convoy squad.'));
    } finally {
      setIsCreating(false);
    }
  };

  // Dynamic random destination seed
  const [randomSeed, setRandomSeed] = useState<number>(() => Math.floor(Math.random() * 100));

  // Filter tours by category
  const filteredTours = useMemo(() => {
    return FEATURED_TOURS.filter((tour) => {
      if (selectedCategory === 'All') return true;
      if (selectedCategory === 'Coastal') return tour.tag === 'Coastal Highway';
      if (selectedCategory === 'Ghats') return tour.tag === 'Scenic Ghats' || tour.tag === 'Mountain Curves';
      if (selectedCategory === 'High Passes') return tour.tag === 'High Passes';
      if (selectedCategory === 'Solo') return tour.tag === 'Solo Runs';
      return true;
    });
  }, [selectedCategory]);

  // Dynamic Featured Hero Destination (shuffled or randomized across category)
  const heroTour = useMemo(() => {
    if (filteredTours.length === 0) return FEATURED_TOURS[0];
    const index = Math.abs(randomSeed) % filteredTours.length;
    return filteredTours[index];
  }, [filteredTours, randomSeed]);

  // Carousel suggestions (remaining tours in active category)
  const carouselTours = useMemo(() => {
    const others = filteredTours.filter((tour) => tour.id !== heroTour.id);
    return others.length > 0 ? others : filteredTours;
  }, [filteredTours, heroTour]);

  return (
    <div className="mobile-app-viewport w-full min-h-dvh bg-[#0d0f14] flex justify-center items-stretch sm:items-center overflow-hidden">
      {/* Sleek Mobile Frame */}
      <div className="mobile-app-shell w-full max-w-[430px] h-full sm:h-[92dvh] sm:max-h-[900px] flex flex-col bg-[#F7F8FA] text-[#111827] font-sans relative overflow-hidden sm:rounded-[42px] sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] sm:border sm:border-gray-800/20">

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* VIEW A: TOUR SCHEDULE & ROUTE DETAIL VIEW (MATCHES SCREEN 3)           */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {selectedTourDetail ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white animate-fadeIn">
            {/* Top Navigation Bar */}
            <div className="px-5 pt-4 pb-3 flex items-center justify-between shrink-0 border-b border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedTourDetail(null)}
                className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-200/80 flex items-center justify-center text-gray-800 hover:bg-gray-50 active:scale-95 transition-all"
                title="Back to Discovery"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="text-center px-2 truncate">
                <h1 className="text-base font-bold text-gray-900 truncate tracking-tight">
                  {selectedTourDetail.title}
                </h1>
                <p className="text-xs text-gray-400 font-medium tracking-tight">
                  {selectedTourDetail.distance} • {selectedTourDetail.duration}
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => toggleFavorite(selectedTourDetail.id, e)}
                className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-200/80 flex items-center justify-center text-gray-800 hover:bg-gray-50 active:scale-95 transition-all"
                title="Save Tour"
              >
                <Heart
                  className={`w-5 h-5 ${
                    savedFavorites.includes(selectedTourDetail.id)
                      ? 'fill-red-500 text-red-500'
                      : 'text-gray-700'
                  }`}
                />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Segmented Pill Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <button
                  type="button"
                  onClick={() => setDetailActiveTab('schedule')}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    detailActiveTab === 'schedule'
                      ? 'bg-[#18191D] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
                  }`}
                >
                  Tour schedule
                </button>
                <button
                  type="button"
                  onClick={() => setDetailActiveTab('fuel')}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    detailActiveTab === 'fuel'
                      ? 'bg-[#18191D] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
                  }`}
                >
                  Corridor Fuel
                </button>
                <button
                  type="button"
                  onClick={() => setDetailActiveTab('squad')}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    detailActiveTab === 'squad'
                      ? 'bg-[#18191D] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
                  }`}
                >
                  Convoy squad
                </button>
              </div>

              {/* Tab Content: Tour Schedule (Matches Screen 3 Waypoint Accordion) */}
              {detailActiveTab === 'schedule' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-900">
                      {selectedTourDetail.waypoints.length}-Stage Route Adventure
                    </h2>
                    <span className="text-xs text-gray-500 font-medium">
                      GPS Waypoints
                    </span>
                  </div>

                  {/* Waypoint Accordion Cards */}
                  <div className="space-y-3">
                    {selectedTourDetail.waypoints.map((wp, idx) => {
                      const isExpanded = expandedWaypointIdx === idx;

                      return (
                        <div
                          key={idx}
                          className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden transition-all duration-200"
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedWaypointIdx(isExpanded ? -1 : idx)}
                            className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-gray-50/60 transition-colors"
                          >
                            <img
                              src={wp.image}
                              alt={wp.title}
                              className="w-14 h-14 rounded-xl object-cover shrink-0 bg-gray-100"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80';
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] font-semibold tracking-wider uppercase text-gray-400 block">
                                Stage {idx + 1}
                              </span>
                              <h3 className="text-sm font-bold text-gray-900 truncate leading-snug">
                                {wp.title}
                              </h3>
                              <p className="text-xs text-gray-500 truncate mt-0.5">
                                {wp.subtitle}
                              </p>
                            </div>
                            <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-700" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </button>

                          {/* Expanded Content Details */}
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-1 border-t border-gray-100 text-xs text-gray-600 space-y-2.5 animate-fadeIn">
                              {wp.morning && (
                                <div>
                                  <span className="font-semibold text-gray-900 block text-[11px]">
                                    Rollout & Morning Pace
                                  </span>
                                  <p className="text-gray-500 mt-0.5 leading-relaxed">{wp.morning}</p>
                                </div>
                              )}
                              {wp.afternoon && (
                                <div>
                                  <span className="font-semibold text-gray-900 block text-[11px]">
                                    Midway Sector
                                  </span>
                                  <p className="text-gray-500 mt-0.5 leading-relaxed">{wp.afternoon}</p>
                                </div>
                              )}
                              {wp.evening && (
                                <div>
                                  <span className="font-semibold text-gray-900 block text-[11px]">
                                    Sunset & Regroup
                                  </span>
                                  <p className="text-gray-500 mt-0.5 leading-relaxed">{wp.evening}</p>
                                </div>
                              )}
                              {wp.tip && (
                                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100 text-amber-900 text-[11px]">
                                  <span className="font-bold">Captain's Brief: </span>
                                  <span>{wp.tip}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab Content: Corridor Fuel */}
              {detailActiveTab === 'fuel' && (
                <div className="space-y-3">
                  <h2 className="text-base font-bold text-gray-900">
                    Fuel Stops Along Corridor
                  </h2>
                  <div className="space-y-2">
                    {nearbyFuelStops.slice(0, 5).map((stop, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-white rounded-2xl border border-gray-150 shadow-sm flex items-center justify-between"
                      >
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">{stop.name}</h4>
                          <p className="text-xs text-gray-500">{stop.description}</p>
                          <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                            {stop.distanceFromStartKm} km into run
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRouteToFuelStop(stop)}
                          className="px-3 py-1.5 rounded-full bg-[#18191D] text-white text-xs font-semibold hover:bg-black transition-all"
                        >
                          Route
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab Content: Convoy Squad */}
              {detailActiveTab === 'squad' && (
                <div className="space-y-4">
                  <h2 className="text-base font-bold text-gray-900">
                    Stage Squad for this Route
                  </h2>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-3">
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Create a dedicated telemetry squad with live GPS tracking, PTT radio comms, and Road Captain role assignment.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCreateTitle(`${selectedTourDetail.title} Squad`);
                        setSquadMode('create');
                        setActiveTab('squad');
                        setSelectedTourDetail(null);
                      }}
                      className="w-full py-3 rounded-full bg-[#18191D] text-white font-semibold text-xs hover:bg-black shadow-sm transition-all"
                    >
                      Stage Squad as Road Captain
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Bottom Floating CTA Button (Matches Screen 3 Book a Tour) */}
            <div className="p-4 bg-white/95 backdrop-blur border-t border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => handleLaunchSoloRide(selectedTourDetail.dest)}
                disabled={isStartingSolo}
                className="w-full py-4 px-6 rounded-full bg-[#18191D] hover:bg-black text-white font-semibold text-sm shadow-xl active:scale-[0.99] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isStartingSolo ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Calculating Satellite Path...</span>
                  </>
                ) : (
                  <>
                    <span>Start Navigation to Destination</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════════════════ */
          /* VIEW B: MAIN APP WITH TABS (SCREEN 1 & 2 BASELINE)                     */
          /* ══════════════════════════════════════════════════════════════════════ */
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* TAB 1: RIDE / DISCOVERY (SCREEN 1)                                */}
            {/* ───────────────────────────────────────────────────────────────── */}
            {activeTab === 'ride' && (
              <main className="mobile-app-content flex-1 overflow-y-auto no-scrollbar px-5 pt-4 pb-24 space-y-5">
                {/* 1. Header: Greeting & Profile Avatar (Matches Screen 1) */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
                      Hello, {currentProfile.name.split(' ')[0] || 'Rider'}
                    </h1>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                      Welcome to Riders United
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!authUser && onOpenAuth && (
                      <button
                        type="button"
                        onClick={onOpenAuth}
                        className="px-3.5 py-1.5 rounded-full bg-[#18191D] text-white text-[11px] font-semibold hover:bg-black transition-all shadow-sm"
                      >
                        Sign In
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveTab('garage')}
                      className="relative w-10 h-10 rounded-full bg-white shadow-sm border border-gray-200/80 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-gray-300 transition-all"
                      title="Open Garage & Profile"
                    >
                      {authUser?.picture ? (
                        <img src={authUser.picture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: currentProfile.avatarColor }}
                        >
                          {currentProfile.name.charAt(0)}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                    </button>
                  </div>
                </div>

                {/* 2. Rounded Pill Search Bar with Filter Icon (Matches Screen 1) */}
                <div className="relative">
                  <div className="flex items-center gap-2 bg-white rounded-full px-4 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-200/70">
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={destQuery}
                      onChange={(e) => handleDestInputChange(e.target.value)}
                      placeholder="Search destination, corridor, ghats..."
                      className="w-full bg-transparent text-xs text-gray-800 placeholder-gray-400 font-medium focus:outline-none"
                    />
                    {isSearchingDest ? (
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin shrink-0" />
                    ) : destQuery ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDestQuery('');
                          setSelectedDest(null);
                          setDestSuggestions([]);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setShowCustomRouteCard(!showCustomRouteCard)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        showCustomRouteCard
                          ? 'bg-black text-white ring-2 ring-gray-400'
                          : 'bg-[#18191D] text-white hover:bg-black'
                      }`}
                      title="Toggle Custom Point A to Point B"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Autocomplete Suggestions Dropdown */}
                  {destSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-150 z-30 max-h-56 overflow-y-auto divide-y divide-gray-100">
                      {destSuggestions.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectDestSuggestion(item)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-2.5 transition-colors"
                        >
                          <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <div className="truncate">
                            <span className="text-xs font-semibold text-gray-900 block truncate">
                              {item.name.split(',')[0]}
                            </span>
                            <span className="text-[10px] text-gray-400 truncate block">
                              {item.name}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Optional Custom Point A ➔ Point B Routing Drawer */}
                {showCustomRouteCard && (
                  <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-150 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                      <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-blue-600" />
                        <span>Custom Route Navigation</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const loc = getCurrentLocationLabel();
                          setStartQuery(loc);
                          if (currentGpsCoords) {
                            setSelectedStart({ name: loc, lat: currentGpsCoords.lat, lng: currentGpsCoords.lng });
                          }
                        }}
                        className="text-[10px] font-semibold text-blue-600 flex items-center gap-1 hover:underline"
                      >
                        <Crosshair className="w-3 h-3" />
                        <span>Live GPS</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="relative">
                        <span className="absolute left-3 top-3 w-2 h-2 rounded-full bg-blue-600" />
                        <input
                          type="text"
                          value={startQuery}
                          onChange={(e) => setStartQuery(e.target.value)}
                          placeholder="Point A (Current Location)"
                          className="w-full bg-gray-50 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-800 font-medium border border-gray-200/80 focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-3 w-2 h-2 rounded-full bg-red-500" />
                        <input
                          type="text"
                          value={destQuery}
                          onChange={(e) => handleDestInputChange(e.target.value)}
                          placeholder="Point B (Destination)"
                          className="w-full bg-gray-50 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-800 font-medium border border-gray-200/80 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLaunchSoloRide()}
                      disabled={isStartingSolo}
                      className="w-full py-3 rounded-full bg-[#18191D] hover:bg-black text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isStartingSolo ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Routing...</span>
                        </>
                      ) : (
                        <>
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Launch Solo Navigation</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* 2.5 Live Motorcycle GPS Radar & Map Preview Card */}
                <div className="bg-white rounded-[28px] p-3.5 shadow-sm border border-gray-150 space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs font-bold text-gray-900 tracking-tight">
                        Live Motorcycle GPS Radar
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('map')}
                      className="text-[11px] font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors"
                    >
                      <span>Full Map</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Interactive Map Container */}
                  <div className="relative w-full h-56 rounded-2xl overflow-hidden border border-gray-200/80 shadow-inner">
                    <MapView
                      riders={effectiveRiders}
                      waypoints={effectiveWaypoints}
                      currentRiderId={currentProfile.id}
                      cameraMode={effectiveCameraMode}
                      onSetCameraMode={effectiveSetCameraMode}
                      activeRoutePath={effectiveRoutePath}
                      isRideActive={isRideActive}
                      startPoint={currentGpsCoords || { lat: 18.9220, lng: 72.8347 }}
                      alerts={alerts}
                    />

                    {/* Google Maps Style Route Badge on Top Left */}
                    <div className="absolute top-2.5 left-2.5 z-10 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full shadow-md border border-gray-200/80 flex items-center gap-2 pointer-events-none">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                      <span className="text-[10px] font-bold text-gray-800">
                        {currentProfile.callsign} • {currentProfile.bikeModel.split(' ')[0]}
                      </span>
                    </div>

                    {/* Quick Launch Cockpit on Bottom Right */}
                    <div className="absolute bottom-2.5 right-2.5 z-10 pointer-events-auto">
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenCockpit) {
                            onOpenCockpit();
                          } else {
                            setActiveTab('map');
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-full bg-[#18191DEE] hover:bg-black backdrop-blur-md text-white text-[11px] font-semibold shadow-lg flex items-center gap-1.5 transition-transform active:scale-95"
                      >
                        <Navigation className="w-3 h-3 text-blue-400" />
                        <span>Launch Cockpit</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Category Filter Tabs: Select your next trip (Matches Screen 1) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-900 tracking-tight">
                      Select your next ride
                    </h2>
                    <button
                      type="button"
                      onClick={() => setRandomSeed((prev) => prev + 1)}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1.5 transition-all active:scale-95 px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200"
                      title="Shuffle another random destination"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Random Pick</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {['All', 'Coastal', 'Ghats', 'High Passes', 'Solo'].map((cat) => {
                      const isActive = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                            isActive
                              ? 'bg-[#18191D] text-white shadow-sm'
                              : 'bg-white text-gray-600 border border-gray-200/70 hover:bg-gray-50'
                          }`}
                        >
                          {cat === 'All' ? 'All Corridors' : cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Large Featured Hero Card (Matches Screen 1 Featured Tour) */}
                <div
                  onClick={() => setSelectedTourDetail(heroTour)}
                  className="group relative rounded-[32px] overflow-hidden shadow-lg bg-gray-900 aspect-[4/3.8] cursor-pointer transition-transform active:scale-[0.99]"
                >
                  <img
                    src={heroTour.coverImage}
                    alt={heroTour.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80';
                    }}
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Top Floating Favorite Button (Matches Screen 1) */}
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(heroTour.id, e)}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/30 active:scale-90 transition-all"
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        savedFavorites.includes(heroTour.id)
                          ? 'fill-red-500 text-red-500'
                          : 'text-white'
                      }`}
                    />
                  </button>

                  {/* Floating Bottom Card Over Image (Matches Screen 1) */}
                  <div className="absolute bottom-3 left-3 right-3 bg-[#18191DF0] backdrop-blur-md rounded-2xl p-4 text-white border border-white/10 shadow-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-300">
                        {heroTour.region}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-amber-400 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{heroTour.rating}</span>
                        <span className="text-gray-400 font-normal">({heroTour.reviewsCount})</span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                      {heroTour.title}
                    </h3>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/10">
                      <span className="text-xs text-gray-300 font-medium">
                        See schedule & waypoints
                      </span>
                      <div className="w-8 h-8 rounded-full bg-white text-gray-900 flex items-center justify-center group-hover:translate-x-0.5 transition-transform shadow-md">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Upcoming Tours / Popular Corridors Carousel (Matches Screen 2) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-900 tracking-tight">
                      Upcoming tours
                    </h2>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('All')}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-900"
                    >
                      See all
                    </button>
                  </div>

                  {/* Horizontal Scroll Cards */}
                  <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar pb-2 pt-0.5">
                    {carouselTours.map((tour) => (
                      <div
                        key={tour.id}
                        onClick={() => setSelectedTourDetail(tour)}
                        className="w-56 shrink-0 bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden cursor-pointer group hover:shadow-md transition-all"
                      >
                        {/* Image Banner */}
                        <div className="relative h-32 w-full overflow-hidden bg-gray-100">
                          <img
                            src={tour.coverImage}
                            alt={tour.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80';
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => toggleFavorite(tour.id, e)}
                            className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-gray-700 hover:bg-white active:scale-90 transition-all"
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                savedFavorites.includes(tour.id)
                                  ? 'fill-red-500 text-red-500'
                                  : 'text-gray-700'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Card Body */}
                        <div className="p-3">
                          <h4 className="text-xs font-bold text-gray-900 truncate">
                            {tour.title}
                          </h4>
                          <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                            {tour.distance} • {tour.duration}
                          </p>

                          <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-gray-800">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{tour.rating}</span>
                              <span className="text-[10px] text-gray-400 font-normal">({tour.reviewsCount})</span>
                            </div>

                            <div className="w-6 h-6 rounded-full bg-[#18191D] text-white flex items-center justify-center">
                              <ArrowRight className="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </main>
            )}

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* TAB: LIVE MAP & SATELLITE NAVIGATION (GOOGLE MAPS UI + MOTORCYCLE)*/}
            {/* ───────────────────────────────────────────────────────────────── */}
            {activeTab === 'map' && (
              <main className="mobile-app-content flex-1 h-full relative overflow-hidden">
                {/* Fullscreen MapView */}
                <div className="absolute inset-0 w-full h-full z-0">
                  <MapView
                    riders={effectiveRiders}
                    waypoints={effectiveWaypoints}
                    currentRiderId={currentProfile.id}
                    cameraMode={effectiveCameraMode}
                    onSetCameraMode={effectiveSetCameraMode}
                    activeRoutePath={effectiveRoutePath}
                    isRideActive={isRideActive}
                    startPoint={currentGpsCoords || { lat: 18.9220, lng: 72.8347 }}
                    alerts={alerts}
                  />
                </div>

                {/* Top Google Maps Floating Card & Status */}
                <div className="absolute top-3 left-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto">
                  <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md rounded-full px-4 py-2.5 shadow-lg border border-gray-200/80">
                    <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                    <div className="flex-1 truncate">
                      <span className="text-xs font-bold text-gray-900 block truncate">
                        {activeRoute ? activeRoute.title : 'Mumbai ➔ Goa Coastal Run (NH 66)'}
                      </span>
                      <span className="text-[10px] text-gray-500 block truncate">
                        {activeRoute
                          ? `${activeRoute.distanceKm} km • ${activeRoute.durationMinutes} min driving`
                          : '550 km • 11h ride • Motorcycle Corridor'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenCockpit) {
                          onOpenCockpit();
                        } else {
                          handleLaunchSoloRide();
                        }
                      }}
                      className="px-3 py-1.5 rounded-full bg-[#18191D] hover:bg-black text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Cockpit HUD</span>
                    </button>
                  </div>
                </div>

                {/* Bottom Floating Google Maps Route Summary & Action Card */}
                <div className="absolute bottom-20 left-4 right-4 z-20 pointer-events-auto">
                  <div className="bg-white/95 backdrop-blur-md rounded-3xl p-4 shadow-xl border border-gray-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex flex-col items-center justify-center shadow-md shrink-0">
                        <span className="text-xs font-black">80</span>
                        <span className="text-[7.5px] font-bold uppercase tracking-wider">LIMIT</span>
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-extrabold text-gray-900">
                            {activeRoute ? `${activeRoute.durationMinutes} min` : '11h 20m'}
                          </span>
                          <span className="text-xs font-semibold text-emerald-600">
                            ({activeRoute ? `${activeRoute.distanceKm} km` : '550 km'})
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 font-medium truncate">
                          Live Motorcycle Tracking Active
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLaunchSoloRide()}
                      className="px-4 py-2.5 rounded-full bg-[#18191D] hover:bg-black text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-transform active:scale-95 shrink-0"
                    >
                      <span>Start Ride</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </main>
            )}

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* TAB 2: SQUAD / CONVOY (MODERNIZED SLEEK UI)                       */}
            {/* ───────────────────────────────────────────────────────────────── */}
            {activeTab === 'squad' && (
              <main className="mobile-app-content flex-1 overflow-y-auto no-scrollbar px-5 pt-4 pb-24 space-y-4">
                <div className="pt-1">
                  <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
                    Convoy Squads
                  </h1>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">
                    Real-time group motorcycle GPS & voice comms
                  </p>
                </div>

                {/* Segmented Pill Selector */}
                <div className="grid grid-cols-2 p-1 bg-gray-200/70 rounded-full">
                  <button
                    type="button"
                    onClick={() => setSquadMode('join')}
                    className={`py-2 rounded-full text-xs font-semibold transition-all ${
                      squadMode === 'join'
                        ? 'bg-[#18191D] text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Join Squad
                  </button>
                  <button
                    type="button"
                    onClick={() => setSquadMode('create')}
                    className={`py-2 rounded-full text-xs font-semibold transition-all ${
                      squadMode === 'create'
                        ? 'bg-[#18191D] text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Create Squad
                  </button>
                </div>

                {/* Submode A: Join Squad */}
                {squadMode === 'join' && (
                  <form onSubmit={handleSubmitJoin} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-150 space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                        Enter Squad Room Code
                      </label>
                      <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => {
                          setJoinCode(e.target.value.toUpperCase());
                          setJoinError(null);
                        }}
                        maxLength={15}
                        placeholder="RU-XXXXXXXXXXXX"
                        className="w-full bg-gray-50 border border-gray-200/80 rounded-2xl py-3 text-center text-lg font-bold tracking-widest uppercase font-mono focus:bg-white focus:outline-none"
                      />
                      {joinError && (
                        <p className="text-xs font-medium text-red-500 mt-1.5 text-center">{joinError}</p>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 leading-relaxed text-center">
                      Enter the 6 or 12-character squad code shared by your Road Captain to join their convoy.
                    </p>

                    <button
                      type="submit"
                      disabled={isJoining}
                      className="w-full py-3.5 rounded-full bg-[#18191D] hover:bg-black text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isJoining ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Connecting to Squad...</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>Enter Convoy Squad</span>
                        </>
                      )}
                    </button>

                    {onOpenShare && (
                      <button
                        type="button"
                        onClick={() => onOpenShare(joinCode)}
                        disabled={!joinCode.trim()}
                        className="w-full py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share Invite Link (WhatsApp)</span>
                      </button>
                    )}
                  </form>
                )}

                {/* Submode B: Create Squad */}
                {squadMode === 'create' && (
                  <form onSubmit={handleSubmitCreate} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-150 space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                        Convoy Squad Title
                      </label>
                      <input
                        type="text"
                        value={createTitle}
                        onChange={(e) => setCreateTitle(e.target.value)}
                        placeholder="e.g. Sunday Dawn Ride to Lonavala"
                        className="w-full bg-gray-50 border border-gray-200/80 rounded-2xl px-4 py-2.5 text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-1.5">
                        <span>Target Cruising Speed</span>
                        <span className="text-blue-600 font-mono font-bold">{targetSpeed} km/h</span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="120"
                        step="5"
                        value={targetSpeed}
                        onChange={(e) => setTargetSpeed(Number(e.target.value))}
                        className="w-full accent-gray-900 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 font-mono mt-1">
                        <span>40 km/h</span>
                        <span>80 km/h</span>
                        <span>120 km/h</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 leading-relaxed">
                      As Road Captain, you set the cruising pace, choose the locked convoy destination, and manage rider roles.
                    </p>

                    <button
                      type="submit"
                      disabled={isCreating}
                      className="w-full py-3.5 rounded-full bg-[#18191D] hover:bg-black text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Initializing Squad...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Create Squad Room (Captain)</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </main>
            )}

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* TAB 3: FUEL / CORRIDOR RADAR                                      */}
            {/* ───────────────────────────────────────────────────────────────── */}
            {activeTab === 'fuel' && (
              <main className="mobile-app-content flex-1 overflow-y-auto no-scrollbar px-5 pt-4 pb-24 space-y-4">
                <div className="pt-1">
                  <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
                    Fuel & Pitstops Radar
                  </h1>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">
                    Petrol pumps scanned within 10 km corridor
                  </p>
                </div>

                <div className="space-y-2.5">
                  {isLoadingFuel ? (
                    <div className="p-8 text-center bg-white rounded-3xl border border-gray-150">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-600 mx-auto mb-2" />
                      <p className="text-xs font-medium text-gray-500">Scanning radar for petrol pumps...</p>
                    </div>
                  ) : nearbyFuelStops.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-3xl border border-gray-150">
                      <Fuel className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs font-medium text-gray-500">No fuel stations detected in immediate radius.</p>
                    </div>
                  ) : (
                    nearbyFuelStops.map((stop, idx) => (
                      <div
                        key={stop.id || idx}
                        className="bg-white rounded-2xl p-4 border border-gray-150 shadow-sm flex items-center justify-between gap-3"
                      >
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-gray-900 truncate">
                            {stop.name}
                          </h4>
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">
                            {stop.description}
                          </p>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[9px] font-semibold">
                            {stop.distanceFromStartKm} km away
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRouteToFuelStop(stop)}
                          className="px-3 py-1.5 rounded-full bg-[#18191D] hover:bg-black text-white text-xs font-semibold flex items-center gap-1 shrink-0 transition-all shadow-sm"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>Route</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Highway Tip Card */}
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-100 flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
                  <Fuel className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p>
                    <span className="font-bold">Highway Tip: </span>
                    Top-up your tank before entering ghats or remote pass sections where stations can be 50+ km apart.
                  </p>
                </div>
              </main>
            )}

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* TAB 4: GARAGE / PROFILE & DIAGNOSTICS                             */}
            {/* ───────────────────────────────────────────────────────────────── */}
            {activeTab === 'garage' && (
              <main className="mobile-app-content flex-1 overflow-y-auto no-scrollbar px-5 pt-4 pb-24 space-y-4">
                <div className="pt-1">
                  <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
                    Rider Garage
                  </h1>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">
                    Profile, history, diagnostics and safety
                  </p>
                </div>

                {/* Rider Profile Card */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-150 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400 block">
                      Active Rider Identity
                    </span>
                    <h2 className="text-base font-bold text-gray-900 mt-0.5">
                      {profileCallsign}
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">
                      {profileBike || 'Motorcycle'}
                    </p>
                  </div>
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
                    style={{ backgroundColor: profileColor }}
                  >
                    <Bike className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Lifetime Stats Summary (3 Pills) */}
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="bg-white rounded-2xl border border-gray-150 p-3 shadow-sm">
                    <div className="text-base font-bold text-gray-900">{rideHistory.length}</div>
                    <div className="text-[9px] font-medium text-gray-400 uppercase mt-0.5">Runs Done</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-150 p-3 shadow-sm">
                    <div className="text-base font-bold text-gray-900">
                      {rideHistory.reduce((acc, r) => acc + (r.distanceKm || 0), 0).toFixed(1)}
                    </div>
                    <div className="text-[9px] font-medium text-gray-400 uppercase mt-0.5">Total Km</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-150 p-3 shadow-sm">
                    <div className="text-base font-bold text-gray-900">
                      {(rideHistory.reduce((acc, r) => acc + (r.durationMinutes || 0), 0) / 60).toFixed(1)}h
                    </div>
                    <div className="text-[9px] font-medium text-gray-400 uppercase mt-0.5">Saddle Time</div>
                  </div>
                </div>

                {/* Account / Cloud Sync Card */}
                {authUser ? (
                  <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-150 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 truncate">
                      {authUser.picture ? (
                        <img src={authUser.picture} alt="" className="w-10 h-10 rounded-full border border-gray-200 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {authUser.name.charAt(0)}
                        </div>
                      )}
                      <div className="truncate">
                        <span className="text-xs font-bold text-gray-900 block truncate">{authUser.name}</span>
                        <p className="text-[10px] text-gray-400 font-mono truncate">{authUser.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {onSignOut && (
                        <button
                          type="button"
                          onClick={onSignOut}
                          className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-600 text-[10px] font-semibold text-gray-700 transition-colors"
                        >
                          Sign Out
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-150 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">Sign In to Save Runs</h4>
                      <p className="text-[10px] text-gray-400">Sync completed rides with SQLite cloud</p>
                    </div>
                    {onOpenAuth && (
                      <button
                        type="button"
                        onClick={onOpenAuth}
                        className="px-3.5 py-1.5 rounded-full bg-[#18191D] hover:bg-black text-white font-semibold text-xs transition-all shadow-sm"
                      >
                        Sign In
                      </button>
                    )}
                  </div>
                )}

                {/* Ride History */}
                <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-150 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                      <History className="w-3.5 h-3.5 text-gray-500" />
                      <span>Completed Ride History</span>
                    </div>
                    {rideHistory.length > 0 && onClearHistory && (
                      <button
                        type="button"
                        onClick={onClearHistory}
                        className="text-[10px] font-semibold text-gray-400 hover:text-red-500"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {rideHistory.length > 0 ? (
                      rideHistory.map((item) => (
                        <div key={item.id} className="p-3 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-gray-900">
                            <span className="truncate max-w-[180px]">{item.startName} ➔ {item.destName}</span>
                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              {item.mode}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                            <span>{new Date(item.completedAt).toLocaleDateString()}</span>
                            <span>{item.distanceKm} km • {item.durationMinutes}m • {item.avgSpeedKmh} km/h</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-4 text-xs text-gray-400">
                        No completed rides recorded yet. Start navigation to record your first run!
                      </p>
                    )}
                  </div>
                </div>

                {/* Profile Editor */}
                <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-150 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-900">Edit Rider Identity</span>
                    {profileSavedToast && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                        <Check className="w-3 h-3" /> Saved!
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase text-gray-400 block mb-1">
                      Rider Callsign
                    </label>
                    <input
                      type="text"
                      value={profileCallsign}
                      onChange={(e) => setProfileCallsign(e.target.value)}
                      placeholder="e.g. Apex, Falcon"
                      className="w-full bg-gray-50 border border-gray-200/80 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase text-gray-400 block mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Your Name"
                      className="w-full bg-gray-50 border border-gray-200/80 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase text-gray-400 block mb-1">
                      Motorcycle Model
                    </label>
                    <input
                      type="text"
                      value={profileBike}
                      onChange={(e) => setProfileBike(e.target.value)}
                      placeholder="e.g. Royal Enfield Himalayan 450"
                      className="w-full bg-gray-50 border border-gray-200/80 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase text-gray-400 block mb-1.5">
                      Puck Marker Color
                    </label>
                    <div className="flex items-center gap-2">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setProfileColor(c)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                            profileColor === c ? 'scale-110 ring-2 ring-offset-2 ring-gray-900' : 'opacity-80'
                          }`}
                          style={{ backgroundColor: c }}
                        >
                          {profileColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-full bg-[#18191D] hover:bg-black text-white font-semibold text-xs shadow-sm transition-all"
                  >
                    Update Identity
                  </button>
                </form>

                {/* Crash Detection & ICE Info */}
                <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-150 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Crash Detection & ICE</span>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Sensors Active
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">
                    Uses phone motion sensors to detect severe impacts (&gt;3.8G) and trigger a 30s helmet siren &amp; emergency SMS.
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-semibold text-gray-400 uppercase block mb-1">
                        ICE Phone
                      </label>
                      <input
                        type="tel"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full bg-gray-50 border border-gray-200/80 rounded-xl px-2.5 py-1.5 text-xs font-mono font-semibold focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-semibold text-gray-400 uppercase block mb-1">
                        Blood Group
                      </label>
                      <select
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200/80 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:bg-white focus:outline-none"
                      >
                        {['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'].map((bg) => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveIceInfo}
                      className="py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs transition-colors"
                    >
                      Save ICE Info
                    </button>
                    {onTestCrash && (
                      <button
                        type="button"
                        onClick={onTestCrash}
                        className="py-2 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold text-xs shadow-sm transition-colors"
                      >
                        Test Siren
                      </button>
                    )}
                  </div>
                </div>

                {/* Spoken Prompts & Offline Maps */}
                <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-150 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                      <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Spoken Voice Prompts</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleSpokenPrompts}
                      className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-all ${
                        spokenPrompts ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {spokenPrompts ? 'ENABLED' : 'MUTED'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-600">Offline Mumbai-Goa Tiles:</span>
                    <span className="text-xs font-mono font-bold text-gray-800">{cachedTileCount} Tiles</span>
                  </div>

                  <button
                    type="button"
                    disabled={isCachingMap}
                    onClick={handleDownloadOfflineRoute}
                    className="w-full py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isCachingMap ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Caching Tiles ({cacheProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Pre-Cache Mumbai–Goa Corridor</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Server Host Config */}
                <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-150 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                      <Server className="w-3.5 h-3.5 text-gray-500" />
                      <span>Backend Server LAN Address</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetGarageServer}
                      className="text-[10px] font-semibold text-blue-600 hover:underline"
                    >
                      Reset Default
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={garageServerUrl}
                      onChange={(e) => setGarageServerUrl(e.target.value)}
                      placeholder="http://192.168.29.64:5001"
                      className="flex-1 bg-gray-50 border border-gray-200/80 rounded-xl px-3 py-1.5 text-xs font-mono font-semibold focus:bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveGarageServer}
                      disabled={isTestingGarageServer}
                      className="px-3 py-1.5 rounded-xl bg-[#18191D] hover:bg-black text-white text-xs font-semibold shrink-0 disabled:opacity-50"
                    >
                      {isTestingGarageServer ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save & Test'}
                    </button>
                  </div>

                  {garageServerStatus && (
                    <div className={`p-2 rounded-xl text-xs font-medium ${
                      garageServerStatus.success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-600'
                    }`}>
                      {garageServerStatus.message}
                    </div>
                  )}
                </div>

                {/* Minimalist Typographic Startup Animation */}
                <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-150 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 tracking-wide uppercase">Startup Animation</h3>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">Minimalist boot sequence</p>
                    </div>
                    {onReplayStartup && (
                      <button
                        type="button"
                        onClick={onReplayStartup}
                        className="px-3.5 py-1.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold tracking-wide transition-all active:scale-95 shadow-sm"
                      >
                        Replay Intro
                      </button>
                    )}
                  </div>
                </div>
              </main>
            )}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* FLOATING OBSIDIAN DOCK / BOTTOM TAB BAR (MATCHES SCREEN 1)          */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <div className="absolute bottom-3 left-0 right-0 px-6 z-40 pointer-events-none">
              <nav className="pointer-events-auto bg-[#18191DEE] backdrop-blur-md rounded-full text-white shadow-2xl py-2 px-3 mx-auto max-w-[360px] flex items-center justify-between border border-white/10">
                {/* Tab 1: Ride / Home */}
                <button
                  type="button"
                  onClick={() => setActiveTab('ride')}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    activeTab === 'ride'
                      ? 'bg-white text-gray-900 shadow-md scale-105'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Explore & Ride"
                >
                  <Compass className="w-5 h-5" />
                </button>

                {/* Tab 2: Live Map */}
                <button
                  type="button"
                  onClick={() => setActiveTab('map')}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    activeTab === 'map'
                      ? 'bg-white text-gray-900 shadow-md scale-105'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Live Map & Navigation"
                >
                  <Map className="w-5 h-5" />
                </button>

                {/* Tab 3: Squad / Convoy */}
                <button
                  type="button"
                  onClick={() => setActiveTab('squad')}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    activeTab === 'squad'
                      ? 'bg-white text-gray-900 shadow-md scale-105'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Convoy Squads"
                >
                  <Users className="w-5 h-5" />
                </button>

                {/* Tab 4: Fuel */}
                <button
                  type="button"
                  onClick={() => setActiveTab('fuel')}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    activeTab === 'fuel'
                      ? 'bg-white text-gray-900 shadow-md scale-105'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Fuel Radar"
                >
                  <Fuel className="w-5 h-5" />
                </button>

                {/* Tab 5: Garage */}
                <button
                  type="button"
                  onClick={() => setActiveTab('garage')}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    activeTab === 'garage'
                      ? 'bg-white text-gray-900 shadow-md scale-105'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Rider Garage"
                >
                  <Grid className="w-5 h-5" />
                </button>
              </nav>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
