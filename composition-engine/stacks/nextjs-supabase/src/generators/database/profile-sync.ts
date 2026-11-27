import { DatabaseArtifact } from '@minecode/core';
import { columnName, quote, tableName } from './naming.js';

const SYNCED_FIELDS: Record<string, string> = {
  id: 'new.id',
  email: 'new.email',
  name: "new.raw_user_meta_data->>'name'",
};

export function findAuthProfile(entities: DatabaseArtifact[]): DatabaseArtifact | undefined {
  return entities.find((e) =>
    e.fields.some((f) => f.name === 'id' && f.references?.external === 'auth.users')
  );
}

export function buildProfileSync(profile: DatabaseArtifact): string {
  const synced = profile.fields.filter((f) => SYNCED_FIELDS[f.name]);
  const table = `public.${quote(tableName(profile.entityName))}`;
  const columns = synced.map((f) => quote(columnName(f.name))).join(', ');
  const values = synced.map((f) => SYNCED_FIELDS[f.name]).join(', ');
  return `-- Creates a ${profile.entityName} row for every new auth user.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO ${table} (${columns}) VALUES (${values});
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`;
}
