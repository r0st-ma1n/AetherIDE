const path = require('path');

const MAX_RECENT_PROJECTS = 10;

/**
 * @typedef {{ path: string, name: string, openedAt: number }} RecentProject
 */

/**
 * @param {string} left
 * @param {string} right
 */
function sameProjectPath(left, right) {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}

/**
 * @param {unknown} raw
 * @returns {RecentProject[]}
 */
function sanitizeRecentProjects(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  /** @type {RecentProject[]} */
  const result = [];
  const seen = new Set();

  for (const entry of raw) {
    if (!entry || typeof entry.path !== 'string' || !entry.path.trim()) {
      continue;
    }

    const resolved = path.resolve(entry.path);
    const key = resolved.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    result.push({
      path: resolved,
      name:
        typeof entry.name === 'string' && entry.name.trim()
          ? entry.name.trim()
          : path.basename(resolved),
      openedAt: typeof entry.openedAt === 'number' ? entry.openedAt : 0,
    });
  }

  return result.slice(0, MAX_RECENT_PROJECTS);
}

/**
 * @param {RecentProject[]} list
 * @param {string} absolutePath
 * @param {number} [openedAt]
 * @returns {RecentProject[]}
 */
function touchRecentProjects(list, absolutePath, openedAt = Date.now()) {
  const resolved = path.resolve(absolutePath);
  const existing = list.find((entry) => sameProjectPath(entry.path, resolved));
  const filtered = list.filter(
    (entry) => !sameProjectPath(entry.path, resolved)
  );

  return [
    {
      path: resolved,
      name: existing?.name ?? path.basename(resolved),
      openedAt,
    },
    ...filtered,
  ].slice(0, MAX_RECENT_PROJECTS);
}

/**
 * @param {RecentProject[]} list
 * @param {string} absolutePath
 * @returns {RecentProject[]}
 */
function removeRecentProject(list, absolutePath) {
  return list.filter((entry) => !sameProjectPath(entry.path, absolutePath));
}

module.exports = {
  MAX_RECENT_PROJECTS,
  removeRecentProject,
  sanitizeRecentProjects,
  sameProjectPath,
  touchRecentProjects,
};
