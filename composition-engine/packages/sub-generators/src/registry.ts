import { SubGenerator } from '@minecode/core';
import { SupabaseDatabaseSubGenerator } from './generators/supabase/database.js';
import { SupabaseGenericApiSubGenerator } from './generators/supabase/generic-api.js';
import { NextjsSupabaseAuthSubGenerator } from './generators/nextjs-supabase/auth.js';
import { NextjsSupabaseBillingSubGenerator } from './generators/nextjs-supabase/billing.js';
import { NextjsSupabaseOrgsSubGenerator } from './generators/nextjs-supabase/orgs.js';
import { NextjsSupabaseRbacSubGenerator } from './generators/nextjs-supabase/rbac.js';
import { NextjsGenericUiSubGenerator } from './generators/nextjs/generic-ui.js';
import { NextjsNavigationSubGenerator } from './generators/nextjs/navigation.js';
import { NextjsWorkspaceSubGenerator } from './generators/nextjs/workspace.js';
import { CommonEventsSubGenerator } from './generators/common/events.js';
import { CommonExtensionsSubGenerator } from './generators/common/extensions.js';

export const BUILTIN_SUB_GENERATORS: SubGenerator[] = [
  new SupabaseDatabaseSubGenerator(),
  new SupabaseGenericApiSubGenerator(),
  new NextjsSupabaseAuthSubGenerator(),
  new NextjsSupabaseBillingSubGenerator(),
  new NextjsSupabaseOrgsSubGenerator(),
  new NextjsSupabaseRbacSubGenerator(),
  new NextjsGenericUiSubGenerator(),
  new NextjsNavigationSubGenerator(),
  new NextjsWorkspaceSubGenerator(),
  new CommonEventsSubGenerator(),
  new CommonExtensionsSubGenerator(),
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
