import { SubGenerator, CompositionPlan } from '@minecode/core';

export class SupabaseDatabaseSubGenerator implements SubGenerator {
  public readonly id = 'supabase-database';

  public generate(plan: CompositionPlan): Record<string, string> {
    const files: Record<string, string> = {};

    let dbTypesContent = `// Generated database type definitions for ${plan.applicationName}\n\n`;
    for (const ent of plan.database) {
      const entityName = ent.entityName;
      const fields = ent.fields;

      let sqlContent = `-- SQL DDL for entity: ${entityName}\n`;
      if (ent.description) {
        sqlContent += `-- Description: ${ent.description}\n`;
      }
      sqlContent += `CREATE TABLE IF NOT EXISTS "${entityName.toLowerCase()}" (\n`;

      const sqlFieldsList: string[] = [];
      const tsFieldsList: string[] = [];

      for (const field of fields) {
        let sqlType = 'TEXT';
        let tsType = 'string';

        const fType = field.type.toLowerCase();
        if (fType === 'uuid') {
          sqlType = 'UUID';
          tsType = 'string';
        } else if (fType === 'string' || fType === 'text') {
          sqlType = fType === 'text' ? 'TEXT' : 'VARCHAR(255)';
          tsType = 'string';
        } else if (fType === 'integer' || fType === 'int' || fType === 'number') {
          sqlType = 'INTEGER';
          tsType = 'number';
        } else if (fType === 'boolean') {
          sqlType = 'BOOLEAN';
          tsType = 'boolean';
        } else if (fType === 'timestamp' || fType === 'date' || fType === 'datetime') {
          sqlType = 'TIMESTAMP WITH TIME ZONE';
          tsType = 'string';
        } else if (fType === 'json' || fType === 'jsonb') {
          sqlType = 'JSONB';
          tsType = 'any';
        }

        const isPrimaryKey = field.name.toLowerCase() === 'id';
        const isRequired = field.required || isPrimaryKey;

        let sqlFieldDef = `  "${field.name}" ${sqlType}`;
        if (isPrimaryKey) {
          sqlFieldDef += ' PRIMARY KEY';
        }
        if (isRequired) {
          sqlFieldDef += ' NOT NULL';
        }
        sqlFieldsList.push(sqlFieldDef);

        const tsRequiredMark = isRequired ? '' : '?';
        let tsFieldDef = `  ${field.name}${tsRequiredMark}: ${tsType};`;
        if (field.description) {
          tsFieldDef = `  /** ${field.description} */\n` + tsFieldDef;
        }
        tsFieldsList.push(tsFieldDef);
      }

      sqlContent += sqlFieldsList.join(',\n') + '\n);\n';
      files[`supabase/migrations/${entityName.toLowerCase()}_table.sql`] = sqlContent;

      dbTypesContent += `/**\n * Entity: ${entityName}\n`;
      if (ent.description) {
        dbTypesContent += ` * ${ent.description}\n`;
      }
      dbTypesContent += ` */\nexport interface ${entityName} {\n`;
      dbTypesContent += tsFieldsList.join('\n') + '\n}\n\n';
    }
    if (plan.database.length > 0) {
      files['types/database.ts'] = dbTypesContent.trim() + '\n';
    }

    for (const mig of plan.migrations) {
      const cleanName = mig.name.replace(/^\/+|\/+$/g, '');
      if (mig.content) {
        files[`supabase/migrations/${cleanName}`] = mig.content;
      } else {
        const typeDesc = mig.type || 'database';
        const desc = mig.description || `Migration for ${mig.name}`;
        const sqlMigrationContent = `-- Migration: ${mig.name} (${typeDesc})\n-- Description: ${desc}\n\n-- TODO: Add your custom ${typeDesc} migration script here\n`;
        files[`supabase/migrations/${cleanName}`] = sqlMigrationContent;
      }
    }

    return files;
  }
}
