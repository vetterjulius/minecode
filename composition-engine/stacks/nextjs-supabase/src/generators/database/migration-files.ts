const BASE_EPOCH_MS = Date.UTC(2026, 0, 1, 0, 0, 0);

export function migrationTimestamp(index: number): string {
  return new Date(BASE_EPOCH_MS + index * 1000).toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

export class MigrationSequence {
  private index: number;
  private readonly files: Record<string, string> = {};

  /** `start` continues the numbering of migrations generated earlier. */
  constructor(start = 0) {
    this.index = start;
  }

  public add(name: string, content: string): void {
    const file = `supabase/migrations/${migrationTimestamp(this.index)}_${name}.sql`;
    this.index += 1;
    this.files[file] = content;
  }

  public toFiles(): Record<string, string> {
    return this.files;
  }
}
