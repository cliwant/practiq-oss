// =============================================================================
// Firm context — module-level active firm holder
// =============================================================================
// The dashboard layout's React state is the source of truth for which firm is
// active. It mirrors that state into this module via `setActiveFirmId()` in a
// useEffect, so non-React callers (mock-data getters, demo-mode scripts) can
// read the active firm without prop drilling or hook overhead.
//
// A resolver function is registered once at app boot (by `src/data/firms/index.ts`)
// to avoid circular import issues between this module and the firm registry.
// =============================================================================

import type { FirmData } from "@/data/firms/types";

let _activeFirmId = "meridian-accounting";
let _resolver: ((id: string) => FirmData) | null = null;

/** Called once by the firm registry at module load to wire the data resolver. */
export function registerFirmResolver(fn: (id: string) => FirmData) {
  _resolver = fn;
}

/** Called from the dashboard layout useEffect when firm state changes. */
export function setActiveFirmId(id: string) {
  _activeFirmId = id;
}

/** Read the current active firm id. */
export function getActiveFirmId(): string {
  return _activeFirmId;
}

/** Lazy-resolved lookup of the active firm's full data bundle. */
export function getActiveFirmData(): FirmData {
  if (!_resolver) {
    throw new Error(
      "firm-context: resolver not registered. Import `@/data/firms` at app boot to register it."
    );
  }
  return _resolver(_activeFirmId);
}
