/* ==========================================================================
   PERFECT HOMES & DEVELOPERS — GOOGLE ADS CONVERSION TRACKING UTILITY
   Conversion Action: Get directions
   Google Tag ID: GTM-NSXP9B2R
   Google Ads Conversion ID: AW-18535280527
   Conversion Label: VgE0CPjI3bwdEI_fp4ZF
   ========================================================================== */

export const GOOGLE_TAG_ID = 'GTM-NSXP9B2R';
export const GOOGLE_ADS_ID = 'AW-18535280527';
export const GET_DIRECTIONS_CONVERSION_LABEL = 'VgE0CPjI3bwdEI_fp4ZF';
export const GET_DIRECTIONS_SEND_TO = `${GOOGLE_ADS_ID}/${GET_DIRECTIONS_CONVERSION_LABEL}`;

// Deduplication cooldown (prevents accidental double clicks from firing multiple conversion events)
let lastConversionTimestamp = 0;
const DEDUPLICATION_COOLDOWN_MS = 1500;

/**
 * Safely calls or queues gtag arguments.
 * Ensures window.dataLayer and window.gtag exist even if the external script is still loading.
 */
export function safeGtag() {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
  }

  window.gtag.apply(null, arguments);
}

/**
 * Fires the Google Ads "Get directions" conversion event.
 * Exact event payload:
 * gtag('event', 'conversion', {
 *   'send_to': 'AW-18535280527/VgE0CPjI3bwdEI_fp4ZF'
 * });
 *
 * @param {Object} [details] Optional metadata for logging/debugging (no PII sent)
 * @returns {boolean} Whether the conversion event was queued/fired
 */
export function trackGetDirectionsConversion(details = {}) {
  if (typeof window === 'undefined') return false;

  const now = Date.now();
  if (now - lastConversionTimestamp < DEDUPLICATION_COOLDOWN_MS) {
    if (import.meta.env?.DEV) {
      console.warn('[Google Ads] Ignored duplicate Get Directions click within cooldown period.');
    }
    return false;
  }
  lastConversionTimestamp = now;

  try {
    safeGtag('event', 'conversion', {
      send_to: GET_DIRECTIONS_SEND_TO
    });

    if (import.meta.env?.DEV) {
      console.log('[Google Ads] Tracked "Get directions" conversion event:', {
        send_to: GET_DIRECTIONS_SEND_TO,
        source: details?.source || 'direct',
        timestamp: new Date().toISOString()
      });
    }
    return true;
  } catch (err) {
    console.error('[Google Ads] Error dispatching conversion event:', err);
    return false;
  }
}

/**
 * Global delegated click listener helper.
 * Provides fallback detection for any genuine "Get Directions" link or button
 * without double-firing if a direct onClick handler already tracked the action.
 */
export function initGlobalDirectionsTracking() {
  if (typeof window === 'undefined') return () => {};

  const handleDocumentClick = (e) => {
    try {
      const target = e.target;
      if (!target) return;

      const linkOrButton = target.closest('a, button');
      if (!linkOrButton) return;

      const href = linkOrButton.getAttribute('href') || '';
      const text = (linkOrButton.textContent || '').trim().toLowerCase();
      const ariaLabel = (linkOrButton.getAttribute('aria-label') || '').toLowerCase();
      const id = (linkOrButton.getAttribute('id') || '').toLowerCase();

      // Check if this is a genuine Get Directions trigger
      const isDirectionsHref = href.includes('maps/dir') || href.includes('google.com/maps/dir');
      const isDirectionsText = text === 'get directions' || ariaLabel.includes('get directions to office') || ariaLabel.includes('get directions');
      const isDirectionsId = id.includes('get-directions');

      if (isDirectionsHref && (isDirectionsText || isDirectionsId)) {
        trackGetDirectionsConversion({
          source: 'delegated-listener',
          href,
          id
        });
      }
    } catch (err) {
      console.warn('[Google Ads] Delegated click handler error:', err);
    }
  };

  document.addEventListener('click', handleDocumentClick, true);

  return () => {
    document.removeEventListener('click', handleDocumentClick, true);
  };
}
