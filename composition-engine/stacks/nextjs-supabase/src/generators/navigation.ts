import { SubGenerator, CompositionPlan } from '@minecode/core';

export class NextjsNavigationSubGenerator implements SubGenerator {
  public readonly id = 'nextjs-navigation';

  public generate(plan: CompositionPlan): Record<string, string> {
    const files: Record<string, string> = {};

    if (plan.navigation.length > 0) {
      let navTypesContent = `// Navigation types and items for ${plan.applicationName}\n\n`;
      navTypesContent += `export interface NavigationItem {\n  id: string;\n  name: string;\n  label: string;\n  path: string;\n  parent?: string;\n  order: number;\n  icon?: string;\n  children?: NavigationItem[];\n}\n\n`;
      navTypesContent += `export const navigationConfig: NavigationItem[] = ${JSON.stringify(plan.navigation, null, 2)};\n`;
      files['config/navigation.ts'] = navTypesContent;
    }

    return files;
  }
}
