// extension/papers/metadata_service.ts - Paper metadata extraction service

import { loguru } from "../utils/logger";
import { SourceInfo } from "../types/common";

// Extend SourceInfo to include plugin
export interface DetectedSourceInfoWithPlugin extends SourceInfo {
  plugin?: any;  // Associated plugin if available
}

const logger = loguru.getLogger('MetadataService');

/**
 * Extract metadata from a detected source using its plugin
 * @param {DetectedSourceInfoWithPlugin} sourceInfo Source info with plugin
 * @returns {Promise<any|null>} Extracted metadata or null
 */
export async function extractMetadataFromSource(sourceInfo: DetectedSourceInfoWithPlugin): Promise<any | null> {
  if (!sourceInfo || !sourceInfo.plugin) {
    logger.info('No valid source info or plugin');
    return null;
  }
  
  try {
    // Try to use the plugin's API if available through serviceWorker
    if (sourceInfo.plugin.serviceWorker && 
        sourceInfo.plugin.serviceWorker.fetchApiData) {
      try {
        logger.info(`Using ${sourceInfo.plugin.id} plugin API to extract metadata`);
        const apiData = await sourceInfo.plugin.serviceWorker.fetchApiData(sourceInfo.id);
        
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
 * @param {DetectedSourceInfoWithPlugin} sourceInfo Source info with plugin
 * @returns {Promise<any|null>} Extracted metadata or null
 */
export async function extractMetadataFromDOM(tabId: number, sourceInfo: DetectedSourceInfoWithPlugin): Promise<any | null> {
  if (!sourceInfo || !sourceInfo.plugin || 
      !sourceInfo.plugin.contentScript ||
      !sourceInfo.plugin.contentScript.extractorModulePath) {
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
        // Load the extractor dynamically based on the module path
        const extractorModule = sourceInfo.plugin.contentScript.extractorModulePath;
        
        // For now, just return minimal data with note about dynamic loading
        return {
          source: sourceInfo.type,
          sourceId: sourceInfo.id,
          primary_id: sourceInfo.primary_id,
          url: sourceInfo.url,
          title: `${sourceInfo.type.toUpperCase()} Paper: ${sourceInfo.id}`,
          _note: `Would load extractor from: ${extractorModule}`
        };
      } catch (parserError) {
        logger.error(`Error parsing HTML in service worker: ${parserError}`);
        return null;
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
 * @param {DetectedSourceInfoWithPlugin} sourceInfo Source detection info
 * @param {number|null} tabId Optional tab ID for DOM access
 * @returns {Promise<any|null>} Full paper data or null
 */
export async function extractPaperMetadata(
  sourceInfo: DetectedSourceInfoWithPlugin, 
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
