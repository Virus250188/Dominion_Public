export interface PlasmaConfig {
  speed: number;    // 0.001–0.01, default 0.004
  hue: number;      // 0–360, default 270 (purple)
  intensity: number; // 0.3–1.0, default 0.5
}

export interface MeshConfig {
  speed: number;      // 0.001–0.01, default 0.005
  saturation: number; // 0.2–1.0, default 0.5
  blobSize: number;   // 0.2–0.5, default 0.35
}

export interface AuroraConfig {
  speed: number;    // 0.003–0.02, default 0.008
  bandCount: number; // 3–7, default 5
  amplitude: number; // 20–80, default 40
}

export interface NebulaConfig {
  speed: number;    // 0.1–0.8, default 0.3
  count: number;    // 50–200, default 120
  glowSize: number; // 4–12, default 8
}

export interface BackgroundConfig {
  plasma?: Partial<PlasmaConfig>;
  mesh?: Partial<MeshConfig>;
  aurora?: Partial<AuroraConfig>;
  nebula?: Partial<NebulaConfig>;
}

export const defaultPlasmaConfig: PlasmaConfig = { speed: 0.004, hue: 270, intensity: 0.5 };
export const defaultMeshConfig: MeshConfig = { speed: 0.005, saturation: 0.5, blobSize: 0.35 };
export const defaultAuroraConfig: AuroraConfig = { speed: 0.008, bandCount: 5, amplitude: 40 };
export const defaultNebulaConfig: NebulaConfig = { speed: 0.3, count: 120, glowSize: 8 };
