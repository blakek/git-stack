import { $ } from "bun";

export async function branchExists(branchName: string): Promise<boolean> {
  try {
    await $`git show-ref --verify --quiet refs/heads/${branchName}`.quiet();
    return true;
  } catch {
    return false;
  }
}

export async function getCurrentBranch(): Promise<string | undefined> {
  try {
    const result = await $`git symbolic-ref --quiet --short HEAD`.text();
    return result.trim();
  } catch {
    return undefined;
  }
}

export async function guessMainBranch(): Promise<string> {
  const result = await $`git rev-parse --abbrev-ref origin/HEAD`.text();
  return result.trim();
}

export async function isInGitRepo(): Promise<boolean> {
  try {
    await $`git rev-parse --is-inside-work-tree`.quiet();
    return true;
  } catch {
    return false;
  }
}
