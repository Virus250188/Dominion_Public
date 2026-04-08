# Dominion Dashboard — Regeln fuer AI Agents

## KRITISCH: Kein Plugin-Code hier schreiben!

Dieses Repository ist die **Kerninstanz** des Dominion Dashboards.
AI Agents duerfen hier **NUR LESEN**, niemals Dateien aendern.

### Verboten:
- Dateien in `src/plugins/community/` erstellen oder aendern
- Dateien in `src/components/widgets/` erstellen oder aendern
- Irgendwelche anderen Dateien bearbeiten, erstellen oder loeschen
- Debug-Logs, console.log oder sonstige Aenderungen einbauen

### Erlaubt:
- Dateien lesen um das System zu verstehen
- `git log`, `git diff`, `git status` ausfuehren
- Den Code als Referenz fuer Plugin-Entwicklung nutzen

## Plugin-Entwicklung

Plugins werden in einem **separaten Arbeitsverzeichnis** entwickelt (z.B. `~/Apps/mein-plugin/`).
Das Ergebnis ist eine **ZIP-Datei** die der User ueber das Dashboard-UI hochlaedt.

Workflow:
1. Separaten Ordner anlegen (NICHT in diesem Repo!)
2. Plugin-Dateien dort erstellen (index.ts, manifest, optional Widget)
3. ZIP erstellen (via MCP Tool `create_plugin_zip` oder manuell)
4. User laedt ZIP hoch via Einstellungen > Plugins > Upload

Nutze den [Dominion MCP Server](https://github.com/Virus250188/Dominion_MCP) fuer:
- `get_framework_overview` — System verstehen
- `get_agent_workflow` — Entwicklungsablauf
- `scaffold_plugin` — Code generieren
- `validate_plugin_structure` — Code pruefen
- `create_plugin_zip` — ZIP erstellen
