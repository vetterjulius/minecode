#!/usr/bin/env node
import { getGeneratorInfo } from '@minecode/generator';

export function runCLI(): string {
  const info = `Minecode CLI initialised.\nUsing: ${getGeneratorInfo()}`;
  console.log(info);
  return info;
}

runCLI();
