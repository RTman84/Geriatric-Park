import { Capacitor } from '@capacitor/core';

// Android hardware/gesture Back button. `handle()` should close the top-most overlay (or go back a screen) and return true if it did
// anything. When there is nothing left to close, the first press calls `onExitHint` and a second press within 2 s exits the app.
// Does nothing on the web (the browser's own Back behaviour is untouched) and the plugin is only loaded on a native build.
export function registerBackButton(handle: () => boolean, onExitHint: () => void): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};
  let cancelled = false;
  let remove: (() => void) | null = null;
  let lastPress = 0;
  import('@capacitor/app').then(({ App }) => {
    if (cancelled) return;
    void App.addListener('backButton', () => {
      let handled = false;
      try { handled = handle(); } catch (e) { console.error('[Back] handler failed', e); }
      if (handled) return;
      const now = Date.now();
      if (now - lastPress < 2000) { void App.exitApp(); return; }
      lastPress = now;
      onExitHint();
    }).then(h => { if (cancelled) void h.remove(); else remove = () => { void h.remove(); }; });
  }).catch(e => console.error('[Back] plugin unavailable', e));
  return () => { cancelled = true; if (remove) remove(); };
}
