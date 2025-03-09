// extension/papers/metadata_service.ts - Paper metadata extraction service

import { loguru } from "../utils/logger";
import { DetectedSourceInfo } from './detection_service';

const logger = loguru.getLogger('MetadataService');

/**
 * Extract metadata from a detected source using its plugin
 * @param {DetectedSourceInfo} sourceInfo Source info with plugin
 * @returns {Promise<any|null>} Extracted metadata or null
 */
export async function extractMetadataFromSource(sourceInfo: DetectedSourceInfo): Promise<any | null> {
  if (!sourceInfo || !sourceInfo.plugin) {
    logger.info('No valid source info or plugin');
    return null;
  }
  
  try {
    // Try to use the plugin's API if available
    if (sourceInfo.plugin.hasApi && sourceInfo.plugin.fetchApiData) {
      try {
        logger.info(`Using ${sourceInfo.plugin.id} plugin API to extract metadata`);
        const apiData = await sourceInfo.plugin.fetchApiData(sourceInfo.id);
        
        if (apiData && Object.keys(apiData).length > 0) {
          // Ensure required fields are present
          return {
            ...apiData,
            source: sourceInfo.type,
            sourceId: sourceInfo.id,
            primary_id: sourceInfo.primary_id,
            url: sourceInfo.url
          };
        }
      } catch (apiError) {
        logger.error(`Error using plugin API: ${apiError}`);
      }
    }
    
    // Fall back to default minimal data
    return {
      source: sourceInfo.type,
      sourceId: sourceInfo.id,
      primary_id: sourceInfo.primary_id,
      url: sourceInfo.url,
      title: `${sourceInfo.type.toUpperCase()} Paper: ${sourceInfo.id}`,
      timestamp: new Date().toISOString(),
      rating: 'novote'
    };
  } catch (error) {
    logger.error(`Error extracting metadata: ${error}`);
    return null;
  }
}

/**
 * Extract metadata from DOM using plugin's extraction method
 * @param {number} tabId Tab ID for DOM access
 * @param {DetectedSourceInfo} sourceInfo Source info with plugin
 * @returns {Promise<any|null>} Extracted metadata or null
 */
export async function extractMetadataFromDOM(tabId: number, sourceInfo: DetectedSourceInfo): Promise<any | null> {
  if (!sourceInfo || !sourceInfo.plugin || !sourceInfo.plugin.extractMetadata) {
    return null;
  }
  
  try {
    logger.info(`Attempting DOM extraction for ${sourceInfo.type}`);
    
    // Execute script to get HTML document
    const script = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => document.documentElement.outerHTML
    });
    
    if (script && script[0] && script[0].result) {
      // Create DOM document from HTML for service worker context
      // Use non-DOM parser for service worker environment
      try {
        const htmlString = script[0].result as string;
        
        // Since we're in a service worker, we need to use a different approach for metadata extraction
        // Ask the plugin to extract metadata - must be a service worker safe implementation
        const metadata = await sourceInfo.plugin.extractMetadata({
          documentElement: { outerHTML: htmlString }
        }, sourceInfo.url);
        
        if (metadata && Object.keys(metadata).length > 0) {
          return {
            ...metadata,
            source: sourceInfo.type,
            sourceId: sourceInfo.id,
            primary_id: sourceInfo.primary_id,
            url: sourceInfo.url
          };
        }
      } catch (parserError) {
        logger.error(`Error parsing HTML in service worker: ${parserError}`);
        // Fall back to direct string content
        try {
          // Use a simpler approach - pass the HTML as a string
          const metadata = await sourceInfo.plugin.extractMetadata(
            { innerHTML: script[0].result },
            sourceInfo.url
          );
          
          if (metadata && Object.keys(metadata).length > 0) {
            return {
              ...metadata,
              source: sourceInfo.type,
              sourceId: sourceInfo.id,
              primary_id: sourceInfo.primary_id,
              url: sourceInfo.url
            };
          }
        } catch (fallbackError) {
          logger.error(`Error with fallback metadata extraction: ${fallbackError}`);
        }
      }
    }
  } catch (error) {
    logger.error(`Error extracting metadata from DOM: ${error}`);
  }
  
  return null;
}

/**
 * Process a paper URL to extract full metadata
 * @param {string} url URL to process
 * @param {DetectedSourceInfo} sourceInfo Source detection info
 * @param {number|null} tabId Optional tab ID for DOM access
 * @returns {Promise<any|null>} Full paper data or null
 */
export async function extractPaperMetadata(
  sourceInfo: DetectedSourceInfo, 
  tabId: number | null = null
): Promise<any | null> {
  try {
    if (!sourceInfo) {
      logger.info('No source info provided');
      return null;
    }
    
    logger.info(`Extracting metadata for ${sourceInfo.type} paper: ${sourceInfo.id}`);
    
    // Try API metadata extraction first
    let paperData = await extractMetadataFromSource(sourceInfo);
    
    // If API extraction failed or returned minimal data and we have a tab ID,
    // try DOM extraction as a fallback
    if (tabId && (!paperData || !paperData.title || paperData.title.includes(sourceInfo.id))) {
      logger.info('API extraction failed or returned minimal data, trying DOM extraction');
      const domData = await extractMetadataFromDOM(tabId, sourceInfo);
      
      if (domData) {
        // Merge API and DOM data, with DOM data taking precedence
        paperData = {
          ...paperData,
          ...domData,
          // Ensure critical fields are preserved
          source: sourceInfo.type,
          sourceId: sourceInfo.id,
          primary_id: sourceInfo.primary_id,
          url: sourceInfo.url
        };
      }
    }
    
    if (paperData) {
      logger.info(`Successfully extracted metadata: ${paperData.title || paperData.primary_id}`);
    }
    
    return paperData;
  } catch (error) {
    logger.error(`Error extracting paper metadata: ${error}`);
    return null;
  }
}
