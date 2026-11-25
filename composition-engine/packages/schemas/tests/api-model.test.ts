import { describe, test, expect } from 'vitest';
import { parseContractYaml, SchemaValidationError } from '../src/index.js';

function contractWithApi(apiYaml: string): string {
  return `
provides:
  api:
${apiYaml}
`;
}

describe('api entries', () => {
  test('test_ParseContractYaml_CrudEntry_KeepsEntityOperationAndPermission', () => {
    const contract = parseContractYaml(
      contractWithApi(`    - name: ListThings
      path: /api/things
      method: GET
      crud: { entity: Thing, operation: list }
      permission: thing.read`)
    );
    const [api] = contract.provides!.api!;
    expect(api.crud).toEqual({ entity: 'Thing', operation: 'list' });
    expect(api.permission).toBe('thing.read');
    expect(api.behavior).toBeUndefined();
  });

  test('test_ParseContractYaml_BehaviorEntry_KeepsBehaviorId', () => {
    const contract = parseContractYaml(
      contractWithApi(`    - name: Ping
      path: /api/ping
      behavior: system.ping`)
    );
    expect(contract.provides!.api![0].behavior).toBe('system.ping');
  });

  test('test_ParseContractYaml_NeitherCrudNorBehavior_Throws', () => {
    expect(() =>
      parseContractYaml(contractWithApi(`    - name: Nothing\n      path: /api/nothing`))
    ).toThrow(SchemaValidationError);
  });

  test('test_ParseContractYaml_BothCrudAndBehavior_Throws', () => {
    expect(() =>
      parseContractYaml(
        contractWithApi(`    - name: Both
      path: /api/both
      behavior: x.y
      crud: { entity: Thing, operation: list }`)
      )
    ).toThrow(SchemaValidationError);
  });

  test('test_ParseContractYaml_UnknownCrudOperation_Throws', () => {
    expect(() =>
      parseContractYaml(
        contractWithApi(`    - name: Odd
      path: /api/odd
      crud: { entity: Thing, operation: explode }`)
      )
    ).toThrow(SchemaValidationError);
  });
});
