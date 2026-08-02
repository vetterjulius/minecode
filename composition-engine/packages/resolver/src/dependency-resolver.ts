import semver from 'semver';
import { Blueprint, Feature } from '@minecode/core';
import { FileSystemRegistry } from '@minecode/registry';

export class DependencyResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DependencyResolutionError';
    Object.setPrototypeOf(this, DependencyResolutionError.prototype);
  }
}

export class CircularDependencyError extends DependencyResolutionError {
  public readonly cyclePath: string[];

  constructor(cyclePath: string[]) {
    const cycleString = cyclePath.join(' -> ');
    super(`Circular dependency detected: ${cycleString}`);
    this.name = 'CircularDependencyError';
    this.cyclePath = cyclePath;
    Object.setPrototypeOf(this, CircularDependencyError.prototype);
  }
}

export class FeatureDependencyResolver {
  private registry: FileSystemRegistry;

  constructor(registry: FileSystemRegistry) {
    this.registry = registry;
  }

  /**
   * Resolves an application blueprint into a deterministic, topologically sorted list of features.
   * Throws DependencyResolutionError or CircularDependencyError if resolution fails.
   */
  public resolve(blueprint: Blueprint): Feature[] {
    const resolvedFeatures: Feature[] = [];
    const visited = new Set<string>();
    const visiting: string[] = [];

    // Helper for recursive DFS resolution
    const resolveFeature = (
      featureId: string,
      requestedRange: string,
      parentId: string | null,
      isOptional: boolean = false
    ): void => {
      // 1. Detect circular dependencies
      if (visiting.includes(featureId)) {
        const cycleStartIndex = visiting.indexOf(featureId);
        const cyclePath = [...visiting.slice(cycleStartIndex), featureId];
        throw new CircularDependencyError(cyclePath);
      }

      // 2. If already resolved/visited, we just check compatibility (though registry only has one version)
      if (visited.has(featureId)) {
        const feature = this.registry.getFeature(featureId);
        if (feature) {
          let isCompatible = false;
          try {
            isCompatible = semver.satisfies(feature.version, requestedRange);
          } catch {
            isCompatible = feature.version === requestedRange;
          }
          if (!isCompatible) {
            if (isOptional) {
              console.warn(
                `[WARNING] Optional dependency '${featureId}' version '${feature.version}' does not satisfy constraint '${requestedRange}' of feature '${parentId}'. Skipping.`
              );
              return;
            }
            throw new DependencyResolutionError(
              `Feature '${featureId}' version '${feature.version}' does not satisfy constraint '${requestedRange}' requested by '${parentId || 'blueprint'}'.`
            );
          }
        }
        return;
      }

      // 3. Retrieve feature from registry
      const feature = this.registry.getFeature(featureId);
      if (!feature) {
        if (isOptional) {
          console.warn(
            `[WARNING] Optional dependency '${featureId}' requested by '${parentId || 'blueprint'}' is not available in the registry. Skipping.`
          );
          return;
        }
        throw new DependencyResolutionError(
          `Feature '${featureId}' (required by '${parentId || 'blueprint'}') was not found in the registry.`
        );
      }

      // 4. Validate version compatibility
      let isCompatible = false;
      try {
        isCompatible = semver.satisfies(feature.version, requestedRange);
      } catch {
        isCompatible = feature.version === requestedRange;
      }

      if (!isCompatible) {
        if (isOptional) {
          console.warn(
            `[WARNING] Optional dependency '${featureId}' version '${feature.version}' does not satisfy constraint '${requestedRange}' of feature '${parentId}'. Skipping.`
          );
          return;
        }
        throw new DependencyResolutionError(
          `Feature '${featureId}' version '${feature.version}' in registry does not satisfy requested version constraint '${requestedRange}' requested by '${parentId || 'blueprint'}'.`
        );
      }

      // 5. Recursive dependency resolution
      visiting.push(featureId);

      if (feature.dependencies && Array.isArray(feature.dependencies)) {
        for (const dep of feature.dependencies) {
          resolveFeature(dep.featureId, dep.versionRange || '*', featureId, !!dep.optional);
        }
      }

      visiting.pop();
      visited.add(featureId);
      resolvedFeatures.push(feature);
    };

    // Deterministically resolve blueprint features by sorting keys alphabetically
    const blueprintFeatures = blueprint.features || {};
    const featureKeys = Object.keys(blueprintFeatures).sort();

    for (const featureId of featureKeys) {
      const config = blueprintFeatures[featureId];
      // Skip explicitly disabled features
      if (config.enabled === false) {
        continue;
      }
      const requestedRange = config.version || '*';
      resolveFeature(featureId, requestedRange, null, false);
    }

    return resolvedFeatures;
  }
}
