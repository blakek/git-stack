import { $ } from "bun";

export async function isInGitRepo(): Promise<boolean> {
  try {
    await $`git rev-parse --is-inside-work-tree`.quiet();
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
