import { FrontmatterData } from './frontmatter.js';

/**
 * Interface for document creation options passed to factories
 */
interface DocumentCreationOptions {
  name: string;
  content: string;
  parentFolder: Folder | null;
  frontmatter: FrontmatterData | null;
  playerObserve: boolean;
}

/**
 * Base abstract class for document factories
 */
abstract class DocumentFactory {
  /**
   * Creates a document of the appropriate type
   * @param options - The options for creating the document
   * @returns Promise resolving to the created document
   */
  abstract create(options: DocumentCreationOptions): Promise<any>;

  /**
   * Helper method to create or get a folder by name
   */
  protected async getOrCreateFolder(folderName: string, parentFolderId?: string): Promise<Folder | null> {
    if (!folderName) return null;

    const existingFolder = (game as Game).folders?.find(
      (f: Folder) => f.name === folderName && f.type === 'JournalEntry' && f.parent?.id === parentFolderId,
    );

    if (existingFolder) return existingFolder as Folder;

    const newFolder = await Folder.create(
      {
        name: folderName,
        type: 'JournalEntry',
        parent: parentFolderId ?? null,
      },
      { render: false },
    );

    return newFolder as Folder;
  }
}

/**
 * Factory for creating Journal documents from markdown
 */
class JournalFactory extends DocumentFactory {
  async create(options: DocumentCreationOptions): Promise<JournalEntry> {
    const journalName = options.name;

    const entryData: any = {
      name: journalName,
      folder: options.parentFolder?.id,
      ...(options.playerObserve && {
        ownership: { default: (CONST as any).DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
      }),
    };

    const entry = (await JournalEntry.create(entryData)) ?? new JournalEntry();
    await entry.setFlag('lava-flow', 'lavaFlowJournalEntry', true);

    // Create journal page with markdown content
    // @ts-expect-error
    const page = await JournalEntryPage.create(
      {
        name: journalName,
        // @ts-expect-error
        text: { markdown: options.content, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.MARKDOWN },
      },
      { parent: entry },
    );
    await page.setFlag('core', 'sheetClass', 'core.MarkdownJournalPageSheet');

    return entry;
  }
}

/**
 * Factory for creating Actor documents from markdown
 */
class ActorFactory extends DocumentFactory {
  async create(options: DocumentCreationOptions): Promise<Actor> {
    const actorName = options.name;
    const frontmatter = options.frontmatter;

    // Determine actor type from frontmatter or default to 'character'
    const actorType = frontmatter?.actorType ?? 'character';

    const actorData: any = {
      name: actorName,
      type: actorType,
      folder: options.parentFolder?.id,
      ...(options.playerObserve && {
        ownership: { default: (CONST as any).DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
      }),
    };

    // Add system-specific data from frontmatter if available
    if (frontmatter?.system) {
      actorData.system = frontmatter.system;
    }

    // Create the actor
    const actor = (await Actor.create(actorData)) ?? new Actor();
    await actor.setFlag('lava-flow', 'lavaFlowImported', true);

    // Add biography/description from markdown content
    if (options.content) {
      await actor.update({
        // @ts-expect-error
        details: { biography: { value: options.content } },
      });
    }

    // Add portrait/image if provided in frontmatter
    if (frontmatter?.img) {
      await actor.update({ img: frontmatter.img });
    }

    return actor;
  }
}

/**
 * Factory for creating Item documents from markdown
 */
class ItemFactory extends DocumentFactory {
  async create(options: DocumentCreationOptions): Promise<Item> {
    const itemName = options.name;
    const frontmatter = options.frontmatter;

    // Determine item type from frontmatter or default to 'weapon'
    const itemType = frontmatter?.itemType ?? 'weapon';

    const itemData: any = {
      name: itemName,
      type: itemType,
      // @ts-expect-error
      folder: options.parentFolder?.id,
    };

    // Add system-specific data from frontmatter if available
    if (frontmatter?.system) {
      itemData.system = frontmatter.system;
    }

    // Create the item
    const item = (await Item.create(itemData)) ?? new Item();
    await item.setFlag('lava-flow', 'lavaFlowImported', true);

    // Add description from markdown content
    if (options.content) {
      // @ts-expect-error
      await item.update({ system: { description: { value: options.content } } });
    }

    // Add image if provided in frontmatter
    if (frontmatter?.img) {
      await item.update({ img: frontmatter.img });
    }

    return item;
  }
}

/**
 * Factory for creating Scene documents from markdown
 */
class SceneFactory extends DocumentFactory {
  async create(options: DocumentCreationOptions): Promise<Scene> {
    const sceneName = options.name;
    const frontmatter = options.frontmatter;

    const sceneData: any = {
      name: sceneName,
      folder: options.parentFolder?.id,
      // Get dimensions from frontmatter or use defaults
      width: frontmatter?.width ?? 3000,
      height: frontmatter?.height ?? 3000,
      // Get grid settings from frontmatter or use defaults
      // @ts-expect-error
      grid: {
        distance: frontmatter?.gridDistance ?? 100,
        type: frontmatter?.gridType ?? (CONST as any).GRID_TYPES.SQUARE,
      },
    };

    // Add background image if provided
    if (frontmatter?.background) {
      sceneData.background = { src: frontmatter.background };
    }

    // Create the scene
    const scene = (await Scene.create(sceneData)) ?? new Scene();
    await scene.setFlag('lava-flow', 'lavaFlowImported', true);

    // Add notes from markdown content as scene notes or description
    if (options.content) {
      // Store content in a flag since scenes don't have a description field
      await scene.setFlag('lava-flow', 'importedNotes', options.content);
    }

    return scene;
  }
}

/**
 * Factory for creating RollTable documents from markdown
 */
class RollTableFactory extends DocumentFactory {
  async create(options: DocumentCreationOptions): Promise<RollTable> {
    const tableName = options.name;
    const frontmatter = options.frontmatter;

    const tableData: any = {
      name: tableName,
      folder: options.parentFolder?.id,
      formula: frontmatter?.formula ?? '1d100',
      replacement: frontmatter?.replacement ?? true,
      displayRoll: frontmatter?.displayRoll ?? true,
    };

    // Create the roll table
    const table = (await RollTable.create(tableData)) ?? new RollTable();
    await table.setFlag('lava-flow', 'lavaFlowImported', true);

    // Parse markdown table format and create entries if content is a table
    if (options.content) {
      const entries = this.parseTableEntries(options.content);
      if (entries.length > 0) {
        // @ts-expect-error
        for (const entry of entries) {
          await table.createEmbeddedDocuments('TableResult', [entry]);
        }
      }
    }

    return table;
  }

  /**
   * Parse markdown table format into roll table entries
   * Expected format:
   * | Roll | Result |
   * |------|--------|
   * | 1-5  | Entry A |
   * | 6-10 | Entry B |
   */
  private parseTableEntries(content: string): Array<{ range: [number, number]; text: string }> {
    const entries: Array<{ range: [number, number]; text: string }> = [];
    const lines = content.split('\n');

    // Skip header and separator rows
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || !line.startsWith('|')) continue;

      const cells = line
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell) => cell);

      if (cells.length >= 2) {
        const rollRange = cells[0];
        const result = cells[1];

        // Parse range (e.g., "1-5" or "1")
        const rangeParts = rollRange.split('-');
        let min = parseInt(rangeParts[0]);
        let max = rangeParts.length > 1 ? parseInt(rangeParts[1]) : min;

        if (!isNaN(min) && !isNaN(max)) {
          entries.push({
            range: [min, max],
            text: result,
          });
        }
      }
    }

    return entries;
  }
}

export { DocumentFactory, JournalFactory, ActorFactory, ItemFactory, SceneFactory, RollTableFactory };
