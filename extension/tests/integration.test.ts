// extension/tests/integration.test.ts
// Integration test for the end-to-end flow

import { GitHubStoreClient } from 'gh-store-client';
import { PaperManager } from '../papers/manager';
import { MultiSourceDetector } from '../papers/detector';
import { ReadingSessionData } from '../papers/types';

/**
 * Mocked GitHub client for testing
 */
class MockGitHubClient {
  storage: Map<string, any> = new Map();
  
  async getObject(objectId: string) {
    if (!this.storage.has(objectId)) {
      throw new Error(`No object found with ID: ${objectId}`);
    }
    return {
      meta: { objectId },
      data: this.storage.get(objectId)
    };
  }
  
  async createObject(objectId: string, data: any) {
    this.storage.set(objectId, data);
    return {
      meta: { objectId },
      data
    };
  }
  
  async updateObject(objectId: string, data: any) {
    if (!this.storage.has(objectId)) {
      throw new Error(`No object found with ID: ${objectId}`);
    }
    this.storage.set(objectId, data);
    return {
      meta: { objectId },
      data
    };
  }
}

async function runIntegrationTest() {
  console.log('=== Running end-to-end integration test ===');
  
  // Initialize with mock client
  const mockClient = new MockGitHubClient() as unknown as GitHubStoreClient;
  const paperManager = new PaperManager(mockClient);
  
  // Test cases: different source types
  const testCases = [
    {
      name: 'arXiv paper',
      url: 'https://arxiv.org/abs/2201.12345',
      paperData: {
        arxivId: '2201.12345',
        title: 'Test arXiv Paper',
        authors: 'Test Author 1, Test Author 2',
        abstract: 'This is a test abstract for arXiv paper',
        url: 'https://arxiv.org/abs/2201.12345',
      }
    },
    {
      name: 'DOI paper',
      url: 'https://doi.org/10.1145/3548606.3560596',
      paperData: {
        source: 'doi',
        sourceId: '10.1145/3548606.3560596',
        primary_id: 'doi.10.1145_3548606.3560596',
        title: 'Test DOI Paper',
        authors: 'Test Author 3, Test Author 4',
        abstract: 'This is a test abstract for DOI paper',
        url: 'https://doi.org/10.1145/3548606.3560596',
      }
    },
    {
      name: 'Semantic Scholar paper',
      url: 'https://www.semanticscholar.org/paper/abcdef1234567890abcdef1234567890abcdef12',
      paperData: {
        source: 'semanticscholar',
        sourceId: 'abcdef1234567890abcdef1234567890abcdef12',
        primary_id: 's2.abcdef1234567890abcdef1234567890abcdef12',
        title: 'Test S2 Paper',
        authors: 'Test Author 5, Test Author 6',
        abstract: 'This is a test abstract for Semantic Scholar paper',
        url: 'https://www.semanticscholar.org/paper/abcdef1234567890abcdef1234567890abcdef12',
      }
    }
  ];

  // Test each case
  for (const testCase of testCases) {
    console.log(`\nTesting case: ${testCase.name}`);
    
    // 1. Test URL detection
    // ...
    
    // 2. Store paper
    const storedPaper = await paperManager.getOrCreatePaper(testCase.paperData);
    console.log(`✅ Paper stored with ID: ${storedPaper.primary_id || storedPaper.arxivId}`);
    
    // 3. Create reading session
    const sessionData: ReadingSessionData = {
      session_id: `test_session_${Date.now()}`,
      duration_seconds: 300,
      idle_seconds: 30,
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 330000).toISOString(),
      total_elapsed_seconds: 330
    };
    
    // Use appropriate ID based on paper type
    const trackingId = storedPaper.arxivId || storedPaper.sourceId;
    
    await paperManager.logReadingSession(trackingId, sessionData, storedPaper);
    console.log(`✅ Reading session logged for: ${trackingId}`);
    
    // 4. Add annotation
    await paperManager.logAnnotation(trackingId, 'test_note', 'This is a test note', storedPaper);
    console.log(`✅ Annotation logged for: ${trackingId}`);
    
    // 5. Update rating
    await paperManager.updateRating(trackingId, 'thumbsup', storedPaper);
    console.log(`✅ Rating updated for: ${trackingId}`);
    
    // 6. Verify storage
    try {
      const objectId = testCase.paperData.arxivId 
        ? `paper:${testCase.paperData.arxivId}`
        : `paper:${testCase.paperData.primary_id}`;
      
      const verifiedPaper = await mockClient.getObject(objectId);
      console.log(`✅ Verified paper data in storage: ${objectId}`);
      
      // Type assertion to handle Json type
      const paperData = verifiedPaper.data as Record<string, any>;
      console.log(`  Title: ${paperData.title}`);
      console.log(`  Rating: ${paperData.rating}`);
    } catch (error) {
      console.error(`❌ Failed to verify paper in storage: ${error}`);
    }
  }
  
  console.log('\n=== Test complete ===');
}

// Run the test
runIntegrationTest().catch(error => {
  console.error('Test failed with error:', error);
});
