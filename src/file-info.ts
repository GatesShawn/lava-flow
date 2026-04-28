import { parseFrontmatter } from './frontmatter.js';

export abstract class FileInfo {
  originalFile: File;
  keys: string[] = [];
  directories: string[] = [];
  // @ts-expect-error
  journalPage: JournalEntryPage | null = null;
  extension: string | null = null;
  fileNameNoExt: string;

  abstract getLinkRegex(): RegExp[];
  abstract getLink(alias?: string | null): string | null;

  constructor(file: File) {
    this.originalFile = file;
    const nameParts = file.name.split('.');
    this.fileNameNoExt = nameParts[0];
  }

  static get(file: File): FileInfo {
    const nameParts = file.webkitRelativePath.split('.');
    const extension = nameParts[nameParts.length - 1];
    const fileInfo = extension === 'md' ? new MDFileInfo(file) : new OtherFileInfo(file);
    fileInfo.extension = extension;
    return fileInfo;
  }

  createKeys(fileName: string): void {
    this.directories = this.originalFile.webkitRelativePath.split('/');
    this.directories.pop(); // Remove file name
    for (let i = 0; i < this.directories.length; i++) {
      const prefixes = this.directories.slice(i);
      prefixes.push(fileName);
      this.keys.push(prefixes.join('/'));
    }
    this.keys.push(fileName);
  }

  isHidden(): boolean {
    return this.originalFile.webkitRelativePath.split('/').filter((s) => s[0] === '.').length > 0;
  }

  isCanvas(): boolean {
    return this.extension === 'canvas';
  }
}

export class MDFileInfo extends FileInfo {
  links: string[] = [];
  frontmatter: Record<string, any> | null = null;

  constructor(file: File) {
    super(file);
    this.createKeys(this.fileNameNoExt);
  }

  /**
   * Parses frontmatter from markdown content
   * @param content - The markdown file content
   */
  async parseFrontmatterFromContent(content: string): Promise<void> {
    const result = parseFrontmatter(content);
    if (result.success && result.data) {
      this.frontmatter = result.data;
    }
  }

  /**
   * Gets the document type from frontmatter, defaults to 'journal'
   */
  getDocumentType(): string {
    return this.frontmatter?.type ?? 'journal';
  }

  /**
   * Gets the document name from frontmatter or uses the file name
   */
  getDocumentName(): string {
    return this.frontmatter?.name ?? this.fileNameNoExt;
  }

  /**
   * Gets the target folder from frontmatter, if specified
   */
  getTargetFolder(): string | null {
    return this.frontmatter?.folder ?? null;
  }

  getLinkRegex(): RegExp[] {
    return this.keys.map((k) => new RegExp(`!?\\[\\[${k}(#[^\\]\\|]*)?(\\s*\\|[^\\]]*)?\\]\\]`, 'gi'));
  }

  getLink(alias: string | null = null): string | null {
    if (alias === null || alias.length < 1) return this.journalPage?.link ?? null;
    else
      return `@UUID[JournalEntry.${this.journalPage?.parent?.id}.JournalEntryPage.${
        this.journalPage?.id ?? ''
      }]{${alias}}`;
  }
}

export class OtherFileInfo extends FileInfo {
  uploadPath: string | null = null;

  constructor(file: File) {
    super(file);
    this.createKeys(file.name);
  }

  getLinkRegex(): RegExp[] {
    const obsidianPatterns = this.keys.map((k) => new RegExp(`!\\[\\[${k}(\\s*\\|[^\\]]*)?\\]\\]`, 'gi'));
    const altTextPatterns = this.keys.map((k) => new RegExp(`!\\[[^\\]]+\\]\\(${k}\\)`, 'gi'));
    return obsidianPatterns.concat(altTextPatterns);
  }

  getLink(): string | null {
    return `![${this.originalFile.name}](${encodeURI(this.uploadPath ?? '')})`;
  }
}
