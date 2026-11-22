// PERFECT HOMES & DEVELOPERS — GOOGLE ADS CONVERSION TRACKING TEST SUITE
// Run: node scripts/test_google_ads_tracking.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

import {
  GOOGLE_TAG_ID,
  GOOGLE_ADS_ID,
  GET_DIRECTIONS_CONVERSION_LABEL,
  GET_DIRECTIONS_SEND_TO,
  safeGtag,
  trackGetDirectionsConversion
} from '../src/utils/googleAds.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('GOOGLE ADS CONVERSION TRACKING VERIFICATION SUITE');
  console.log('================================================================\n');

  // ----------------------------------------------------------------------------
  // SECTION 1: CONFIGURATION & CONSTANTS INTEGRITY
  // ----------------------------------------------------------------------------
  console.log('--- SECTION 1: Google Ads Configuration Constants ---');
  assert(GOOGLE_TAG_ID === 'GTM-NSXP9B2R', 'Google Tag ID is GTM-NSXP9B2R');
  assert(GOOGLE_ADS_ID === 'AW-18535280527', 'Google Ads Conversion ID is AW-18535280527');
  assert(GET_DIRECTIONS_CONVERSION_LABEL === 'VgE0CPjI3bwdEI_fp4ZF', 'Conversion label is VgE0CPjI3bwdEI_fp4ZF');
  assert(GET_DIRECTIONS_SEND_TO === 'AW-18535280527/VgE0CPjI3bwdEI_fp4ZF', 'send_to is AW-18535280527/VgE0CPjI3bwdEI_fp4ZF');

  // ----------------------------------------------------------------------------
  // SECTION 2: HTML DOCUMENT TAG INSTALLATION
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Global HTML Document Verification ---');
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  assert(indexHtml.includes('https://www.googletagmanager.com/gtag/js?id=GTM-NSXP9B2R'), 'index.html loads gtag.js with GTM-NSXP9B2R');
  assert(indexHtml.includes("gtag('config', 'GTM-NSXP9B2R');"), 'index.html configures GTM-NSXP9B2R');
  assert(indexHtml.includes("gtag('config', 'AW-18535280527');"), 'index.html configures AW-18535280527');
  assert(indexHtml.includes('window.dataLayer = window.dataLayer || [];'), 'index.html initializes window.dataLayer');

  // Check built dist/index.html
  const distIndexHtml = fs.readFileSync(path.join(rootDir, 'dist', 'index.html'), 'utf8');
  assert(distIndexHtml.includes('https://www.googletagmanager.com/gtag/js?id=GTM-NSXP9B2R'), 'dist/index.html includes gtag.js');
  assert(distIndexHtml.includes("gtag('config', 'GTM-NSXP9B2R');"), 'dist/index.html configures GTM-NSXP9B2R');
  assert(distIndexHtml.includes("gtag('config', 'AW-18535280527');"), 'dist/index.html configures AW-18535280527');

  // ----------------------------------------------------------------------------
  // SECTION 3: BUNDLED ASSETS VERIFICATION
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Production Bundle Verification ---');
  const distAssetsDir = path.join(rootDir, 'dist', 'assets');
  const jsFiles = fs.readdirSync(distAssetsDir).filter((f) => f.endsWith('.js'));
  let bundleContainsConversionLabel = false;
  let bundleContainsSendTo = false;

  for (const jsFile of jsFiles) {
    const code = fs.readFileSync(path.join(distAssetsDir, jsFile), 'utf8');
    if (code.includes('VgE0CPjI3bwdEI_fp4ZF')) bundleContainsConversionLabel = true;
    if (code.includes('AW-18535280527/VgE0CPjI3bwdEI_fp4ZF')) bundleContainsSendTo = true;
  }
  assert(bundleContainsConversionLabel, 'Production bundle contains conversion label VgE0CPjI3bwdEI_fp4ZF');
  assert(bundleContainsSendTo, 'Production bundle contains send_to destination AW-18535280527/VgE0CPjI3bwdEI_fp4ZF');

  // ----------------------------------------------------------------------------
  // SECTION 4: CONVERSION EVENT DISPATCH & QUEUEING
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Conversion Event Dispatch & DataLayer Simulation ---');
  // Mock browser window environment
  global.window = {
    dataLayer: []
  };

  // 1. Initial state
  assert(window.dataLayer.length === 0, 'dataLayer is initially empty');

  // 2. Dispatch conversion
  const firedFirst = trackGetDirectionsConversion({ source: 'test-button' });
  assert(firedFirst === true, 'First Get Directions click dispatches conversion');
  assert(window.dataLayer.length === 1, 'dataLayer recorded exactly 1 event');

  const firstEvent = window.dataLayer[0];
  const eventName = firstEvent[0];
  const eventAction = firstEvent[1];
  const eventParams = firstEvent[2];

  assert(eventName === 'event', 'First parameter is "event"');
  assert(eventAction === 'conversion', 'Second parameter is "conversion"');
  assert(eventParams.send_to === 'AW-18535280527/VgE0CPjI3bwdEI_fp4ZF', 'send_to matches exact conversion ID and label');
  assert(Object.keys(eventParams).length === 1, 'Only send_to is sent (Zero PII or extra parameters)');

  // 3. Duplicate click prevention within cooldown
  const firedDuplicate = trackGetDirectionsConversion({ source: 'test-button' });
  assert(firedDuplicate === false, 'Rapid duplicate click is ignored by deduplication guard');
  assert(window.dataLayer.length === 1, 'dataLayer still has only 1 event (no duplicate)');

  // 4. Verification of safeGtag queueing before script loads
  assert(typeof window.gtag === 'function', 'window.gtag helper is defined');

  console.log('\n================================================================');
  console.log(`🎉 ALL TESTS COMPLETED: ${passedTests}/${totalTests} PASSED (100% SUCCESS)`);
  console.log('================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
