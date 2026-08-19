import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  MAX_RECENT_PROJECTS,
  removeRecentProject,
  sanitizeRecentProjects,
  touchRecentProjects,
} = require('../../../../electron/main/recentProjects.cjs') as {
  MAX_RECENT_PROJECTS: number;
  removeRecentProject: (
    list: Array<{ path: string; name: string; openedAt: number }>,
    absolutePath: string
  ) => Array<{ path: string; name: string; openedAt: number }>;
  sanitizeRecentProjects: (
    raw: unknown
  ) => Array<{ path: string; name: string; openedAt: number }>;
  touchRecentProjects: (
    list: Array<{ path: string; name: string; openedAt: number }>,
    absolutePath: string,
    openedAt?: number
  ) => Array<{ path: string; name: string; openedAt: number }>;
};

describe('recentProjects', () => {
  it('touches MRU and dedupes case-insensitively', () => {
    const first = touchRecentProjects([], 'C:/Projects/Alpha', 100);
    const second = touchRecentProjects(first, 'C:/Projects/Beta', 200);
    const again = touchRecentProjects(second, 'c:/projects/alpha', 300);

    expect(again).toHaveLength(2);
    expect(again[0]?.name).toBe('Alpha');
    expect(again[0]?.openedAt).toBe(300);
    expect(again[1]?.name).toBe('Beta');
  });

  it('caps list length', () => {
    let list: Array<{ path: string; name: string; openedAt: number }> = [];
    for (let i = 0; i < MAX_RECENT_PROJECTS + 3; i += 1) {
      list = touchRecentProjects(list, `C:/Projects/P${i}`, i);
    }
    expect(list).toHaveLength(MAX_RECENT_PROJECTS);
    expect(list[0]?.name).toBe(`P${MAX_RECENT_PROJECTS + 2}`);
  });

  it('sanitizes and removes broken entries', () => {
    const cleaned = sanitizeRecentProjects([
      { path: 'C:/A', name: 'A', openedAt: 1 },
      { path: '', name: 'bad' },
      { path: 'C:/A', name: 'dup', openedAt: 2 },
      null,
    ]);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0]?.name).toBe('A');

    const removed = removeRecentProject(cleaned, 'c:/a');
    expect(removed).toEqual([]);
  });
});
