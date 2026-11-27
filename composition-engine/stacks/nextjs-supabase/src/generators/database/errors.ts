export class SchemaGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaGenerationError';
  }
}
