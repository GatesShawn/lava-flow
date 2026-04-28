/**
 * Link Converter Module
 * Handles conversion of document links for different Foundry document types
 * Supports: Journal, Actor, Item, Scene, RollTable, and other document types
 */

/**
 * Interface for tracking imported documents and their IDs
 */
interface DocumentReference {
  id: string;
  type: 'journal' | 'actor' | 'item' | 'scene' | 'rolltable' | string;
  name: string;
  uuid?: string;
}

/**
 * Interface for link conversion results
 */
interface LinkConversionResult {
  success: boolean;
  link: string | null;
  error?: string;
}

/**
 * Manages document ID caching and type-aware link conversion
 */
class LinkConverter {
  private static documentCache: Map<string, DocumentReference> = new Map();

  /**
   * Register a document in the cache for link conversion
   * @param name - The original document/file name (without extension)
   * @param documentId - The Foundry document ID
   * @param documentType - The Foundry document type
   * @param uuid - Optional UUID for the document
   */
  static registerDocument(
    name: string,
    documentId: string,
    documentType: string,
    uuid?: string,
  ): void {
    const normalizedName = this.normalizeName(name);
    this.documentCache.set(normalizedName, {
      id: documentId,
      type: documentType,
      name,
      uuid,
    });
  }

  /**
   * Clear the document cache
   */
  static clearCache(): void {
    this.documentCache.clear();
  }

  /**
   * Get a cached document reference by name
   * @param name - The document name to look up
   * @returns The DocumentReference or undefined if not found
   */
  static getDocumentReference(name: string): DocumentReference | undefined {
    const normalizedName = this.normalizeName(name);
    return this.documentCache.get(normalizedName);
  }

  /**
   * Normalize a document name for consistent cache lookups
   * Handles partial paths, different separators, etc.
   */
  private static normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\\/g, '/')
      .split('/')
      .pop() ?? ''; // Get last part after any path separators
  }

  /**
   * Convert an obsidian-style link to a Foundry UUID link based on document type
   * Supports: [[link]], [[link|alias]]
   * @param linkText - The link text (without the [[ ]] brackets)
   * @param targetType - The target document type
   * @param alias - Optional alias for the link
   * @returns LinkConversionResult with the converted link or error
   */
  static convertLink(linkText: string, targetType: string, alias?: string): LinkConversionResult {
    // Extract the actual link (before | if alias is inline)
    const cleanLink = linkText.split('|')[0].trim();

    // Look up the document in cache
    const docRef = this.getDocumentReference(cleanLink);

    if (!docRef) {
      return {
        success: false,
        link: null,
        error: `Document not found in cache: ${cleanLink}`,
      };
    }

    // Generate the appropriate link format based on document type
    const link = this.generateUUIDLink(docRef, alias);

    return {
      success: true,
      link,
    };
  }

  /**
   * Generate a Foundry UUID link for a document reference
   * Different document types use different UUID formats
   * @param docRef - The document reference to convert
   * @param alias - Optional text alias for the link
   * @returns The formatted UUID link
   */
  private static generateUUIDLink(docRef: DocumentReference, alias?: string): string {
    const aliasText = alias ? `{${alias}}` : '';

    switch (docRef.type.toLowerCase()) {
      case 'journal':
      case 'journalentry':
        // Journal links use special format with parent and page ID
        // Format: @UUID[JournalEntry.{parentId}.JournalEntryPage.{pageId}]
        return `@UUID[JournalEntry.${docRef.id}]${aliasText}`;

      case 'actor':
        // Actor links use simple UUID format
        // Format: @UUID[Actor.{id}]
        return `@UUID[Actor.${docRef.id}]${aliasText}`;

      case 'item':
        // Item links use simple UUID format
        // Format: @UUID[Item.{id}]
        return `@UUID[Item.${docRef.id}]${aliasText}`;

      case 'scene':
        // Scene links use simple UUID format
        // Format: @UUID[Scene.{id}]
        return `@UUID[Scene.${docRef.id}]${aliasText}`;

      case 'rolltable':
      case 'table':
        // RollTable links use simple UUID format
        // Format: @UUID[RollTable.{id}]
        return `@UUID[RollTable.${docRef.id}]${aliasText}`;

      case 'macro':
        // Macro links
        // Format: @UUID[Macro.{id}]
        return `@UUID[Macro.${docRef.id}]${aliasText}`;

      case 'playlist':
        // Playlist links
        // Format: @UUID[Playlist.{id}]
        return `@UUID[Playlist.${docRef.id}]${aliasText}`;

      default:
        // Fallback for unknown types - use provided UUID if available
        if (docRef.uuid) {
          return `@UUID[${docRef.uuid}]${aliasText}`;
        }
        // Otherwise construct a generic link
        return `@UUID[${docRef.type}.${docRef.id}]${aliasText}`;
    }
  }

  /**
   * Find and replace all links in a markdown string
   * @param content - The markdown content to process
   * @param targetType - The document type these links refer to (for type conversion)
   * @param linkRegex - Optional regex pattern to match links
   * @returns The processed content with converted links
   */
  static processLinksInContent(
    content: string,
    targetType: string,
    linkRegex?: RegExp,
  ): string {
    // Default regex matches obsidian-style links: [[link]] or [[link|alias]]
    const pattern = linkRegex ?? /!?\[\[([^\[\]]+?)(?:\|([^\[\]]+?))?\]\]/g;

    return content.replace(pattern, (match, linkText, alias) => {
      // Skip image links (start with !)
      if (match.startsWith('!')) return match;

      const result = this.convertLink(linkText, targetType, alias);
      return result.success ? result.link ?? match : match;
    });
  }

  /**
   * Extract all link references from markdown content
   * Returns array of link targets found
   * @param content - The markdown content to scan
   * @returns Array of link target names
   */
  static extractLinks(content: string): string[] {
    const links: string[] = [];
    // Match [[link]] or [[link|alias]] format
    const pattern = /!?\[\[([^\[\]]+?)(?:\|[^\[\]]+?)?\]\]/g;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      // Skip image links
      if (!match[0].startsWith('!')) {
        links.push(match[1].trim());
      }
    }

    return [...new Set(links)]; // Remove duplicates
  }

  /**
   * Check if a document exists in the cache by name
   * @param name - The document name to check
   * @returns True if document is cached, false otherwise
   */
  static hasDocument(name: string): boolean {
    return this.documentCache.has(this.normalizeName(name));
  }

  /**
   * Get all cached document references
   * @returns Array of all cached DocumentReferences
   */
  static getAllDocuments(): DocumentReference[] {
    return Array.from(this.documentCache.values());
  }

  /**
   * Get count of cached documents by type
   * @returns Object with counts by document type
   */
  static getDocumentCounts(): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const doc of this.documentCache.values()) {
      counts[doc.type] = (counts[doc.type] ?? 0) + 1;
    }

    return counts;
  }

  /**
   * Bulk register documents from an array of references
   * Useful for registering all imported documents at once
   * @param documents - Array of document references to register
   */
  static registerDocuments(documents: DocumentReference[]): void {
    for (const doc of documents) {
      this.registerDocument(doc.name, doc.id, doc.type, doc.uuid);
    }
  }

  /**
   * Find unresolved links in content
   * Returns links that exist in the content but not in the cache
   * @param content - The markdown content to scan
   * @returns Array of unresolved link names
   */
  static findUnresolvedLinks(content: string): string[] {
    const allLinks = this.extractLinks(content);
    return allLinks.filter((link) => !this.hasDocument(link));
  }
}

export { LinkConverter, DocumentReference, LinkConversionResult };
