import AdmZip from "adm-zip";
import * as fs from "fs";
import * as path from "path";

// ─── Plugin Manifest Spec ────────────────────────────────────────────────────

export interface PluginManifest {
  id: string;                    // kebab-case, e.g. "opnsense"
  name: string;                  // Display name, e.g. "OPNsense"
  version: string;               // Semver, e.g. "1.0.0"
  author: string;                // Author name
  description: string;           // Short description
  minDashboardVersion?: string;  // Minimum compatible dashboard version
  hasWidget?: boolean;           // Whether plugin includes a widget component
  widgetFile?: string;           // Widget filename, e.g. "OpnsenseWidget.tsx"
}

export interface PluginValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  manifest?: PluginManifest;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const KEBAB_CASE_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+/; // loose semver (allows pre-release suffixes)
const MANIFEST_REQUIRED_FIELDS: (keyof PluginManifest)[] = [
  "id",
  "name",
  "version",
  "author",
  "description",
];

/**
 * Compare two semver strings loosely (major.minor.patch).
 * Returns -1 if a < b, 0 if equal, 1 if a > b.
 */
function compareSemver(a: string, b: string): number {
  const pa = a.split(/[.-]/).map(Number);
  const pb = b.split(/[.-]/).map(Number);
  for (let i = 0; i < 3; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va < vb) return -1;
    if (va > vb) return 1;
  }
  return 0;
}

/**
 * Read the current dashboard version from package.json.
 */
function getDashboardVersion(): string {
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

// ─── ZIP Validation ──────────────────────────────────────────────────────────

/**
 * Validate a plugin ZIP file.
 *
 * Checks:
 * 1. ZIP contains plugin.manifest.json at root
 * 2. Manifest has all required fields
 * 3. id is kebab-case
 * 4. ZIP contains index.ts
 * 5. index.ts exports `plugin`
 * 6. If hasWidget, widgetFile exists in ZIP
 * 7. id does not conflict with existing community plugins
 * 8. No path traversal (../) in any entry
 * 9. Optional minDashboardVersion check
 */
export function validatePluginZip(buffer: Buffer): PluginValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── Parse ZIP ──────────────────────────────────────────────────────────────

  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    return { valid: false, errors: ["Ungueltige ZIP-Datei."], warnings };
  }

  const entries = zip.getEntries();
  const entryNames = entries.map((e) => e.entryName);

  // ── Security: path traversal check ─────────────────────────────────────────

  for (const name of entryNames) {
    if (name.includes("../") || name.includes("..\\")) {
      errors.push(`Sicherheitsverstoss: Pfad-Traversal in "${name}".`);
    }
  }
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // ── Detect common prefix (ZIP may wrap everything in a folder) ─────────────

  // Some ZIP tools create a top-level folder, e.g. "my-plugin/index.ts".
  // We detect this and strip it so that validation finds the right files.
  let prefix = "";
  const dirs = entryNames.filter((n) => n.endsWith("/") && !n.slice(0, -1).includes("/"));
  if (dirs.length === 1) {
    // Every non-directory entry starts with this single dir
    const candidate = dirs[0];
    const allInside = entryNames.every((n) => n === candidate || n.startsWith(candidate));
    if (allInside) {
      prefix = candidate;
    }
  }

  /** Resolve an entry name with prefix. */
  function resolveEntry(name: string): string {
    return prefix + name;
  }

  /** Check if an entry (with prefix) exists. */
  function hasEntry(name: string): boolean {
    return entryNames.includes(resolveEntry(name));
  }

  /** Read an entry as UTF-8 string. */
  function readEntry(name: string): string | null {
    const entry = zip.getEntry(resolveEntry(name));
    if (!entry) return null;
    return entry.getData().toString("utf-8");
  }

  // ── 1. plugin.manifest.json ────────────────────────────────────────────────

  if (!hasEntry("plugin.manifest.json")) {
    errors.push("ZIP muss eine plugin.manifest.json im Wurzelverzeichnis enthalten.");
    return { valid: false, errors, warnings };
  }

  let manifest: PluginManifest;
  try {
    const raw = readEntry("plugin.manifest.json");
    if (!raw) throw new Error("empty");
    manifest = JSON.parse(raw);
  } catch {
    errors.push("plugin.manifest.json ist kein gueltiges JSON.");
    return { valid: false, errors, warnings };
  }

  // ── 2. Required fields ─────────────────────────────────────────────────────

  for (const field of MANIFEST_REQUIRED_FIELDS) {
    if (!manifest[field] || typeof manifest[field] !== "string" || (manifest[field] as string).trim() === "") {
      errors.push(`Pflichtfeld "${field}" fehlt oder ist leer in plugin.manifest.json.`);
    }
  }
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // ── 3. id is kebab-case ────────────────────────────────────────────────────

  if (!KEBAB_CASE_RE.test(manifest.id)) {
    errors.push(`Plugin-ID "${manifest.id}" muss kebab-case sein (Kleinbuchstaben, Ziffern, Bindestriche).`);
  }

  // ── Version is valid semver ────────────────────────────────────────────────

  if (!SEMVER_RE.test(manifest.version)) {
    errors.push(`Version "${manifest.version}" muss Semver-Format haben (z.B. "1.0.0").`);
  }

  // ── 4. index.ts exists ─────────────────────────────────────────────────────

  if (!hasEntry("index.ts")) {
    errors.push("ZIP muss eine index.ts Datei enthalten.");
  }

  // ── 5. index.ts exports plugin ─────────────────────────────────────────────

  if (hasEntry("index.ts")) {
    const indexContent = readEntry("index.ts");
    if (indexContent && !indexContent.includes("export const plugin")) {
      errors.push('index.ts muss "export const plugin" exportieren.');
    }
  }

  // ── 6. Widget file check ───────────────────────────────────────────────────

  if (manifest.hasWidget) {
    const widgetFile = manifest.widgetFile;
    if (!widgetFile) {
      errors.push('Manifest hat hasWidget=true, aber kein "widgetFile" angegeben.');
    } else if (!hasEntry(widgetFile)) {
      errors.push(`Widget-Datei "${widgetFile}" existiert nicht im ZIP.`);
    }
  }

  // ── 7. Conflict check ─────────────────────────────────────────────────────

  const communityDir = path.join(process.cwd(), "src", "plugins", "community", manifest.id);
  if (fs.existsSync(communityDir)) {
    errors.push(`Plugin "${manifest.id}" existiert bereits. Bitte zuerst deinstallieren.`);
  }

  // ── 8. Path traversal already checked above ────────────────────────────────

  // ── 9. minDashboardVersion check ───────────────────────────────────────────

  if (manifest.minDashboardVersion) {
    const currentVersion = getDashboardVersion();
    if (compareSemver(currentVersion, manifest.minDashboardVersion) < 0) {
      warnings.push(
        `Plugin erfordert Dashboard v${manifest.minDashboardVersion}, ` +
        `aktuell installiert: v${currentVersion}.`
      );
    }
  }

  // ── Result ─────────────────────────────────────────────────────────────────

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    manifest,
  };
}
