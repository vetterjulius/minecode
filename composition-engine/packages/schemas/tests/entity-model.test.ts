import { describe, test, expect } from 'vitest';
import { parseContractYaml, SchemaValidationError } from '../src/index.js';

function contractWithField(fieldYaml: string): string {
  return `
provides:
  entities:
    - name: Thing
      fields:
${fieldYaml}
`;
}

describe('entity field metadata', () => {
  test('test_ParseContractYaml_FieldWithReferencesAndGenerate_KeepsAllMetadata', () => {
    const contract = parseContractYaml(
      contractWithField(`        - name: organizationId
          type: uuid
          required: true
          references: { entity: Organization, onDelete: cascade }
          indexed: true
        - name: id
          type: uuid
          primaryKey: true
          generate: uuid
        - name: status
          type: string
          default: open
          unique: true`)
    );
    const [org, id, status] = contract.provides!.entities![0].fields!;
    expect(org.references).toEqual({ entity: 'Organization', onDelete: 'cascade' });
    expect(org.indexed).toBe(true);
    expect(id.primaryKey).toBe(true);
    expect(id.generate).toBe('uuid');
    expect(status.default).toBe('open');
    expect(status.unique).toBe(true);
  });

  test('test_ParseContractYaml_FieldWithoutMetadata_OmitsOptionalKeys', () => {
    const contract = parseContractYaml(
      contractWithField(`        - name: title\n          type: string`)
    );
    expect(Object.keys(contract.provides!.entities![0].fields![0]).sort()).toEqual([
      'description',
      'name',
      'required',
      'type',
    ]);
  });

  test('test_ParseContractYaml_ReferenceWithEntityAndExternal_Throws', () => {
    expect(() =>
      parseContractYaml(
        contractWithField(`        - name: x
          type: uuid
          references: { entity: A, external: auth.users }`)
      )
    ).toThrow(SchemaValidationError);
  });

  test('test_ParseContractYaml_ReferenceWithNeither_Throws', () => {
    expect(() =>
      parseContractYaml(
        contractWithField(
          `        - name: x\n          type: uuid\n          references: { onDelete: cascade }`
        )
      )
    ).toThrow(SchemaValidationError);
  });

  test('test_ParseContractYaml_UnknownFieldKey_Throws', () => {
    expect(() =>
      parseContractYaml(
        contractWithField(`        - name: x\n          type: uuid\n          refrences: {}`)
      )
    ).toThrow(SchemaValidationError);
  });

  test('test_ParseContractYaml_InvalidGenerateValue_Throws', () => {
    expect(() =>
      parseContractYaml(
        contractWithField(`        - name: x\n          type: uuid\n          generate: random`)
      )
    ).toThrow(SchemaValidationError);
  });
});

describe('entity access', () => {
  function contractWithAccess(accessYaml: string): string {
    return `
provides:
  entities:
    - name: Thing
      access:
${accessYaml}
`;
  }

  test('test_ParseContractYaml_TenantAccessWithField_IsKept', () => {
    const c = parseContractYaml(
      contractWithAccess(`        scope: tenant\n        field: organizationId`)
    );
    expect(c.provides!.entities![0].access).toEqual({ scope: 'tenant', field: 'organizationId' });
  });

  test('test_ParseContractYaml_TenantAccessWithoutField_Throws', () => {
    expect(() => parseContractYaml(contractWithAccess(`        scope: tenant`))).toThrow(
      SchemaValidationError
    );
  });

  test('test_ParseContractYaml_PrivateAccessWithField_Throws', () => {
    expect(() =>
      parseContractYaml(contractWithAccess(`        scope: private\n        field: x`))
    ).toThrow(SchemaValidationError);
  });

  test('test_ParseContractYaml_UnknownScope_Throws', () => {
    expect(() => parseContractYaml(contractWithAccess(`        scope: everyone`))).toThrow(
      SchemaValidationError
    );
  });

  test('test_ParseContractYaml_EntityWithoutAccess_HasNoAccessKey', () => {
    const c = parseContractYaml(`
provides:
  entities:
    - name: Thing
`);
    expect('access' in c.provides!.entities![0]).toBe(false);
  });
});

describe('entity access extensions', () => {
  function accessContract(accessYaml: string): string {
    return `
provides:
  entities:
    - name: Thing
      access:
${accessYaml}
`;
  }

  test('test_ParseContractYaml_TenantAccessWithViaAndWrites_IsKept', () => {
    const c = parseContractYaml(
      accessContract(
        `        scope: tenant\n        field: projectId\n        via: Project\n        writes: insert-only`
      )
    );
    expect(c.provides!.entities![0].access).toEqual({
      scope: 'tenant',
      field: 'projectId',
      via: 'Project',
      writes: 'insert-only',
    });
  });

  test('test_ParseContractYaml_OwnerAccessWithVia_Throws', () => {
    expect(() =>
      parseContractYaml(
        accessContract(`        scope: owner\n        field: userId\n        via: Project`)
      )
    ).toThrow(SchemaValidationError);
  });

  test('test_ParseContractYaml_AuthenticatedReadWithWrites_Throws', () => {
    expect(() =>
      parseContractYaml(
        accessContract(`        scope: authenticated-read\n        writes: members`)
      )
    ).toThrow(SchemaValidationError);
  });

  test('test_ParseContractYaml_UnknownWriteMode_Throws', () => {
    expect(() =>
      parseContractYaml(
        accessContract(`        scope: owner\n        field: userId\n        writes: anyone`)
      )
    ).toThrow(SchemaValidationError);
  });

  test('test_ParseContractYaml_GenerateAuthUser_IsAccepted', () => {
    const c = parseContractYaml(`
provides:
  entities:
    - name: Thing
      fields:
        - name: userId
          type: uuid
          generate: auth-user
`);
    expect(c.provides!.entities![0].fields![0].generate).toBe('auth-user');
  });
});
