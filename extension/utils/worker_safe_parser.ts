// extension/utils/worker_safe_parser.ts

/**
 * Simple XML parser that works in service worker environment
 */
export function parseXML(xmlText: string) {
  return {
    getTagContent(tag: string): string {
      const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 's');
      const match = xmlText.match(regex);
      return match ? match[1].trim() : '';
    },
    
    getAll(tag: string): string[] {
      const result: string[] = [];
      const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'gs');
      let match;
      while ((match = regex.exec(xmlText)) !== null) {
        result.push(match[1].trim());
      }
      return result;
    },
    
    getAttribute(tag: string, attr: string): string[] {
      const result: string[] = [];
      const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]+)"`, 'g');
      let match;
      while ((match = regex.exec(xmlText)) !== null) {
        result.push(match[1]);
      }
      return result;
    },
    
    getEntry(xmlText: string) {
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/;
      const entryMatch = xmlText.match(entryRegex);
      return entryMatch ? entryMatch[1] : '';
    },
    
    getAuthor(xmlText: string): string[] {
      const authors = [];
      const regex = /<author>[^]*?<name>([^]*?)<\/name>[^]*?<\/author>/g;
      let match;
      while (match = regex.exec(xmlText)) {
        authors.push(match[1].trim());
      }
      return authors;
    },
    
    getCategories(xmlText: string): string[] {
      const categories = new Set();
      
      const primaryMatch = xmlText.match(/<arxiv:primary_category[^>]*term="([^"]+)"/);
      if (primaryMatch) {
        categories.add(primaryMatch[1]);
      }
      
      const categoryRegex = /<category[^>]*term="([^"]+)"/g;
      let match;
      while (match = categoryRegex.exec(xmlText)) {
        categories.add(match[1]);
      }
      
      return Array.from(categories) as string[];
    },
    
    getPublishedDate(xmlText: string): string {
      const match = xmlText.match(/<published>([^<]+)<\/published>/);
      return match ? match[1].trim() : '';
    }
  };
}
