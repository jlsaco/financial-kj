import { Issue, IssueKind } from "@/types";

const GITHUB_API = "https://api.github.com";

const OWNER = process.env.GITHUB_OWNER ?? "jlsaco";
const REPO = process.env.GITHUB_REPO ?? "financial-kj";
const TOKEN = process.env.GITHUB_TOKEN;

/** Maps the in-app issue kind to a GitHub label. */
const KIND_LABEL: Record<IssueKind, string> = {
  bug: "bug",
  mejora: "enhancement",
};

interface GitHubApiIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  state_reason: string | null;
  labels: Array<{ name: string } | string>;
  html_url: string;
  created_at: string;
  updated_at: string;
  pull_request?: unknown;
}

function assertToken(): string {
  if (!TOKEN) {
    throw new Error(
      "GITHUB_TOKEN no está configurado. Agrégalo a tu .env.local."
    );
  }
  return TOKEN;
}

function headers() {
  return {
    Authorization: `Bearer ${assertToken()}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

function toIssue(raw: GitHubApiIssue): Issue {
  return {
    id: raw.id,
    number: raw.number,
    title: raw.title,
    body: raw.body,
    state: raw.state,
    stateReason: raw.state_reason,
    labels: raw.labels.map((l) => (typeof l === "string" ? l : l.name)),
    url: raw.html_url,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

/** Lists the most recent issues (pull requests excluded). */
export async function listIssues(
  state: "open" | "closed" | "all" = "all"
): Promise<Issue[]> {
  const url = `${GITHUB_API}/repos/${OWNER}/${REPO}/issues?state=${state}&per_page=50&sort=created&direction=desc`;

  const res = await fetch(url, {
    headers: headers(),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GitHub API ${res.status}: ${detail}`);
  }

  const raw = (await res.json()) as GitHubApiIssue[];
  // The issues endpoint also returns PRs; filter them out.
  return raw.filter((i) => !i.pull_request).map(toIssue);
}

/** Creates a new issue in the configured repository. */
export async function createIssue(input: {
  title: string;
  body: string;
  kind: IssueKind;
}): Promise<Issue> {
  const url = `${GITHUB_API}/repos/${OWNER}/${REPO}/issues`;

  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      title: input.title,
      body: input.body,
      labels: [KIND_LABEL[input.kind]],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GitHub API ${res.status}: ${detail}`);
  }

  return toIssue((await res.json()) as GitHubApiIssue);
}
