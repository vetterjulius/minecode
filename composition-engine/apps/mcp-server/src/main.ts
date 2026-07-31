import { getGeneratorInfo } from '@minecode/generator';

export function runMCPServer(): string {
  const info = `Minecode MCP Server initialised.\nUsing: ${getGeneratorInfo()}`;
  console.log(info);
  return info;
}

runMCPServer();
