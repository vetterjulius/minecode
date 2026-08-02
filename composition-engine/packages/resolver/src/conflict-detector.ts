import { Feature } from '@minecode/core';

export class FeatureConflictError extends Error {
  public readonly conflicts: string[];

  constructor(message: string, conflicts: string[]) {
    const fullMessage = `${message}:\n${conflicts.map((c) => `  - ${c}`).join('\n')}`;
    super(fullMessage);
    this.name = 'FeatureConflictError';
    this.conflicts = conflicts;
    Object.setPrototypeOf(this, FeatureConflictError.prototype);
  }
}

export class FeatureConflictDetector {
  /**
   * Scans a list of resolved features for conflicts.
   * Throws FeatureConflictError if any conflicts are detected.
   */
  public detect(features: Feature[], stackId: string = 'nextjs-supabase'): void {
    const conflicts: string[] = [];
    const resolvedStackId = stackId || 'nextjs-supabase';

    // 1. Check for duplicate capabilities (incompatible providers)
    // Map of capability -> list of feature IDs that provide it
    const capabilityProviders = new Map<string, string[]>();

    for (const feature of features) {
      const caps = feature.contract.provides?.capabilities || [];
      for (const cap of caps) {
        if (!capabilityProviders.has(cap)) {
          capabilityProviders.set(cap, []);
        }
        capabilityProviders.get(cap)!.push(feature.id);
      }
    }

    for (const [cap, providers] of capabilityProviders.entries()) {
      if (providers.length > 1) {
        conflicts.push(
          `Duplicate capability '${cap}' provided by multiple features: ${providers.join(', ')}.`
        );
      }
    }

    // 2. Check for explicit conflicts
    const featureIds = new Set(features.map((f) => f.id));

    for (const feature of features) {
      const explicitConflicts = feature.contract.conflicts;
      if (!explicitConflicts) continue;

      // Explicit feature conflicts
      if (explicitConflicts.features) {
        for (const conflictingFeatureId of explicitConflicts.features) {
          if (featureIds.has(conflictingFeatureId) && conflictingFeatureId !== feature.id) {
            conflicts.push(
              `Feature '${feature.id}' explicitly conflicts with feature '${conflictingFeatureId}'.`
            );
          }
        }
      }

      // Explicit capability conflicts
      if (explicitConflicts.capabilities) {
        for (const conflictingCap of explicitConflicts.capabilities) {
          const providers = capabilityProviders.get(conflictingCap) || [];
          // Exclude itself if it also provides that capability
          const otherProviders = providers.filter((pId) => pId !== feature.id);
          if (otherProviders.length > 0) {
            conflicts.push(
              `Feature '${feature.id}' explicitly conflicts with capability '${conflictingCap}' provided by: ${otherProviders.join(', ')}.`
            );
          }
        }
      }
    }

    // 3. Check for unsupported stack combinations (direct and transitive)
    for (const feature of features) {
      const supportedStacks = feature.metadata.stack || [];
      if (supportedStacks.length > 0) {
        const supportsSelectedStack =
          supportedStacks.includes(resolvedStackId) || supportedStacks.includes('*');
        if (!supportsSelectedStack) {
          conflicts.push(
            `Feature '${feature.id}' is not compatible with selected stack '${resolvedStackId}'. Supported stacks: ${supportedStacks.join(', ')}.`
          );
        }
      }
    }

    if (conflicts.length > 0) {
      throw new FeatureConflictError('Feature conflicts detected', conflicts);
    }
  }
}
