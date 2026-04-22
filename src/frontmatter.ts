// Define interfaces for frontmatter data
interface FrontmatterData {
    type?: 'journal' | 'actor' | 'item' | 'scene' | 'rolltable';
    name?: string;
    folder?: string;
    [key: string]: any; // generic properties via index signature
}

interface FrontmatterParseResult {
    success: boolean;
    data?: FrontmatterData;
    error?: string;
}

/**
 * Extracts YAML frontmatter from markdown content.
 * @param content - The markdown content to parse.
 * @returns FrontmatterParseResult containing success flag, data object, and error message if any.
 */
function parseFrontmatter(content: string): FrontmatterParseResult {
    const frontmatterRegex = /---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);
    if (match) {
        const yamlString = match[1];
        // Here, a YAML parsing library would typically be used.
        // For example purposes, we will just simulate parsed data.
        try {
            const data: FrontmatterData = YAML.parse(yamlString); // Assume YAML is parsed correctly
            return { success: true, data: data };
        } catch (error) {
            return { success: false, error: 'Invalid YAML format.' };
        }
    }
    return { success: false, error: 'No frontmatter found.' };
}

/**
 * Validates if a document type is allowed by the frontmatter.
 * @param type - The document type to validate.
 * @returns boolean indicating if the type is valid.
 */
function validateFrontmatterType(type: string): boolean {
    const validTypes = ['journal', 'actor', 'item', 'scene', 'rolltable'];
    return validTypes.includes(type);
}