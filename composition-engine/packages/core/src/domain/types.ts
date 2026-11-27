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

/** Permission names (declared by features) required to read or write rows of an entity. */
export interface EntityPermissions {
  read?: string;
  write?: string;
}

export interface EntityAccess {
  scope: AccessScope;
  field?: string;
  via?: string;
  writes?: WriteMode;
  /**
   * Tenant scope only. Enforced in the database when the composition provides roles
   * (the 'rbac' feature); otherwise organization membership alone grants access.
   */
  permissions?: EntityPermissions;
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

export type CrudOperation = 'list' | 'get' | 'create' | 'update' | 'delete';

/** Generic endpoint derived from an entity; the stack decides how to implement it. */
export interface ApiCrud {
  entity: string;
  operation: CrudOperation;
  /** `list` only: entities with a foreign key to `entity` whose rows are embedded in each result. */
  include?: string[];
}

export interface ApiDefinition {
  name: string;
  path: string;
  method?: string;
  description?: string;
  /** Generic entity endpoint. Exactly one of `crud` and `behavior` is set. */
  crud?: ApiCrud;
  /** Named, stack-agnostic behavior implemented by the stack's behavior registry. */
  behavior?: string;
  /** Permission (declared by the providing feature) required to call the endpoint. */
  permission?: string;
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
  crud?: ApiCrud;
  behavior?: string;
  permission?: string;
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
  /** Blueprint configuration of the enabled features, keyed by feature id. */
  featureConfig?: Record<string, Record<string, unknown>>;
  /** Lock from an earlier generation. When present, only additive schema changes are generated. */
  schemaBaseline?: SchemaLock;
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

/** Where a stack puts generated files and which of them are owned by whom. */
export interface StackOutputLayout {
  /** Directories created up front in the application folder. */
  readonly skeleton: string[];
  /** Maps a path produced by the stack to its location inside the application folder. */
  resolve(generatedPath: string): string;
  /** Application-owned files: scaffolded once, then never overwritten or tracked. */
  isScaffold(outputPath: string): boolean;
  /** Schema migration files; they are emitted once and numbered by the lock. */
  isMigration(outputPath: string): boolean;
}

export interface StackAdapter {
  readonly stackId: string;
  readonly description: string;
  /** Behavior ids this stack implements, or '*' when it documents or accepts any behavior. */
  readonly behaviors: readonly string[] | '*';
  readonly layout: StackOutputLayout;
  generate(plan: CompositionPlan, options?: { runnable?: boolean }): Record<string, string>;
}

/**
 * Stack-agnostic record of what has already been generated for an application.
 * It lets the engine turn a changed blueprint into additive migrations instead of
 * regenerating (and thereby rewriting) the whole schema.
 */
export interface SchemaSnapshot {
  entities: Record<string, SnapshotEntity>;
  permissions: string[];
  /** Feature-provided raw migrations already emitted, by name. */
  rawMigrations: string[];
  /** Blueprint configuration that influences generated data (for example role grants). */
  featureConfig: Record<string, Record<string, unknown>>;
}

export interface SnapshotEntity {
  fields: Record<string, Omit<EntityField, 'description' | 'name'>>;
  access?: EntityAccess;
}

export interface SchemaLock {
  version: 1;
  schema: SchemaSnapshot;
  /** Number of migration files generated so far; the next file continues the sequence. */
  migrationCount: number;
  /**
   * Ownership manifest: for every generated file, the hash of the generated source and the hash
   * of what was written to disk (after formatting). A file whose disk hash differs was edited by
   * a person and is never overwritten silently.
   */
  files?: Record<string, GeneratedFileRecord>;
}

export interface GeneratedFileRecord {
  generated: string;
  disk: string;
}
