// extension/utils/environment.ts
// Utilities to help with service worker vs. content script environment

/**
 * Determine if we're in a service worker context
 * @returns boolean 
 */
export function isServiceWorkerContext(): boolean {
  return (
    typeof self !== 'undefined' && 
    typeof window === 'undefined' &&
    // Check for service worker context without using WorkerGlobalScope
    'clients' in self
  );
}

/**
 * Determine if we're in a content script context
 * @returns boolean
 */
export function isContentScriptContext(): boolean {
  return (
    typeof window !== 'undefined' && 
    typeof document !== 'undefined' && 
    typeof chrome !== 'undefined' &&
    typeof chrome.runtime !== 'undefined'
  );
}

/**
 * Safe global object reference that works in both service workers and content scripts
 */
export const globalObj = (typeof self !== 'undefined' ? self : 
                          typeof window !== 'undefined' ? window : 
                          typeof global !== 'undefined' ? global : {}) as any;

/**
 * Safe console.log that works in both environments
 * @param message Message to log
 * @param args Additional arguments
 */
export function safeLog(message: string, ...args: any[]): void {
  if (typeof console !== 'undefined' && console.log) {
    console.log(message, ...args);
  }
}

/**
 * Safe fetch implementation that works in both environments
 * @param url URL to fetch
 * @param options Fetch options
 * @returns Promise with Response
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  if (isServiceWorkerContext()) {
    return self.fetch(url, options);
  } else if (isContentScriptContext()) {
    return window.fetch(url, options);
  } else {
    throw new Error('Unknown context, cannot fetch');
  }
}

/**
 * Get the appropriate Document Parser for the current environment
 * @param htmlString HTML to parse in service workers
 * @returns Document-like object
 */
export function getEnvironmentSafeParser(htmlString?: string): any {
  if (isServiceWorkerContext()) {
    // In service workers, we need to use our own parser
    const { createServiceWorkerDOM } = require('./service_worker_parser');
    return htmlString ? createServiceWorkerDOM(htmlString) : null;
  } else if (isContentScriptContext()) {
    // In content scripts, we can use the actual DOM
    return document;
  } else {
    throw new Error('Unknown context, cannot get parser');
  }
}

/**
 * Parse XML in a way that's safe for the current environment
 * @param xmlString XML to parse
 * @returns Parsed XML
 */
export function parseXMLSafely(xmlString: string): any {
  if (isServiceWorkerContext()) {
    // In service workers, use our regex-based parser
    const { parseXMLInServiceWorker } = require('./service_worker_parser');
    return parseXMLInServiceWorker(xmlString);
  } else if (isContentScriptContext()) {
    // In content scripts, we can use the actual DOM parser
    const parser = new DOMParser();
    return parser.parseFromString(xmlString, 'text/xml');
  } else {
    throw new Error('Unknown context, cannot parse XML');
  }
}
