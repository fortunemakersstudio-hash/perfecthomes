// PERFECT HOMES & DEVELOPERS — SIMULATED USER FLOW INTERACTION TEST
// Verifies that only genuine Get Directions triggers conversion and others do not.

import { trackGetDirectionsConversion, initGlobalDirectionsTracking } from '../src/utils/googleAds.js';

let passed = 0;
let total = 0;

function assert(cond, msg) {
  total++;
  if (cond) {
    console.log(`  ✓ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    throw new Error(msg);
  }
}

async function testUserFlows() {
  console.log('================================================================');
  console.log('SIMULATED USER FLOW INTERACTION TEST');
  console.log('================================================================\n');

  const listeners = [];
  global.window = {
    dataLayer: [],
    addEventListener: (type, fn) => listeners.push({ type, fn }),
    removeEventListener: () => {}
  };
  global.document = {
    addEventListener: (type, fn) => listeners.push({ type, fn }),
    removeEventListener: () => {}
  };

  const cleanup = initGlobalDirectionsTracking();

  function simulateClick(element) {
    for (const l of listeners) {
      if (l.type === 'click') {
        l.fn({ target: element });
      }
    }
  }

  // TEST 1: Ordinary Page View (No click)
  console.log('--- Test 1: Page Navigation / View ---');
  assert(window.dataLayer.length === 0, 'Page view did NOT fire conversion');

  // TEST 2: WhatsApp Button Click
  console.log('\n--- Test 2: Unrelated WhatsApp Click ---');
  const waBtn = {
    closest: (selector) => waBtn,
    getAttribute: (attr) => attr === 'href' ? 'https://wa.me/917305023919' : null,
    textContent: 'Chat on WhatsApp'
  };
  simulateClick(waBtn);
  assert(window.dataLayer.length === 0, 'WhatsApp click did NOT fire conversion');

  // TEST 3: "View on Google Maps" Click (Location view, NOT directions)
  console.log('\n--- Test 3: "View on Google Maps" Click ---');
  const viewMapsBtn = {
    closest: (selector) => viewMapsBtn,
    getAttribute: (attr) => attr === 'href' ? 'https://www.google.com/maps/search/?api=1&query=13.124850%2C80.043786' : (attr === 'id' ? 'view-on-google-maps-btn' : null),
    textContent: 'View on Google Maps'
  };
  simulateClick(viewMapsBtn);
  assert(window.dataLayer.length === 0, '"View on Google Maps" click did NOT fire conversion');

  // TEST 4: Property Enquiry Submit Button
  console.log('\n--- Test 4: Property Enquiry Submission ---');
  const enquiryBtn = {
    closest: (selector) => enquiryBtn,
    getAttribute: (attr) => attr === 'type' ? 'submit' : null,
    textContent: 'Submit Property Inquiry'
  };
  simulateClick(enquiryBtn);
  assert(window.dataLayer.length === 0, 'Property enquiry submit did NOT fire conversion');

  // TEST 5: PDF Brochure Download Button
  console.log('\n--- Test 5: PDF Brochure Download ---');
  const pdfBtn = {
    closest: (selector) => pdfBtn,
    getAttribute: (attr) => attr === 'id' ? 'download-brochure-btn' : null,
    textContent: 'Download Official PDF Brochure'
  };
  simulateClick(pdfBtn);
  assert(window.dataLayer.length === 0, 'PDF download did NOT fire conversion');

  // TEST 6: Genuine Office "Get Directions" Click
  console.log('\n--- Test 6: Genuine Office "Get Directions" Click ---');
  const officeDirectionsBtn = {
    closest: (selector) => officeDirectionsBtn,
    getAttribute: (attr) => {
      if (attr === 'href') return 'https://www.google.com/maps/dir/?api=1&destination=13.124850%2C80.043786';
      if (attr === 'id') return 'get-directions-btn';
      if (attr === 'aria-label') return 'Get Directions to Office';
      return null;
    },
    textContent: 'Get Directions'
  };
  simulateClick(officeDirectionsBtn);
  assert(window.dataLayer.length === 1, 'Genuine "Get Directions" click FIRED conversion event');
  assert(window.dataLayer[0][0] === 'event', 'Payload type is event');
  assert(window.dataLayer[0][1] === 'conversion', 'Payload event name is conversion');
  assert(window.dataLayer[0][2].send_to === 'AW-18535280527/VgE0CPjI3bwdEI_fp4ZF', 'send_to matches exact Google Ads ID and Label');

  // TEST 7: Immediate Duplicate Click (Ignored)
  console.log('\n--- Test 7: Accidental Rapid Double Click ---');
  simulateClick(officeDirectionsBtn);
  assert(window.dataLayer.length === 1, 'Duplicate click was safely ignored by deduplication cooldown');

  // TEST 8: Genuine Property "Get Directions" Click (After cooldown)
  console.log('\n--- Test 8: Genuine Property "Get Directions" Click ---');
  await new Promise((r) => setTimeout(r, 1600)); // wait for cooldown
  const propertyDirectionsBtn = {
    closest: (selector) => propertyDirectionsBtn,
    getAttribute: (attr) => {
      if (attr === 'href') return 'https://www.google.com/maps/dir/?api=1&destination=Thiruninravur%2C%20Chennai';
      if (attr === 'id') return 'property-get-directions-ph-109';
      if (attr === 'aria-label') return 'Get Directions to Model Villa Aster';
      return null;
    },
    textContent: 'Get Directions'
  };
  simulateClick(propertyDirectionsBtn);
  assert(window.dataLayer.length === 2, 'Property "Get Directions" click FIRED conversion event');
  assert(window.dataLayer[1][2].send_to === 'AW-18535280527/VgE0CPjI3bwdEI_fp4ZF', 'Property conversion payload matches exact label');

  cleanup();

  console.log('\n================================================================');
  console.log(`🎉 ALL USER FLOW TESTS PASSED: ${passed}/${total} (100% SUCCESS)`);
  console.log('================================================================\n');
}

testUserFlows().catch((err) => {
  console.error('Flow test error:', err);
  process.exit(1);
});
