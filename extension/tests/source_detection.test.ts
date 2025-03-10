// extension/tests/source_detection.test.ts
// Tests for proper URL detection of different paper sources


import { parseId, formatPrimaryId } from '../papers/source_utils';

// Test URLs for each supported source
const TEST_URLS = {
  arxiv: [
    'https://arxiv.org/abs/2201.12345',
    'https://arxiv.org/pdf/2201.12345.pdf',
    'https://arxiv.org/html/2201.12345v2'
  ],
  semanticscholar: [
    'https://www.semanticscholar.org/paper/abcdef1234567890abcdef1234567890abcdef12',
    'https://s2-research.org/papers/abcdef1234567890abcdef1234567890abcdef12'
  ],
  doi: [
    'https://doi.org/10.1234/example-doi.2023',
    'https://doi.org/10.1145/3548606.3560596'
  ],
  acm: [
    'https://dl.acm.org/doi/10.1145/3548606.3560596',
    'https://dl.acm.org/doi/abs/10.1145/3548606.3560596'
  ],
  openreview: [
    'https://openreview.net/forum?id=abc123def456',
    'https://openreview.net/forum?id=Byg_3n4tPB'
  ]
};

// // Run test for each source type
// Object.entries(TEST_URLS).forEach(([sourceType, urls]) => {
//   console.log(`\n=== Testing ${sourceType} URL detection ===`);
  
//   urls.forEach(url => {
//     const result = MultiSourceDetector.detect(url);
//     const success = result && result.type === sourceType;
    
//     if (success) {
//       console.log(`✅ ${url} -> Detected as ${result.type} with ID: ${result.id}`);
//       console.log(`  Primary ID: ${result.primary_id}`);
//     } else {
//       console.error(`❌ ${url} -> ${result ? `Wrong type: ${result.type}` : 'Not detected'}`);
//     }
//   });
// });

// Test ID formatting and parsing
console.log('\n=== Testing ID formatting and parsing ===');

const TEST_IDS = [
  { source: 'arxiv', id: '2201.12345' },
  { source: 'doi', id: '10.1145/3548606.3560596' },
  { source: 'semanticscholar', id: 'abcdef1234567890abcdef1234567890abcdef12' }
];

TEST_IDS.forEach(test => {
  const primaryId = formatPrimaryId(test.source, test.id);
  console.log(`Test formatting: ${test.source} + ${test.id} -> ${primaryId}`);
  
  const parsed = parseId(primaryId);
  const parseSuccess = parsed.type === test.source && 
    (parsed.id === test.id || (test.source === 'doi' && parsed.id.replace(/\//g, '_') === test.id.replace(/\//g, '_')));
  
  if (parseSuccess) {
    console.log(`✅ Parsed correctly: ${parsed.type} + ${parsed.id}`);
  } else {
    console.error(`❌ Parse error: expected ${test.source}+${test.id}, got ${parsed.type}+${parsed.id}`);
  }
  
});
