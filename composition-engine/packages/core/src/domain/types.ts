/**
 * Core domain types and models for Minecode composition engine.
 */

// 1. FeatureVersion
export type FeatureVersion = string;

// 2. FeatureType
export type FeatureType = 'business' | 'infrastructure' | 'starter' | 'primitive';

// 3. FeatureMetadata
export interface FeatureMetadata {
  name: string;
  description: string;
  maintainer?: {
    type: 'builtin' | 'verified' | 'company' | 'community' | 'experimental';
    name?: string;
  };
  stack?: string[];
  category?: string;
}

// 4. ExtensionPoint
export type ExtensionPointType = 'function' | 'component' | 'slot' | 'config' | 'schema';

export interface ExtensionPoint {
  name: string;
  type: ExtensionPointType;
  description: string;
  schema?: Record<string, unknown>; // Optional JSON schema or configuration for this extension point
}

// 5. Module
export type ModuleType = 'database' | 'backend' | 'frontend' | 'test' | 'migration' | 'config';

export interface Module {
  name: string;
  type: ModuleType;
  description: string;
}

// 6. Dependency
export interface Dependency {
  featureId: string;
  versionRange: string;
  optional?: boolean;
}

// 7. Contract
export interface EntityField {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
}

export interface EntityDefinition {
  name: string;
  fields?: EntityField[];
  description?: string;
}

export interface EventDefinition {
  name: string;
  payloadSchema?: Record<string, unknown>;
  description?: string;
}

export interface PermissionDefinition {
  name: string;
  description?: string;
}

export interface Contract {
  provides?: {
    entities?: EntityDefinition[];
    permissions?: PermissionDefinition[];
    events?: EventDefinition[];
    extensionPoints?: ExtensionPoint[];
  };
  requires?: {
    features?: string[];
    capabilities?: string[];
  };
}

// 8. Feature
export interface Feature {
  id: string;
  version: FeatureVersion;
  type: FeatureType;
  metadata: FeatureMetadata;
  contract: Contract;
  dependencies: Dependency[];
  modules: Module[];
}

// 9. Blueprint
export interface FeatureConfig {
  version?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

export interface Blueprint {
  applicationName: string;
  stackId: string;
  features: Record<string, FeatureConfig>;
}

// 10. Application
export interface Application {
  name: string;
  stackId: string;
  blueprint: Blueprint;
  resolvedFeatures: Feature[];
  generatedAt: string;
  engineVersion: string;
}
