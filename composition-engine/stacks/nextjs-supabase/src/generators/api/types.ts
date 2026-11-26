import { ApiArtifact, DatabaseArtifact } from '@minecode/core';

/** What a behavior builder needs to emit its route code. */
export interface BehaviorContext {
  description: string;
  /** Route path without leading slash, for example `api/auth/login`. */
  routePath: string;
  /** Import path of the generated server Supabase client, relative to the route file. */
  serverClientImport: string;
  api: ApiArtifact;
}

/** Result of a behavior: route source (with imports) plus files the behavior needs. */
export interface BehaviorOutput {
  source: string;
  extraFiles?: Record<string, string>;
}

export type BehaviorBuilder = (ctx: BehaviorContext) => BehaviorOutput;

export type EntityIndex = Map<string, DatabaseArtifact>;
