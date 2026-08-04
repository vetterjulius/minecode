import { SubGenerator, CompositionPlan } from '@minecode/core';

export class ExtensionsSubGenerator implements SubGenerator {
  public readonly id = 'extensions';

  public generate(plan: CompositionPlan): Record<string, string> {
    const files: Record<string, string> = {};

    if (plan.extensionPoints.length > 0) {
      let extContent = `// Extension points and contributions for ${plan.applicationName}\n\n`;
      extContent += `export const extensionPoints = {\n`;
      for (const ep of plan.extensionPoints) {
        extContent += `  "${ep.name}": {\n`;
        extContent += `    id: "${ep.id}",\n`;
        extContent += `    type: "${ep.type}",\n`;
        extContent += `    description: ${JSON.stringify(ep.description || '')},\n`;
        extContent += `    schema: ${JSON.stringify(ep.schema || {})},\n`;
        extContent += `    contributions: ${JSON.stringify(ep.contributions, null, 4)},\n`;
        extContent += `  },\n`;
      }
      extContent += `} as const;\n`;
      files['config/extensions.ts'] = extContent;
    }

    return files;
  }
}
