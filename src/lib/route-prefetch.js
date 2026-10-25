let promptLibrary;

export function loadPromptLibrary() {
  if (!promptLibrary) {
    promptLibrary = import('../pages/PromptLibrary').catch(error => {
      promptLibrary = null;
      throw error;
    });
  }
  return promptLibrary;
}

// Warm a route only when the visitor points to or focuses its actual link.
// requestIdleCallback indicates spare CPU time, not spare network bandwidth.
export function installIntentPrefetch(doc = document) {
  const warm = event => {
    if (navigator.connection?.saveData) return;
    const anchor = event.target?.closest?.('a[href]');
    if (!anchor) return;
    let url;
    try { url = new URL(anchor.href, location.href); } catch { return; }
    if (url.origin !== location.origin || url.hash.split('?')[0] !== '#/prompts') return;
    loadPromptLibrary().catch(() => {});
  };
  const options = { capture: true, passive: true };
  for (const type of ['pointerover', 'focusin', 'touchstart']) doc.addEventListener(type, warm, options);
  return () => {
    for (const type of ['pointerover', 'focusin', 'touchstart']) doc.removeEventListener(type, warm, options);
  };
}
