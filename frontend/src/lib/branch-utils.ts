import { BranchLike } from '@/types/branch';

/**
 * Removes duplicated branch entries by prioritizing unique IDs and falling back to names.
 * When both ID and name are missing the item will be skipped.
 */
export function getUniqueBranches<T extends BranchLike>(branches: T[]): T[] {
  if (!Array.isArray(branches)) {
    return [];
  }

  const map = new Map<string, T>();

  for (const branch of branches) {
    if (!branch || typeof branch !== 'object') {
      continue;
    }

    const key = branch.id !== undefined && branch.id !== null && branch.id !== ''
      ? String(branch.id)
      : branch.name && branch.name !== ''
        ? `name:${branch.name}`
        : null;

    if (!key || map.has(key)) {
      continue;
    }

    map.set(key, branch);
  }

  return Array.from(map.values());
}

export function sortBranchesByName<T extends BranchLike>(branches: T[]): T[] {
  return [...branches].sort((a, b) => {
    const nameA = a.name ?? '';
    const nameB = b.name ?? '';
    return nameA.localeCompare(nameB, 'zh-Hant');
  });
}
