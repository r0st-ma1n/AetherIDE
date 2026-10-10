import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AETHER_FRAMEWORK_VERSION } from './frameworkVersion';

const frameworkCMake = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../framework/CMakeLists.txt'
);

describe('AETHER_FRAMEWORK_VERSION', () => {
  it('matches the version declared by framework/CMakeLists.txt', () => {
    const cmake = readFileSync(frameworkCMake, 'utf-8');
    const declared = cmake.match(
      /project\(Aether VERSION (\d+\.\d+\.\d+)/
    )?.[1];
    expect(declared).toBe(AETHER_FRAMEWORK_VERSION);
  });
});
