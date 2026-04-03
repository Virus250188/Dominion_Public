// Spotify API response types

export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in ms
  userId: string;
  displayName: string;
}

export interface SpotifyTrack {
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number;  // ms
  progress: number;  // ms
  uri: string;
  isLiked: boolean;
}

export interface SpotifyDevice {
  id: string;
  name: string;
  type: string; // "Computer" | "Smartphone" | "Speaker" | etc.
  volume: number; // 0-100
  isActive: boolean;
}

export interface SpotifyWidgetData {
  isPlaying: boolean;
  track: SpotifyTrack | null;
  device: SpotifyDevice | null;
  availableDevices: SpotifyDevice[];
  shuffle: boolean;
  repeat: "off" | "track" | "context";
  displayMode: "library" | "topArtist" | "nowPlaying";
  widgetMode: "miniPlayer" | "cleanInfo";
  topArtistName: string | null;
}

export interface SpotifyActionPayload {
  action:
    | "play"
    | "pause"
    | "next"
    | "previous"
    | "seek"
    | "volume"
    | "shuffle"
    | "repeat"
    | "like"
    | "unlike"
    | "transfer";
  payload?: {
    position_ms?: number;
    volume_percent?: number;
    device_id?: string;
    track_id?: string;
    shuffle_state?: boolean;
    repeat_state?: "off" | "track" | "context";
  };
}
