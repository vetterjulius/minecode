import { hashWorkspace } from './files.mjs';
import { runDatabaseOracles } from './db-oracles.mjs';
import { scanSecrets } from './secrets.mjs';
import { runBuildOracle } from './build.mjs';

/**
 * Fills the oracle fields of a run record from a saved workspace. Oracle values are never
 * entered by hand. `tenantLeaks` and the acceptance counts stay null until a hidden acceptance
 * suite exists for the task (null means "not measured").
 */
export async function scoreWorkspace(record, workspace, { build = false } = {}) {
  const db = await runDatabaseOracles(workspace);
  const secrets = scanSecrets(workspace);
  const buildResult = build ? runBuildOracle(workspace) : null;

  const securityFindings =
    secrets.length +
    (db.security ? db.security.tablesWithoutRls.length + db.security.openPolicies.length : 0);

  return {
    ...record,
    artifactSha256: hashWorkspace(workspace),
    oracles: {
      ...record.oracles,
      builds: buildResult ? buildResult.builds : record.oracles.builds,
      migrationsApply: db.migrationsApply,
      securityFindings,
    },
    details: {
      ...record.details,
      migrationFailures: db.migrationFailures,
      tablesWithoutRls: db.security?.tablesWithoutRls ?? null,
      openPolicies: db.security?.openPolicies ?? null,
      secrets,
      ...(buildResult ? { buildLog: buildResult.log } : {}),
    },
  };
}
