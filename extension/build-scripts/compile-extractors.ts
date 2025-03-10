// extension/build-scripts/compile-extractors.ts
// Script to compile extractor modules at build time

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { loguru } from '../utils/logger';

const logger = loguru.getLogger('ExtractorCompiler');

/**
 * Interface for extracted plugin info
 */
interface PluginInfo {
  id: string;
  extractorModulePath: string;
}

/**
 * Compile extractor modules from TypeScript to JavaScript
 * and create a registry of compiled extractors
 */
export async function compileExtractors() {
  const extractorsDir = path.join(__dirname, '../papers/plugins/extractors');
  const outputDir = path.join(__dirname, '../dist/extractors');
  const registryPath = path.join(__dirname, '../dist/extractors/registry.json');
  
  logger.info(`Compiling extractors from ${extractorsDir} to ${outputDir}`);
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Get all extractor files
  const extractorFiles = fs.readdirSync(extractorsDir)
    .filter(file => file.endsWith('.ts') && !file.endsWith('.d.ts'));
  
  logger.info(`Found ${extractorFiles.length} extractor files to compile`);
  
  // Compile each file
  const registry: Record<string, string> = {};
  
  for (const file of extractorFiles) {
    try {
      // Extract plugin ID from filename
      const pluginId = file.replace('_extractor.ts', '');
      
      // Read the TypeScript file
      const filePath = path.join(extractorsDir, file);
      const source = fs.readFileSync(filePath, 'utf8');
      
      // Compile to JavaScript
      const result = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2020,
          removeComments: true
        }
      });
      
      // Create output filename
      const outputFile = file.replace('.ts', '.js');
      const outputPath = path.join(outputDir, outputFile);
      
      // Write to output file
      fs.writeFileSync(outputPath, result.outputText);
      
      // Add to registry
      registry[pluginId] = outputFile;
      
      logger.info(`Compiled ${file} -> ${outputFile}`);
    } catch (error) {
      logger.error(`Error compiling ${file}: ${error}`);
    }
  }
  
  // Write the registry
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  logger.info(`Created extractor registry with ${Object.keys(registry).length} entries`);
  
  return Object.keys(registry).length;
}

/**
 * Import plugin configuration and extract extractor module paths
 */
async function extractPluginInfo(): Promise<PluginInfo[]> {
  const pluginsDir = path.join(__dirname, '../papers/plugins/sources');
  const pluginFiles = fs.readdirSync(pluginsDir)
    .filter(file => file.endsWith('_plugin.ts') && !file.endsWith('.d.ts'));
  
  const plugins: PluginInfo[] = [];
  
  for (const file of pluginFiles) {
    try {
      const filePath = path.join(pluginsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract plugin ID
      const idMatch = content.match(/id:\s*['"]([a-zA-Z0-9_-]+)['"]/);
      if (!idMatch) continue;
      
      const id = idMatch[1];
      
      // Extract extractor module path
      const pathMatch = content.match(/extractorModulePath:\s*['"]([^'"]+)['"]/);
      if (!pathMatch) continue;
      
      const extractorModulePath = pathMatch[1];
      
      plugins.push({ id, extractorModulePath });
      logger.info(`Found plugin ${id} with extractor path ${extractorModulePath}`);
    } catch (error) {
      logger.error(`Error processing plugin file ${file}: ${error}`);
    }
  }
  
  return plugins;
}

/**
 * Generate loader scripts for content script
 * This creates a script that loads the appropriate extractor based on the plugin ID
 */
async function generateLoaderScript(registry: Record<string, string>): Promise<void> {
  const outputDir = path.join(__dirname, '../dist/extractors');
  const loaderPath = path.join(outputDir, 'loader.js');
  
  // Create loader script content
  const loaderContent = `
// Generated extractor loader script
// This file is auto-generated - do not edit directly

// Registry of available extractors
const EXTRACTOR_REGISTRY = ${JSON.stringify(registry, null, 2)};

/**
 * Load an extractor module for a specific plugin
 * @param {string} pluginId - The ID of the plugin
 * @returns {Promise<Object|null>} - The extractor module or null if not found
 */
export async function loadExtractor(pluginId) {
  const extractorFile = EXTRACTOR_REGISTRY[pluginId];
  if (!extractorFile) {
    console.error(\`No extractor available for plugin: \${pluginId}\`);
    return null;
  }
  
  try {
    // Dynamic import the extractor module
    const module = await import(\`./\${extractorFile}\`);
    return module.default || module;
  } catch (error) {
    console.error(\`Error loading extractor for \${pluginId}: \${error}\`);
    return null;
  }
}

/**
 * Execute metadata extraction for a specific plugin
 * @param {string} pluginId - The ID of the plugin
 * @param {Document} document - The document to extract from
 * @param {string} url - The URL of the page
 * @returns {Promise<Object|null>} - The extracted metadata or null if extraction failed
 */
export async function extractMetadata(pluginId, document, url) {
  const extractor = await loadExtractor(pluginId);
  if (!extractor || !extractor.extractMetadata) {
    return null;
  }
  
  try {
    return await extractor.extractMetadata(document, url);
  } catch (error) {
    console.error(\`Error extracting metadata with \${pluginId} extractor: \${error}\`);
    return null;
  }
}

// Export the registry for inspection
export const registry = EXTRACTOR_REGISTRY;
`;

  // Write loader script
  fs.writeFileSync(loaderPath, loaderContent);
  logger.info(`Generated extractor loader script at ${loaderPath}`);
}

// Run as script if called directly
if (require.main === module) {
  compileExtractors()
    .then(count => {
      logger.info(`Successfully compiled ${count} extractors`);
      process.exit(0);
    })
    .catch(error => {
      logger.error(`Compilation failed: ${error}`);
      process.exit(1);
    });
}
