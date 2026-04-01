/**
 * Community Plugin Barrel
 * ───────────────────────────────────────────────────────────────────────────
 * To add a community plugin:
 *   1. Create a folder: src/plugins/community/my-plugin/
 *   2. Write index.ts exporting your AppPlugin (and optionally a widget)
 *   3. Add ONE line below in the plugin exports section:
 *
 *      export { myPlugin } from "./my-plugin";
 *
 *   4. Add it to the communityPlugins array.
 *   5. If your plugin has a widget, also add it to communityWidgets.
 *
 *   That's it. No other core files to edit.
 * ───────────────────────────────────────────────────────────────────────────
 */

import type { AppPlugin } from "../types";
import type { ComponentType } from "react";

// ── Community plugin exports go here ──────────────────────────────────────
// export { examplePlugin } from "./example-plugin";
// export { ExampleWidget } from "./example-plugin/ExampleWidget";

// All community plugins collected for the registry.
export const communityPlugins: AppPlugin[] = [
  // examplePlugin,
];

// Community widget map: widgetComponent name -> React component.
// The key must match the `widgetComponent` string in your plugin's renderHints.
export const communityWidgets: Record<string, ComponentType<unknown>> = {
  // "ExampleWidget": ExampleWidget,
};
