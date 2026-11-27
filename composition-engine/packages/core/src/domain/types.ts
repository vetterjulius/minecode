export type FeatureVersion = string;

export type FeatureType = 'business' | 'infrastructure' | 'starter' | 'primitive';

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

export type ExtensionPointType = 'function' | 'component' | 'slot' | 'config' | 'schema';

export interface ExtensionPoint {
  name: string;
  type: ExtensionPointType;
  description: string;
  schema?: Record<string, unknown>;
}

export type ModuleType = 'database' | 'backend' | 'frontend' | 'test' | 'migration' | 'config';

export interface Module {
  name: string;
  type: ModuleType;
  description: string;
}

export interface Dependency {
  featureId: string;
  versionRange: string;
  optional?: boolean;
}

export type ReferentialAction = 'cascade' | 'restrict' | 'set null';

export interface FieldReference {
  entity?: string;
  external?: string;
  column?: string;
  onDelete?: ReferentialAction;
}

export type GeneratedValue = 'uuid' | 'now' | 'auth-user';

export interface EntityField {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  references?: FieldReference;
  generate?: GeneratedValue;
  default?: string | number | boolean;
  unique?: boolean;
  primaryKey?: boolean;
  indexed?: boolean;
}

export type AccessScope = 'tenant' | 'owner' | 'authenticated-read' | 'private';

export type WriteMode = 'members' | 'insert-only' | 'server-only';

export interface EntityAccess {
  scope: AccessScope;
  field?: string;
  via?: string;
  writes?: WriteMode;
}

export interface EntityDefinition {
  name: string;
  fields?: EntityField[];
  description?: string;
  access?: EntityAccess;
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

export interface ApiDefinition {
  name: string;
  path: string;
  method?: string;
  description?: string;
}

export interface UiDefinition {
  name: string;
  component?: string;
  route?: string;
  slot?: string;
  description?: string;
}

export interface NavigationDefinition {
  name: string;
  label: string;
  path: string;
  parent?: string;
  order?: number;
  icon?: string;
}

export interface ExtensionContribution {
  targetExtensionPoint: string;
  value: unknown;
  description?: string;
}

export interface Contract {
  provides?: {
    entities?: EntityDefinition[];
    permissions?: PermissionDefinition[];
    events?: EventDefinition[];
    extensionPoints?: ExtensionPoint[];
    capabilities?: string[];
    api?: ApiDefinition[];
    ui?: UiDefinition[];
    navigation?: NavigationDefinition[];
  };
  requires?: {
    features?: string[];
    capabilities?: string[];
  };
  conflicts?: {
    features?: string[];
    capabilities?: string[];
  };
  contributions?: ExtensionContribution[];
}

export interface DatabaseArtifact {
  id: string;
  featureId: string;
  entityName: string;
  fields: EntityField[];
  description?: string;
  access?: EntityAccess;
}

export interface ApiArtifact {
  id: string;
  featureId: string;
  name: string;
  path: string;
  method?: string;
  description?: string;
}

export interface UiArtifact {
  id: string;
  featureId: string;
  name: string;
  component?: string;
  route?: string;
  slot?: string;
  description?: string;
}

export interface NavigationArtifact {
  id: string;
  featureId: string;
  name: string;
  label: string;
  path: string;
  parent?: string;
  order?: number;
  icon?: string;
  children?: NavigationArtifact[];
}

export interface EventArtifact {
  id: string;
  featureId: string;
  name: string;
  payloadSchema?: Record<string, unknown>;
  description?: string;
}

export interface PermissionArtifact {
  id: string;
  featureId: string;
  name: string;
  description?: string;
}

export interface MigrationArtifact {
  id: string;
  featureId: string;
  name: string;
  type: 'database' | 'schema' | 'seed';
  description?: string;
  content?: string;
}

export interface ExtensionPointContributionArtifact {
  sourceFeatureId: string;
  value: unknown;
  description?: string;
}

export interface ExtensionPointArtifact {
  id: string;
  featureId: string;
  name: string;
  type: ExtensionPointType;
  description: string;
  schema?: Record<string, unknown>;
  contributions: ExtensionPointContributionArtifact[];
}

export interface CompositionPlan {
  applicationName: string;
  stackId: string;
  database: DatabaseArtifact[];
  api: ApiArtifact[];
  ui: UiArtifact[];
  navigation: NavigationArtifact[];
  events: EventArtifact[];
  permissions: PermissionArtifact[];
  migrations: MigrationArtifact[];
  extensionPoints: ExtensionPointArtifact[];
}

export interface Feature {
  id: string;
  version: FeatureVersion;
  type: FeatureType;
  metadata: FeatureMetadata;
  contract: Contract;
  dependencies: Dependency[];
  modules: Module[];
  configSchema?: Record<string, unknown>;
  featureDir?: string;
  subGenerators?: string[];
}

export interface SubGenerator {
  readonly id: string;
  generate(plan: CompositionPlan, options?: { runnable?: boolean }): Record<string, string>;
}

export interface BlueprintValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

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

export interface Application {
  name: string;
  stackId: string;
  blueprint: Blueprint;
  resolvedFeatures: Feature[];
  generatedAt: string;
  engineVersion: string;
}

export interface StackAdapter {
  readonly stackId: string;
  generate(plan: CompositionPlan, options?: { runnable?: boolean }): Record<string, string>;
}
