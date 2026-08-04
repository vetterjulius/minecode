import { SubGenerator } from '@minecode/core';
import { DatabaseSubGenerator } from './generators/database.js';
import { AuthSubGenerator } from './generators/auth.js';
import { BillingSubGenerator } from './generators/billing.js';
import { OrgsSubGenerator } from './generators/orgs.js';
import { RbacSubGenerator } from './generators/rbac.js';
import { GenericApiSubGenerator } from './generators/generic-api.js';
import { GenericUiSubGenerator } from './generators/generic-ui.js';
import { NavigationSubGenerator } from './generators/navigation.js';
import { EventsSubGenerator } from './generators/events.js';
import { ExtensionsSubGenerator } from './generators/extensions.js';
import { WorkspaceSubGenerator } from './generators/workspace.js';

export const BUILTIN_SUB_GENERATORS: SubGenerator[] = [
  new DatabaseSubGenerator(),
  new AuthSubGenerator(),
  new BillingSubGenerator(),
  new OrgsSubGenerator(),
  new RbacSubGenerator(),
  new GenericApiSubGenerator(),
  new GenericUiSubGenerator(),
  new NavigationSubGenerator(),
  new EventsSubGenerator(),
  new ExtensionsSubGenerator(),
  new WorkspaceSubGenerator(),
];

export class SubGeneratorRegistry {
  private generators: Map<string, SubGenerator> = new Map();

  constructor() {
    for (const gen of BUILTIN_SUB_GENERATORS) {
      this.generators.set(gen.id, gen);
    }
  }

  public register(gen: SubGenerator): void {
    this.generators.set(gen.id, gen);
  }

  public get(id: string): SubGenerator | undefined {
    return this.generators.get(id);
  }

  public list(): SubGenerator[] {
    return Array.from(this.generators.values());
  }

  public has(id: string): boolean {
    return this.generators.has(id);
  }
}
