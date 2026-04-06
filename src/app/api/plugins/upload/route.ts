import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { validatePluginZip, type PluginManifest } from "@/plugins/manifest";
import AdmZip from "adm-zip";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  try {
    // ── 1. Auth check ──────────────────────────────────────────────────────

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }

    // ── 2. Parse multipart form data ─────────────────────────────────────

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Keine Datei hochgeladen." }, { status: 400 });
    }

    // ── 3. Validate file type and size ───────────────────────────────────

    if (!file.name.endsWith(".zip")) {
      return NextResponse.json(
        { error: "Nur ZIP-Dateien sind erlaubt." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Datei zu gross. Maximale Groesse: ${MAX_FILE_SIZE / 1024 / 1024} MB.` },
        { status: 400 },
      );
    }

    // ── 4. Read ZIP into buffer ──────────────────────────────────────────

    const buffer = Buffer.from(await file.arrayBuffer());

    // ── 5. Validate plugin structure ─────────────────────────────────────

    const result = validatePluginZip(buffer);

    if (!result.valid) {
      logger.warn("plugin-upload", "Plugin validation failed", {
        filename: file.name,
        errors: result.errors.join("; "),
      });
      return NextResponse.json(
        { success: false, errors: result.errors, warnings: result.warnings },
        { status: 422 },
      );
    }

    const manifest = result.manifest!;

    // ── 6. Extract to community plugin directory ─────────────────────────

    const targetDir = path.join(
      process.cwd(),
      "src",
      "plugins",
      "community",
      manifest.id,
    );

    // Check if this is an update (plugin already exists)
    const isUpdate = fs.existsSync(targetDir);
    let previousVersion: string | undefined;

    if (isUpdate) {
      // Try to read the old version before deleting
      try {
        const oldManifestPath = path.join(targetDir, "plugin.manifest.json");
        if (fs.existsSync(oldManifestPath)) {
          const oldManifest = JSON.parse(fs.readFileSync(oldManifestPath, "utf-8"));
          previousVersion = oldManifest.version;
        }
      } catch {
        // Non-critical — we just won't have the old version info
      }

      // Remove old plugin directory completely
      fs.rmSync(targetDir, { recursive: true, force: true });

      logger.info("plugin-upload", `Updating plugin: ${manifest.id}`, {
        previousVersion: previousVersion ?? "unknown",
        newVersion: manifest.version,
      });
    }

    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    const entryNames = entries.map((e) => e.entryName);

    // Detect top-level wrapper folder (same logic as manifest.ts)
    let prefix = "";
    const dirs = entryNames.filter((n) => n.endsWith("/") && !n.slice(0, -1).includes("/"));
    if (dirs.length === 1) {
      const candidate = dirs[0];
      const allInside = entryNames.every((n) => n === candidate || n.startsWith(candidate));
      if (allInside) {
        prefix = candidate;
      }
    }

    // Create target directory
    fs.mkdirSync(targetDir, { recursive: true });

    for (const entry of entries) {
      // Skip directories
      if (entry.isDirectory) continue;

      // Strip prefix to get relative path within plugin
      let relativePath = entry.entryName;
      if (prefix && relativePath.startsWith(prefix)) {
        relativePath = relativePath.slice(prefix.length);
      }

      // Skip empty paths (the prefix directory itself)
      if (!relativePath) continue;

      // Security: skip anything that tries to escape
      if (relativePath.includes("..")) continue;

      const outputPath = path.join(targetDir, relativePath);
      const outputDir = path.dirname(outputPath);

      // Ensure subdirectories exist
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, entry.getData());
    }

    logger.info(
      "plugin-upload",
      isUpdate
        ? `Plugin updated: ${manifest.id} (${previousVersion ?? "?"} -> ${manifest.version})`
        : `Plugin installed: ${manifest.id}`,
      {
        name: manifest.name,
        version: manifest.version,
        author: manifest.author,
        action: isUpdate ? "update" : "install",
      },
    );

    // ── 7. Regenerate community plugin barrel ────────────────────────────

    try {
      execSync("npx tsx scripts/generate-community-plugins.ts", {
        cwd: process.cwd(),
        timeout: 30_000,
        stdio: "pipe",
      });
      logger.info("plugin-upload", "Community plugins barrel regenerated");
    } catch (genErr) {
      logger.error("plugin-upload", "Failed to regenerate plugins barrel", {
        error: (genErr as Error).message,
      });
      // Non-fatal: plugin files are already in place, barrel can be regenerated later
      result.warnings.push(
        "Plugin-Dateien wurden extrahiert, aber die automatische Registrierung schlug fehl. " +
        'Bitte "npm run generate:plugins" manuell ausfuehren.',
      );
    }

    // ── 8. Return success ────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      plugin: manifest,
      action: isUpdate ? "update" : "install",
      previousVersion: isUpdate ? previousVersion : undefined,
      warnings: result.warnings,
      needsRestart: true,
    });
  } catch (err) {
    logger.error("plugin-upload", "Unexpected error during plugin upload", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Interner Serverfehler beim Plugin-Upload." },
      { status: 500 },
    );
  }
}

/** DELETE /api/plugins/upload — Remove a community plugin */
export async function DELETE(request: NextRequest) {
  try {
    // ── 1. Auth check ──────────────────────────────────────────────────────
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }

    // ── 2. Parse body ──────────────────────────────────────────────────────
    let body: { pluginId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Ungueltiger Request-Body." },
        { status: 400 },
      );
    }

    const { pluginId } = body;

    if (!pluginId || typeof pluginId !== "string") {
      return NextResponse.json(
        { error: "pluginId ist erforderlich." },
        { status: 400 },
      );
    }

    // ── 3. Validate pluginId format (path traversal prevention) ─────────
    const KEBAB_CASE_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    if (!KEBAB_CASE_RE.test(pluginId)) {
      return NextResponse.json(
        { error: "Ungueltige pluginId. Nur Kleinbuchstaben, Ziffern und Bindestriche erlaubt." },
        { status: 400 },
      );
    }

    // ── 4. Check plugin exists ──────────────────────────────────────────
    const targetDir = path.join(
      process.cwd(),
      "src",
      "plugins",
      "community",
      pluginId,
    );

    if (!fs.existsSync(targetDir)) {
      return NextResponse.json(
        { error: `Plugin "${pluginId}" nicht gefunden.` },
        { status: 404 },
      );
    }

    // ── 5. Delete plugin directory ──────────────────────────────────────
    fs.rmSync(targetDir, { recursive: true, force: true });

    logger.info("plugin-delete", `Plugin deleted: ${pluginId}`);

    // ── 6. Regenerate community plugin barrel ───────────────────────────
    let barrelWarning: string | undefined;
    try {
      execSync("npx tsx scripts/generate-community-plugins.ts", {
        cwd: process.cwd(),
        timeout: 30_000,
        stdio: "pipe",
      });
      logger.info("plugin-delete", "Community plugins barrel regenerated");
    } catch (genErr) {
      logger.error("plugin-delete", "Failed to regenerate plugins barrel", {
        error: (genErr as Error).message,
      });
      barrelWarning =
        "Plugin wurde geloescht, aber die automatische Registrierung schlug fehl. " +
        'Bitte "npm run generate:plugins" manuell ausfuehren.';
    }

    // ── 7. Return success ───────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      pluginId,
      warning: barrelWarning,
      needsRestart: true,
    });
  } catch (err) {
    logger.error("plugin-delete", "Unexpected error during plugin deletion", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Interner Serverfehler beim Loeschen des Plugins." },
      { status: 500 },
    );
  }
}

/** GET /api/plugins/upload — List installed community plugins */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }

    const communityDir = path.join(
      process.cwd(),
      "src",
      "plugins",
      "community",
    );

    const plugins: PluginManifest[] = [];

    try {
      const entries = fs.readdirSync(communityDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const manifestPath = path.join(communityDir, entry.name, "plugin.manifest.json");
        try {
          const manifestContent = fs.readFileSync(manifestPath, "utf-8");
          plugins.push(JSON.parse(manifestContent));
        } catch {
          // Try to read metadata from index.ts as fallback
          const indexPath = path.join(communityDir, entry.name, "index.ts");
          try {
            const indexContent = fs.readFileSync(indexPath, "utf-8");
            if (/export\s+const\s+plugin\b/.test(indexContent)) {
              const nameMatch = indexContent.match(/name:\s*["'`]([^"'`]+)["'`]/);
              const idMatch = indexContent.match(/id:\s*["'`]([^"'`]+)["'`]/);
              const versionMatch = indexContent.match(/version:\s*["'`]([^"'`]+)["'`]/);
              const authorMatch = indexContent.match(/author:\s*["'`]([^"'`]+)["'`]/);
              const descMatch = indexContent.match(/description:\s*["'`]([^"'`]+)["'`]/);
              plugins.push({
                id: idMatch?.[1] || entry.name,
                name: nameMatch?.[1] || entry.name,
                version: versionMatch?.[1] || "0.0.0",
                author: authorMatch?.[1] || "Unbekannt",
                description: descMatch?.[1] || "",
              });
            }
          } catch {
            // Skip if no index.ts either
          }
        }
      }
    } catch {
      // Community directory doesn't exist yet
    }

    return NextResponse.json({ plugins });
  } catch (err) {
    logger.error("plugin-upload", "Failed to list community plugins", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Interner Serverfehler." },
      { status: 500 },
    );
  }
}
