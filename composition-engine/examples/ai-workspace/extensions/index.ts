import type { Extensions } from '../generated/lib/extensions';

/**
 * Application code of this example. Minecode created this file once and never overwrites it.
 * Generated routes call the hooks registered here.
 */
export const extensions: Extensions = {
  hooks: {
    // Example: normalize project names before they are stored.
    'Project.beforeCreate': (row) => ({ ...row, name: String(row.name).trim() }),
  },
};
