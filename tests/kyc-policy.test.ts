import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { columnIds, presentationPath } from "@/lib/kyc/presentation-schema";
import {
  assertCurrent, assertEvent, compareFiles, inspectPresentation, paginate, parseApiFile, parseDiff, parsePull, runPolicy,
  type ApiFile, type PullSnapshot,
} from "../scripts/check-kyc-presentation";

const valid = { enabledFilters: ["status", "assignee"], columnOrder: [...columnIds], pageSize: 25 };
const repository = "example/workspace";
let directory: string;
let base: string;
let changed: Set<string>;

function git(...args: string[]) {
  return execFileSync("git", args, {
    cwd: directory, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Policy fixture", GIT_AUTHOR_EMAIL: "fixture@example.test",
      GIT_COMMITTER_NAME: "Policy fixture", GIT_COMMITTER_EMAIL: "fixture@example.test",
    },
  }).trim();
}

function write(path: string, value: string) {
  mkdirSync(dirname(join(directory, path)), { recursive: true });
  writeFileSync(join(directory, path), value);
  changed.add(path);
}

function commit() {
  git("add", "--all", "--", ...changed);
  git("commit", "-m", "Policy fixture");
  changed.clear();
  return git("rev-parse", "HEAD");
}

function configure(value: object = { ...valid, pageSize: 10 }) {
  write(presentationPath, JSON.stringify(value));
  return commit();
}

beforeEach(() => {
  directory = mkdtempSync(join(homedir(), ".cache", "kyc-policy-"));
  changed = new Set();
  git("init", "--initial-branch=main");
  write(presentationPath, JSON.stringify(valid));
  write("app/page.tsx", "original application\n");
  write("scripts/policy.ts", "original policy\n");
  base = commit();
  git("checkout", "-b", "candidate");
});

afterEach(() => rmSync(directory, { recursive: true, force: true }));

describe("complete Git tree inspection", () => {
  it("allows a valid ordinary configuration-only edit", () => {
    const result = inspectPresentation(directory, base, configure());
    expect(result.configurationOnly).toBe(true);
    compareFiles(result.changes, [{ filename: presentationPath, status: "modified" }], 1);
  });

  it.each([
    "app/page.tsx", "components/shared/new.tsx", "lib/tool-registry.ts", "lib/server/access.ts",
    "package.json", "package-lock.json", "drizzle/new.sql", "AGENTS.md", ".agents/skills/example/SKILL.md",
    "scripts/policy.ts", "lib/kyc/presentation-schema.ts", ".github/workflows/ci.yml", ".github/CODEOWNERS",
    "file with spaces\nand tabs\t.txt",
  ])("keeps a mixed change to %s outside the no-review surface", (path) => {
    write(path, "changed source or policy\n");
    expect(inspectPresentation(directory, base, configure()).configurationOnly).toBe(false);
  });

  it("requires review for source-only edits even when the presentation remains valid", () => {
    write("app/page.tsx", "changed application\n");
    expect(inspectPresentation(directory, base, commit()).configurationOnly).toBe(false);
  });

  it("includes both paths for renames outside the configuration", () => {
    renameSync(join(directory, "app/page.tsx"), join(directory, "app/renamed.tsx"));
    changed.add("app/page.tsx").add("app/renamed.tsx");
    const result = inspectPresentation(directory, base, commit());
    expect(result.configurationOnly).toBe(false);
    expect(result.changes).toContainEqual(expect.objectContaining({
      status: "R", path: "app/renamed.tsx", previousPath: "app/page.tsx",
    }));
    compareFiles(result.changes, [{ filename: "app/renamed.tsx", previous_filename: "app/page.tsx", status: "renamed" }], 1);
  });

  it("does not mistake a rename onto the presentation path for an ordinary edit", () => {
    write("app/config.json", JSON.stringify({ ...valid, pageSize: 10 }));
    const initial = commit();
    rmSync(join(directory, presentationPath));
    renameSync(join(directory, "app/config.json"), join(directory, presentationPath));
    changed.add(presentationPath).add("app/config.json");
    expect(inspectPresentation(directory, initial, commit()).configurationOnly).toBe(false);
  });

  it.each(["delete", "rename", "symlink", "executable"] as const)("rejects configuration %s", (kind) => {
    if (kind === "executable") chmodSync(join(directory, presentationPath), 0o755);
    else if (kind === "rename") {
      renameSync(join(directory, presentationPath), join(directory, "lib/kyc/renamed.json"));
      changed.add("lib/kyc/renamed.json");
    } else {
      rmSync(join(directory, presentationPath));
      if (kind === "symlink") symlinkSync("../../../app/page.tsx", join(directory, presentationPath));
    }
    changed.add(presentationPath);
    expect(() => inspectPresentation(directory, base, commit())).toThrow();
  });

  it("rejects adding the unowned config when it was absent from the base", () => {
    rmSync(join(directory, presentationPath));
    changed.add(presentationPath);
    const withoutConfig = commit();
    expect(() => inspectPresentation(directory, withoutConfig, configure())).toThrow(/existing regular/);
  });

  it("rejects invalid configuration even alongside a proposed permissive validator", () => {
    write("lib/kyc/presentation-schema.ts", "export const validatePresentation = () => true;\n");
    expect(() => inspectPresentation(directory, base, configure({ ...valid, pageSize: 1000 }))).toThrow(/Page size/);
  });

  it("rejects missing objects, empty changes and a stale branch", () => {
    const head = configure();
    expect(() => inspectPresentation(directory, base, "f".repeat(40))).toThrow();
    expect(() => inspectPresentation(directory, base, base)).toThrow(/Empty/);
    git("checkout", "main");
    write("app/page.tsx", "new main\n");
    expect(() => inspectPresentation(directory, commit(), head)).toThrow();
  });
});

describe("diff and API integrity", () => {
  it("rejects truncated or unknown Git metadata", () => {
    const header = `:100644 100644 ${"a".repeat(40)} ${"b".repeat(40)}`;
    for (const raw of [`${header} M\0file`, `${header} X\0file\0`, `${header} R100\0file\0`]) {
      expect(() => parseDiff(raw)).toThrow();
    }
  });

  it("rejects incomplete, duplicated, mismatched and unknown API changes", () => {
    const { changes } = inspectPresentation(directory, base, configure());
    const file: ApiFile = { filename: presentationPath, status: "modified" };
    expect(() => compareFiles(changes, [], 1)).toThrow();
    expect(() => compareFiles(changes, [file], 2)).toThrow();
    expect(() => compareFiles(changes, [file, file], 2)).toThrow();
    expect(() => compareFiles(changes, [{ ...file, status: "unknown" }], 1)).toThrow();
    expect(() => compareFiles(changes, [{ ...file, filename: "other.json" }], 1)).toThrow();
    expect(() => compareFiles(changes, [{ ...file, previous_filename: "old.json" }], 1)).toThrow();
    expect(() => parseApiFile({ filename: presentationPath })).toThrow();
  });

  it("loads all API pages and fails on malformed, failed or endless pagination", async () => {
    const page = vi.fn(async (number: number) => number === 1 ? Array.from({ length: 100 }, (_, index) => index) : [100]);
    expect(await paginate(page)).toHaveLength(101);
    expect(page).toHaveBeenCalledTimes(2);
    await expect(paginate(async () => ({ incomplete: true }))).rejects.toThrow();
    await expect(paginate(async () => { throw new Error("API unavailable"); })).rejects.toThrow();
    await expect(paginate(async () => Array(100).fill(null))).rejects.toThrow(/limit/);
  });

  it("rejects wrong or changed PR, target, repository, base, head and policy identities", () => {
    const pull: PullSnapshot = { number: 1, state: "open", baseRef: "main", baseRepository: repository, base, head: base, changedFiles: 1 };
    expect(() => assertCurrent(pull, pull, repository, base, base)).not.toThrow();
    for (const delta of [
      { number: 2 }, { state: "closed" }, { baseRef: "other" }, { baseRepository: "other/repo" },
      { base: "a".repeat(40) }, { head: "b".repeat(40) }, { changedFiles: 2 },
    ]) {
      expect(() => assertCurrent(pull, { ...pull, ...delta }, repository, base, base)).toThrow();
    }
    expect(() => assertCurrent(pull, pull, repository, "c".repeat(40), base)).toThrow();
    expect(() => assertCurrent(pull, pull, repository, base, "c".repeat(40))).toThrow();
    expect(() => parsePull({ number: 1 })).toThrow();
  });

  it("only accepts supported main-sourced events", () => {
    const payload = { repository: { full_name: repository } };
    expect(assertEvent("push", "refs/heads/main", payload, repository)).toEqual({ kind: "audit" });
    expect(assertEvent("workflow_dispatch", "refs/heads/main", payload, repository)).toEqual({ kind: "audit" });
    expect(() => assertEvent("workflow_dispatch", "refs/heads/candidate", payload, repository)).toThrow();
    expect(() => assertEvent("pull_request", "refs/pull/1/merge", payload, repository)).toThrow();
    expect(() => assertEvent("workflow_run", "refs/heads/main", payload, repository)).toThrow();
    expect(() => assertEvent("push", "refs/heads/main", payload, "other/repo")).toThrow();
    expect(() => assertEvent("pull_request_target", "refs/heads/main", {
      ...payload, pull_request: { base: { ref: "other", repo: { full_name: repository } } },
    }, repository)).toThrow();
  });

  it("binds a PR event to its number, repository, base and head", () => {
    const head = configure();
    const pull = {
      number: 1, state: "open", base: { ref: "main", sha: base, repo: { full_name: repository } },
      head: { sha: head }, changed_files: 1,
    };
    const payload = { repository: { full_name: repository }, number: 1, pull_request: pull };
    expect(assertEvent("pull_request_target", "refs/heads/main", payload, repository)).toEqual({
      kind: "pr", pull: parsePull(pull),
    });
    for (const delta of [{ number: 2 }, { state: "closed" }, { head: { sha: "invalid" } }, { changed_files: undefined }]) {
      expect(() => assertEvent("pull_request_target", "refs/heads/main", {
        ...payload, pull_request: { ...pull, ...delta },
      }, repository)).toThrow();
    }
    expect(() => assertEvent("pull_request_target", "refs/heads/candidate", payload, repository)).toThrow();
  });

  it.each([
    ["push", "--pr"], ["workflow_dispatch", "--pr"], ["push", ""],
    ["pull_request_target", "--audit"],
  ])("fails the CLI before HTTP access for %s with mode %s", (eventName, mode) => {
    const payloadPath = join(directory, "event.json");
    writeFileSync(payloadPath, JSON.stringify({
      repository: { full_name: repository }, number: 1,
      pull_request: {
        number: 1, state: "open", base: { ref: "main", sha: base, repo: { full_name: repository } },
        head: { sha: base }, changed_files: 1,
      },
    }));
    const result = spawnSync(process.execPath, [resolve("scripts/check-kyc-presentation.ts"), ...(mode ? [mode] : [])], {
      cwd: directory, encoding: "utf8",
      env: {
        ...process.env, GITHUB_EVENT_NAME: eventName, GITHUB_REF: "refs/heads/main",
        GITHUB_REPOSITORY: repository, GITHUB_EVENT_PATH: payloadPath, GITHUB_TOKEN: "",
      },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Wrong policy mode for event.");
  });
});

describe("native job evaluator with local Git and mocked HTTP (not live enforcement)", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it.each([
    "valid", "updated-main", "outside", "invalid-approved", "truncated", "stale-head-before", "stale-head-after",
    "stale-base-before", "stale-base-after", "stale-main-after", "stale-policy", "api-failure", "wrong-pr",
  ] as const)(
    "evaluates only the triggering PR without check writes for %s", async (scenario) => {
      if (scenario === "updated-main") {
        git("checkout", "main");
        write("app/page.tsx", "updated main\n");
        base = commit();
        git("checkout", "candidate");
        git("merge", "--ff-only", "main");
      }
      if (scenario === "outside") write("scripts/policy.ts", "candidate policy must not execute\n");
      const head = configure({ ...valid, pageSize: scenario === "invalid-approved" ? 1000 : 10 });
      const count = scenario === "outside" ? 2 : 1;
      git("update-ref", "refs/pull/1/head", head);
      if (scenario !== "stale-policy") git("checkout", "main");
      git("remote", "add", "origin", directory);
      const requests: { path: string; method: string }[] = [];
      let reads = 0;
      let mainReads = 0;
      const request: typeof fetch = async (input, options) => {
        const url = new URL(String(input));
        const path = url.pathname.replace(`/repos/${repository}`, "") + url.search;
        requests.push({ path, method: options?.method ?? "GET" });
        if (path.startsWith("/pulls?")) return Response.json([{ number: 1 }, { number: 14 }]);
        if (path === "/pulls/14") return new Response(null, { status: 503 });
        if (path === "/pulls/1") {
          reads++;
          const staleHead = scenario === "stale-head-before" || (scenario === "stale-head-after" && reads > 1);
          const staleBase = scenario === "stale-base-before" || (scenario === "stale-base-after" && reads > 1);
          return Response.json({
            number: scenario === "wrong-pr" ? 2 : 1, state: "open",
            base: { ref: "main", sha: staleBase ? "c".repeat(40) : base, repo: { full_name: repository } },
            head: { sha: staleHead ? "d".repeat(40) : head },
            changed_files: count, labels: [{ name: "safe-configuration" }], approved: true, agent_assertion: "safe",
          });
        }
        if (path === "/git/ref/heads/main") {
          mainReads++;
          return Response.json({ object: { sha: scenario === "stale-main-after" && mainReads > 1 ? "c".repeat(40) : base } });
        }
        if (path.startsWith("/pulls/1/files?")) {
          if (scenario === "api-failure") return new Response(null, { status: 503 });
          if (scenario === "truncated") return Response.json([]);
          return Response.json([
            { filename: presentationPath, status: "modified" },
            ...(scenario === "outside" ? [{ filename: "scripts/policy.ts", status: "modified" }] : []),
          ]);
        }
        throw new Error(`Unexpected mock API request: ${path}`);
      };
      const run = runPolicy({
        directory, repository, token: "local-test-placeholder", request,
        event: {
          kind: "pr",
          pull: { number: 1, state: "open", baseRef: "main", baseRepository: repository, base, head, changedFiles: count },
        },
      });
      const success = scenario === "valid" || scenario === "updated-main" || scenario === "outside";
      if (success) await expect(run).resolves.toBeUndefined();
      else await expect(run).rejects.toThrow();
      expect(requests.every(({ method }) => method === "GET")).toBe(true);
      expect(requests.some(({ path }) => /check-runs|statuses|pulls\?|pulls\/14/.test(path))).toBe(false);
      if (success) expect(console.log).toHaveBeenCalledWith(expect.stringContaining(`PR #1; base ${base}; head ${head}; policy ${base}`));
      else expect(console.log).not.toHaveBeenCalled();
      if (scenario === "outside") expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Native required Code Owner review"));
    },
  );

  it("audits all listed PRs, reports failures and continues without publishing required checks", async () => {
    const head = configure();
    git("update-ref", "refs/pull/2/head", head);
    git("checkout", "main");
    git("remote", "add", "origin", directory);
    const requests: { path: string; method: string }[] = [];
    const request: typeof fetch = async (input, options) => {
      const url = new URL(String(input));
      const path = url.pathname.replace(`/repos/${repository}`, "") + url.search;
      requests.push({ path, method: options?.method ?? "GET" });
      if (path.startsWith("/pulls?")) return Response.json([{ number: 1 }, { number: 2 }]);
      if (path === "/pulls/1") return new Response(null, { status: 503 });
      if (path === "/pulls/2") return Response.json({
        number: 2, state: "open", base: { ref: "main", sha: base, repo: { full_name: repository } },
        head: { sha: head }, changed_files: 1,
      });
      if (path === "/git/ref/heads/main") return Response.json({ object: { sha: base } });
      if (path.startsWith("/pulls/2/files?")) return Response.json([{ filename: presentationPath, status: "modified" }]);
      throw new Error(`Unexpected mock API request: ${path}`);
    };
    await expect(runPolicy({
      directory, repository, token: "local-test-placeholder", request, event: { kind: "audit" },
    })).rejects.toThrow("One or more PRs failed presentation policy.");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("PR #1. Validation failed"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("PR #2;"));
    expect(requests.every(({ method, path }) => method === "GET" && !/check-runs|statuses/.test(path))).toBe(true);
  });

  it("pins trusted checkout and isolates the unconditional native gate from the audit", () => {
    const policy = readFileSync(".github/workflows/kyc-policy.yml", "utf8");
    const audit = readFileSync(".github/workflows/kyc-policy-audit.yml", "utf8");
    const ci = readFileSync(".github/workflows/ci.yml", "utf8");
    expect(policy).toContain("pull_request_target:");
    expect(policy).toContain("name: kyc/presentation-policy");
    expect(policy).toContain("node scripts/check-kyc-presentation.ts --pr");
    expect(policy).toContain("group: kyc-policy-pr-${{ github.event.pull_request.number }}");
    expect(policy).not.toMatch(/push:|workflow_dispatch:|if:|paths:|continue-on-error/);
    expect(audit).toContain("push:");
    expect(audit).toContain("workflow_dispatch:");
    expect(audit).toContain("node scripts/check-kyc-presentation.ts --audit");
    expect(audit).not.toMatch(/pull_request_target:|name: kyc\/presentation-policy/);
    for (const workflow of [policy, audit]) {
      expect(workflow).toContain("ref: main");
      expect(workflow).toContain("persist-credentials: false");
      expect(workflow).toContain("contents: read");
      expect(workflow).toContain("pull-requests: read");
      expect(workflow).not.toMatch(/npm ci|npm run|secrets\.|cache:|write/);
    }
    expect(ci).toContain("name: ci/quality");
    expect(ci).toContain("npm run check");
    expect(ci).toContain("npm run build");
    expect(ci).toContain("npm run test:e2e");
    expect(ci).not.toMatch(/write|secrets\.|if:|paths:|continue-on-error|cache:/);
    expect(readFileSync(".github/CODEOWNERS", "utf8")).toBe("* @thomaspmach\n/lib/kyc/presentation.json\n/.github/ @thomaspmach\n");
  });
});
