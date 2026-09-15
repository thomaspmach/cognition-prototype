import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { maxPresentationBytes, parsePresentationJson, presentationPath } from "../lib/kyc/presentation-schema.ts";

const shaPattern = /^[0-9a-f]{40}$/;

export type DiffEntry = {
  status: "A" | "D" | "M" | "T" | "R";
  path: string;
  previousPath?: string;
  oldMode: string;
  newMode: string;
};
export type ApiFile = { filename: string; status: string; previous_filename?: string };
export type PullSnapshot = {
  number: number;
  state: string;
  baseRef: string;
  baseRepository: string;
  base: string;
  head: string;
  changedFiles: number;
};
export type PolicyEvent = { kind: "pr"; pull: PullSnapshot } | { kind: "audit" };

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid API object.");
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== "string" || !value) throw new Error("Missing API string.");
  return value;
}

function integer(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("Invalid API integer.");
  return value;
}

export function parsePull(value: unknown): PullSnapshot {
  const pull = record(value);
  const base = record(pull.base);
  return {
    number: integer(pull.number),
    state: text(pull.state),
    baseRef: text(base.ref),
    baseRepository: text(record(base.repo).full_name),
    base: text(base.sha),
    head: text(record(pull.head).sha),
    changedFiles: integer(pull.changed_files),
  };
}

export function parseDiff(raw: string): DiffEntry[] {
  if (!raw) return [];
  if (!raw.endsWith("\0")) throw new Error("Incomplete Git diff.");
  const fields = raw.slice(0, -1).split("\0");
  const changes: DiffEntry[] = [];
  for (let index = 0; index < fields.length;) {
    const header = /^:(\d{6}) (\d{6}) [0-9a-f]{40} [0-9a-f]{40} (A|D|M|T|R\d{1,3})$/.exec(fields[index++]);
    if (!header) throw new Error("Unsupported Git diff metadata.");
    const path = fields[index++];
    if (!path) throw new Error("Missing Git path.");
    const status = header[3];
    if (status.startsWith("R")) {
      const destination = fields[index++];
      if (!destination || Number(status.slice(1)) > 100) throw new Error("Invalid rename metadata.");
      changes.push({ status: "R", previousPath: path, path: destination, oldMode: header[1], newMode: header[2] });
    } else {
      changes.push({ status: status as "A" | "D" | "M" | "T", path, oldMode: header[1], newMode: header[2] });
    }
  }
  return changes;
}

export function compareFiles(changes: DiffEntry[], files: ApiFile[], reportedCount: number) {
  if (!changes.length || changes.length !== reportedCount || files.length !== reportedCount) {
    throw new Error("Empty or incomplete PR diff.");
  }
  const statuses: Record<DiffEntry["status"], readonly string[]> = {
    A: ["added"], D: ["removed"], M: ["modified", "changed"], T: ["changed", "modified"], R: ["renamed"],
  };
  const byPath = new Map(files.map((file) => [file.filename, file]));
  if (byPath.size !== files.length || new Set(changes.map((change) => change.path)).size !== changes.length) {
    throw new Error("Duplicate changed paths.");
  }
  for (const change of changes) {
    const file = byPath.get(change.path);
    if (!file || !statuses[change.status].includes(file.status) || change.previousPath !== file.previous_filename) {
      throw new Error("Git and GitHub disagree about the complete diff.");
    }
  }
}

function git(directory: string, args: string[], token?: string): string {
  const output = execFileSync("git", args, {
    cwd: directory,
    maxBuffer: 8 * 1024 * 1024,
    env: token ? {
      ...process.env,
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
      GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`,
    } : process.env,
  });
  return new TextDecoder("utf-8", { fatal: true }).decode(output);
}

function assertSha(sha: string) {
  if (!shaPattern.test(sha)) throw new Error("Invalid commit SHA.");
}

export function inspectPresentation(directory: string, base: string, head: string) {
  assertSha(base);
  assertSha(head);
  git(directory, ["merge-base", "--is-ancestor", base, head]);
  for (const sha of [base, head]) {
    const entry = git(directory, ["ls-tree", "-z", sha, "--", presentationPath]);
    if (!new RegExp(`^100644 blob [0-9a-f]{40}\\t${presentationPath.replaceAll(".", "\\.")}\\0$`).test(entry)) {
      throw new Error("Presentation must remain an existing regular 100644 Git blob.");
    }
  }
  const size = Number(git(directory, ["cat-file", "-s", `${head}:${presentationPath}`]).trim());
  if (!Number.isSafeInteger(size) || size > maxPresentationBytes) throw new Error("Presentation exceeds 4 KiB.");
  const source = git(directory, ["show", `${head}:${presentationPath}`]);
  parsePresentationJson(source);
  const changes = parseDiff(git(directory, [
    "diff", "--raw", "--no-abbrev", "--no-ext-diff", "--no-textconv", "--find-renames=50%", "-z", base, head, "--",
  ]));
  if (!changes.length) throw new Error("Empty PR diff.");
  const configurationOnly = changes.length === 1 && changes[0].path === presentationPath
    && changes[0].status === "M" && changes[0].oldMode === "100644" && changes[0].newMode === "100644";
  return { configurationOnly, changes };
}

export function assertCurrent(pull: PullSnapshot, current: PullSnapshot, repository: string, policySha: string, main: string) {
  if (pull.number < 1 || pull.state !== "open" || current.state !== "open"
    || pull.baseRef !== "main" || current.baseRef !== "main"
    || pull.baseRepository !== repository || current.baseRepository !== repository
    || pull.number !== current.number || pull.head !== current.head || pull.base !== current.base
    || pull.changedFiles !== current.changedFiles || pull.base !== main || policySha !== main) {
    throw new Error("Stale PR, base or policy identity; rerun against current main.");
  }
  assertSha(pull.base);
  assertSha(pull.head);
}

export async function paginate(getPage: (page: number) => Promise<unknown>): Promise<unknown[]> {
  const items: unknown[] = [];
  for (let page = 1; page <= 100; page++) {
    const result = await getPage(page);
    if (!Array.isArray(result) || result.length > 100) throw new Error("Invalid API page.");
    items.push(...result);
    if (result.length < 100) return items;
  }
  throw new Error("API pagination limit exceeded.");
}

export function parseApiFile(value: unknown): ApiFile {
  const file = record(value);
  return {
    filename: text(file.filename),
    status: text(file.status),
    ...(file.previous_filename === undefined ? {} : { previous_filename: text(file.previous_filename) }),
  };
}

export function assertEvent(eventName: string, ref: string, payload: unknown, repository: string): PolicyEvent {
  const event = record(payload);
  if (text(record(event.repository).full_name) !== repository) throw new Error("Wrong event repository.");
  if (ref !== "refs/heads/main") throw new Error("Policy must run from main.");
  if (eventName === "pull_request_target") {
    const pull = parsePull(event.pull_request);
    if (pull.number < 1 || pull.number !== integer(event.number) || pull.state !== "open"
      || pull.baseRef !== "main" || pull.baseRepository !== repository) throw new Error("Wrong PR target.");
    assertSha(pull.base);
    assertSha(pull.head);
    return { kind: "pr", pull };
  }
  if (!["push", "workflow_dispatch"].includes(eventName)) throw new Error("Unsupported policy event.");
  return { kind: "audit" };
}

export async function runPolicy({
  directory, repository, token, event, request = fetch,
}: { directory: string; repository: string; token: string; event: PolicyEvent; request?: typeof fetch }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !token) throw new Error("Missing repository or built-in token.");
  async function api(path: string): Promise<unknown> {
    const response = await request(`https://api.github.com/repos/${repository}${path}`, {
      method: "GET", redirect: "error",
      headers: {
        Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`GitHub API failed (${response.status}).`);
    return response.json();
  }
  const policySha = git(directory, ["rev-parse", "HEAD"]).trim();
  const numbers = event.kind === "pr" ? [event.pull.number]
    : (await paginate((page) => api(`/pulls?state=open&base=main&per_page=100&page=${page}`)))
      .map((pull) => integer(record(pull).number));
  if (numbers.some((number) => number < 1) || new Set(numbers).size !== numbers.length) {
    throw new Error("Invalid or duplicate PR listing.");
  }
  let failed = false;
  for (const number of numbers) {
    try {
      const pull = parsePull(await api(`/pulls/${number}`));
      if (pull.number !== number) throw new Error("Wrong PR returned by GitHub.");
      const snapshot = event.kind === "pr" ? event.pull : pull;
      const main = text(record(record(await api("/git/ref/heads/main")).object).sha);
      assertCurrent(snapshot, pull, repository, policySha, main);
      git(directory, ["fetch", "--no-tags", "origin", "refs/heads/main", `refs/pull/${number}/head`], token);
      const result = inspectPresentation(directory, pull.base, pull.head);
      const files = (await paginate((page) => api(`/pulls/${number}/files?per_page=100&page=${page}`))).map(parseApiFile);
      compareFiles(result.changes, files, pull.changedFiles);
      const current = parsePull(await api(`/pulls/${number}`));
      const currentMain = text(record(record(await api("/git/ref/heads/main")).object).sha);
      assertCurrent(snapshot, current, repository, policySha, currentMain);
      console.log(`PR #${number}; base ${pull.base}; head ${pull.head}; policy ${policySha}.\n\n`
        + (result.configurationOnly
          ? "Valid configuration-only diff. No Code Owner is assigned to this path."
          : "Outside-scope diff. Native required Code Owner review must be satisfied.")
        + "\n\nci/quality must also pass. This result does not grant approval or merge permission.");
    } catch (error) {
      if (event.kind === "pr") throw error;
      failed = true;
      console.error(`PR #${number}. Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  if (failed) throw new Error("One or more PRs failed presentation policy.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const repository = process.env.GITHUB_REPOSITORY ?? "";
    const payload: unknown = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH ?? "", "utf8"));
    const event = assertEvent(process.env.GITHUB_EVENT_NAME ?? "", process.env.GITHUB_REF ?? "", payload, repository);
    if (process.argv.length !== 3 || process.argv[2] !== `--${event.kind}`) throw new Error("Wrong policy mode for event.");
    await runPolicy({ directory: process.cwd(), repository, token: process.env.GITHUB_TOKEN ?? "", event });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Presentation policy failed.");
    process.exitCode = 1;
  }
}
