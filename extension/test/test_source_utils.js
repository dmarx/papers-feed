// extension/test/test_source_utils.js
// Simple test cases for source utilities

import { 
  formatPrimaryId, 
  parseId, 
  getLegacyId, 
  detectSourceFromUrl 
} from '../papers/source_utils';

/**
 * Run basic tests for source utilities
 */
function runTests() {
  console.log('=== Running source_utils tests ===');
  testFormatPrimaryId();
  testParseId();
  testGetLegacyId();
  testDetectSourceFromUrl();
}

/**
 * Test formatPrimaryId function
 */
function testFormatPrimaryId() {
  console.log('\nTesting formatPrimaryId:');
  
  const testCases = [
    { source: 'arxiv', id: '2104.08050', expected: 'arxiv.2104.08050' },
    { source: 'doi', id: '10.1145/3548606.3560644', expected: 'doi.10.1145_3548606.3560644' },
    { source: 'semanticscholar', id: 'eff9b68b69a176d04f9737520c4e8770d7106df5', expected: 's2.eff9b68b69a176d04f9737520c4e8770d7106df5' },
    { source: 'acm', id: '10.1145/3548606.3560644', expected: 'doi.10.1145_3548606.3560644' },
    { source: 'openreview', id: 'ByxPYjC5tX', expected: 'openreview.ByxPYjC5tX' },
    { source: 'unknown', id: 'abcd1234', expected: 'generic.abcd1234' }
  ];
  
  for (const { source, id, expected } of testCases) {
    const result = formatPrimaryId(source, id);
    const passed = result === expected;
    
    console.log(
      `${passed ? '✓' : '✗'} formatPrimaryId('${source}', '${id}') = '${result}'` +
      (passed ? '' : ` (expected '${expected}')`)
    );
  }
}

/**
 * Test parseId function
 */
function testParseId() {
  console.log('\nTesting parseId:');
  
  const testCases = [
    { 
      primaryId: 'arxiv.2104.08050', 
      expected: { type: 'arxiv', id: '2104.08050' } 
    },
    { 
      primaryId: 'doi.10.1145_3548606.3560644', 
      expected: { type: 'doi', id: '10.1145/3548606.3560644' } 
    },
    { 
      primaryId: 's2.eff9b68b69a176d04f9737520c4e8770d7106df5', 
      expected: { type: 'semanticscholar', id: 'eff9b68b69a176d04f9737520c4e8770d7106df5' } 
    },
    { 
      primaryId: 'openreview.ByxPYjC5tX', 
      expected: { type: 'openreview', id: 'ByxPYjC5tX' } 
    },
    { 
      primaryId: 'generic.abcd1234', 
      expected: { type: 'generic', id: 'abcd1234' } 
    }
  ];
  
  for (const { primaryId, expected } of testCases) {
    const result = parseId(primaryId);
    const typeMatches = result.type === expected.type;
    const idMatches = result.id === expected.id;
    const passed = typeMatches && idMatches;
    
    console.log(
      `${passed ? '✓' : '✗'} parseId('${primaryId}') = ` +
      `{ type: '${result.type}', id: '${result.id}' }` +
      (passed ? '' : ` (expected { type: '${expected.type}', id: '${expected.id}' })`)
    );
  }
}

/**
 * Test getLegacyId function
 */
function testGetLegacyId() {
  console.log('\nTesting getLegacyId:');
  
  const testCases = [
    // ArXiv IDs should return just the ID part
    { primaryId: 'arxiv.2104.08050', expected: '2104.08050' },
    // Non-arXiv IDs should stay prefixed to avoid collisions
    { primaryId: 'doi.10.1145_3548606.3560644', expected: 'doi.10.1145_3548606.3560644' },
    { primaryId: 's2.eff9b68b69a176d04f9737520c4e8770d7106df5', expected: 's2.eff9b68b69a176d04f9737520c4e8770d7106df5' },
    // Legacy IDs (no prefix) should remain unchanged
    { primaryId: '2104.08050', expected: '2104.08050' }
  ];
  
  for (const { primaryId, expected } of testCases) {
    const result = getLegacyId(primaryId);
    const passed = result === expected;
    
    console.log(
      `${passed ? '✓' : '✗'} getLegacyId('${primaryId}') = '${result}'` +
      (passed ? '' : ` (expected '${expected}')`)
    );
  }
}

/**
 * Test detectSourceFromUrl function
 */
function testDetectSourceFromUrl() {
  console.log('\nTesting detectSourceFromUrl:');
  
  const testCases = [
    { 
      url: 'https://arxiv.org/abs/2104.08050', 
      expected: { type: 'arxiv', id: '2104.08050' } 
    },
    { 
      url: 'https://arxiv.org/pdf/2104.08050.pdf', 
      expected: { type: 'arxiv', id: '2104.08050' } 
    },
    { 
      url: 'https://www.semanticscholar.org/paper/eff9b68b69a176d04f9737520c4e8770d7106df5', 
      expected: { type: 'semanticscholar', id: 'eff9b68b69a176d04f9737520c4e8770d7106df5' } 
    },
    { 
      url: 'https://doi.org/10.1145/3548606.3560644', 
      expected: { type: 'doi', id: '10.1145/3548606.3560644' } 
    },
    { 
      url: 'https://dl.acm.org/doi/10.1145/3548606.3560644', 
      expected: { type: 'acm', id: '10.1145/3548606.3560644' } 
    },
    { 
      url: 'https://example.com/not-a-paper', 
      expected: null 
    }
  ];
  
  for (const { url, expected } of testCases) {
    const result = detectSourceFromUrl(url);
    
    if (expected === null) {
      const passed = result === null;
      console.log(
        `${passed ? '✓' : '✗'} detectSourceFromUrl('${url}') = null` +
        (passed ? '' : ` (got ${JSON.stringify(result)})`)
      );
    } else {
      const typeMatches = result && result.type === expected.type;
      const idMatches = result && result.id === expected.id;
      const passed = typeMatches && idMatches;
      
      console.log(
        `${passed ? '✓' : '✗'} detectSourceFromUrl('${url}') type: '${result?.type}', id: '${result?.id}'` +
        (passed ? '' : ` (expected type: '${expected.type}', id: '${expected.id}')`)
      );
    }
  }
}

// Run all tests
runTests();
