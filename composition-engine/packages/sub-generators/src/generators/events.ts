import { SubGenerator, CompositionPlan } from '@minecode/core';

export class EventsSubGenerator implements SubGenerator {
  public readonly id = 'events';

  public generate(plan: CompositionPlan): Record<string, string> {
    const files: Record<string, string> = {};

    if (plan.events.length > 0) {
      let eventContent = `// Events and payload schemas for ${plan.applicationName}\n\n`;
      eventContent += `export const events = {\n`;
      for (const ev of plan.events) {
        eventContent += `  "${ev.name}": {\n`;
        eventContent += `    id: "${ev.id}",\n`;
        eventContent += `    description: ${JSON.stringify(ev.description || '')},\n`;
        eventContent += `    payloadSchema: ${JSON.stringify(ev.payloadSchema || {})},\n`;
        eventContent += `  },\n`;
      }
      eventContent += `} as const;\n`;
      files['config/events.ts'] = eventContent;
    }

    return files;
  }
}
