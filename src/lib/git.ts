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
  if (await hasRemote("origin")) {
    const result = await $`git rev-parse --abbrev-ref origin/HEAD`.text();
    return result.trim();
  }

  if (await branchExists("main")) {
    return "main";
  }

  if (await branchExists("master")) {
    return "master";
  }

  throw new Error(
    "Could not guess the main branch. Please specify the parent branch explicitly."
  );
}

export async function hasRemote(remoteName: string): Promise<boolean> {
  try {
    await $`git ls-remote --exit-code ${remoteName}`.quiet();
    return true;
  } catch {
    return false;
  }
}

export async function isInGitRepo(): Promise<boolean> {
  try {
    await $`git rev-parse --is-inside-work-tree`.quiet();
    return true;
  } catch {
    return false;
  }
}

export async function maybeFetchOrigin(): Promise<void> {
  if (await hasRemote("origin")) {
    await $`git fetch origin`.quiet();
  }
}
