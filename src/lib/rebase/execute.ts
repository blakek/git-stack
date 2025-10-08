import { $ } from "bun";
import type { RebasePlan, RebaseStep } from "./plan";
import { bold, reset } from "@/lib/terminal";

export interface ExecuteOptions {
  plan: RebasePlan;
  dryRun?: boolean;
  fetch?: () => Promise<void>; // injected maybeFetchOrigin
  log?: (...args: unknown[]) => void;
  checkout?: (branch: string) => Promise<void>;
  getCurrentBranch?: () => Promise<string | undefined>;
}

async function defaultCheckout(branch: string) {
  await $`git checkout ${branch}`.quiet();
}

async function isRebaseInProgress(): Promise<boolean> {
  try {
    await $`test -d $(git rev-parse --git-path rebase-merge) || test -d $(git rev-parse --git-path rebase-apply)`;
    return true; // command succeeded meaning at least one exists
  } catch {
    return false;
  }
}

async function attemptRebase(step: RebaseStep, log: ExecuteOptions["log"]): Promise<number> {
  log?.(`Rebasing ${step.branch} onto ${step.onto}`);
  const result = await $`git -c rerere.enabled=true -c rerere.autoupdate=true rebase --autostash --update-refs ${step.onto}`.nothrow();
  return result.exitCode;
}

export async function executePlan(opts: ExecuteOptions): Promise<void> {
  const { plan, dryRun, fetch, log = console.log, checkout = defaultCheckout, getCurrentBranch } = opts;

  log(`${bold}Base:${reset} ${plan.baseRef}`);
  log(`${bold}Plan:${reset}`);
  plan.steps.forEach((s, i) => {
    log(`  ${i + 1}. ${s.branch} -> ${s.onto}`);
  });

  if (dryRun) return;

  if (fetch) await fetch();

  if (await isRebaseInProgress()) {
    log(`Active git rebase detected. Complete it (git rebase --continue/--abort) before running git stack rebase.`);
    return;
  }

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i]!;
    log(`\n[${i + 1}/${plan.steps.length}] ${bold}${step.branch}${reset} -> ${step.onto}`);
    const current = getCurrentBranch ? await getCurrentBranch() : undefined;
    if (current !== step.branch) {
      await checkout(step.branch);
    }

    const exitCode = await attemptRebase(step, log);
    if (exitCode !== 0) {
      if (await isRebaseInProgress()) {
        log(`Conflict while rebasing ${step.branch} onto ${step.onto}. Resolve conflicts then run: git rebase --continue`);
        log(`After that, rerun: git stack rebase`);
        return;
      }
      throw new Error(`Rebase failed for ${step.branch} (exit code ${exitCode}).`);
    } else {
      log(`Completed ${step.branch}`);
    }
  }

  log(`\nAll ${plan.steps.length} rebase steps completed.`);
}
