export class RegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegistryError';
    Object.setPrototypeOf(this, RegistryError.prototype);
  }
}
