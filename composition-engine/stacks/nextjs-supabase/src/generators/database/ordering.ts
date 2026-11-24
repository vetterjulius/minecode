import { DatabaseArtifact } from '@minecode/core';
import { SchemaGenerationError } from './errors.js';

function referencedEntities(entity: DatabaseArtifact): string[] {
  const names = entity.fields
    .map((f) => f.references?.entity)
    .filter((name): name is string => Boolean(name) && name !== entity.entityName);
  return [...new Set(names)].sort();
}

export function orderByReferences(entities: DatabaseArtifact[]): DatabaseArtifact[] {
  const byName = new Map(entities.map((e) => [e.entityName, e]));
  const state = new Map<string, 'visiting' | 'done'>();
  const ordered: DatabaseArtifact[] = [];

  const visit = (entity: DatabaseArtifact, trail: string[]): void => {
    const current = state.get(entity.entityName);
    if (current === 'done') return;
    if (current === 'visiting') {
      throw new SchemaGenerationError(
        `Circular entity reference: ${[...trail, entity.entityName].join(' -> ')}`
      );
    }
    state.set(entity.entityName, 'visiting');
    for (const name of referencedEntities(entity)) {
      const target = byName.get(name);
      if (target) visit(target, [...trail, entity.entityName]);
    }
    state.set(entity.entityName, 'done');
    ordered.push(entity);
  };

  [...entities]
    .sort((a, b) => a.entityName.localeCompare(b.entityName))
    .forEach((entity) => visit(entity, []));
  return ordered;
}
