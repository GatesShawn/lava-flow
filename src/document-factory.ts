// src/document-factory.ts

// Abstract base class for DocumentFactory
abstract class DocumentFactory<T> {
    abstract create(): Promise<T>;
}

// Concrete factory implementations

class JournalFactory extends DocumentFactory<Journal> {
    async create(): Promise<Journal> {
        // Implementation to create a Journal document
        return new Journal();
    }
}

class ActorFactory extends DocumentFactory<Actor> {
    async create(): Promise<Actor> {
        // Implementation to create an Actor document
        return new Actor();
    }
}

class ItemFactory extends DocumentFactory<Item> {
    async create(): Promise<Item> {
        // Implementation to create an Item document
        return new Item();
    }
}

class SceneFactory extends DocumentFactory<Scene> {
    async create(): Promise<Scene> {
        // Implementation to create a Scene document
        return new Scene();
    }
}

class RollTableFactory extends DocumentFactory<RollTable> {
    async create(): Promise<RollTable> {
        // Implementation to create a RollTable document
        return new RollTable();
    }
}

export { DocumentFactory, JournalFactory, ActorFactory, ItemFactory, SceneFactory, RollTableFactory };