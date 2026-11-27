export class UnsupportedContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedContractError';
  }
}
