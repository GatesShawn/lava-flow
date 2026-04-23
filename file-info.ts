// Existing code...

class MDFileInfo {
    // Existing properties...
    frontmatter: Record<string, any> | null = null;

    parseFrontmatter(fileContent: string): void {
        const match = fileContent.match(/^---\n([\s\S]+?)\n---\n/);
        if (match) {
            const frontmatterStr = match[1];
            // Use a YAML parser to convert the frontmatter string into an object
            this.frontmatter = this.yamlToJson(frontmatterStr);
        }
    }

    yamlToJson(yamlStr: string): Record<string, any> {
        // Logic to parse YAML string to JSON object
        // This is a placeholder for whatever YAML parsing logic you want to use
        return {}; // Replace with actual parsing implementation
    }
    // Rest of the existing code...
}

// Existing code...