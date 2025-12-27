import type { Settings, SyncEvent, SyncOptions } from "./types";

declare global {
  interface Window {
    rsyncSync: {
      selectDirectory: (initialPath?: string) => Promise<string | null>;
      saveText: (defaultName: string, content: string) => Promise<string | null>;
      start: (options: SyncOptions) => Promise<void>;
      stop: () => Promise<void>;
      getSettings: () => Promise<Settings>;
      setSettings: (patch: Partial<Settings>) => Promise<Settings>;
      onSyncEvent: (cb: (event: SyncEvent) => void) => () => void;
    };
  }
}

export const api = window.rsyncSync;
