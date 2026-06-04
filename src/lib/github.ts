import { Issue, IssueKind, Release } from "@/types";

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

/** Headers para endpoints públicos (p. ej. releases de un repo público).
 *  El token es opcional: si existe sube el rate-limit, pero no es obligatorio. */
function publicHeaders(): Record<string, string> {
  const base: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (TOKEN) base.Authorization = `Bearer ${TOKEN}`;
  return base;
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

/** Fetches a single issue by its number. */
export async function getIssue(issueNumber: number): Promise<Issue> {
  const url = `${GITHUB_API}/repos/${OWNER}/${REPO}/issues/${issueNumber}`;

  const res = await fetch(url, {
    headers: headers(),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GitHub API ${res.status}: ${detail}`);
  }

  return toIssue((await res.json()) as GitHubApiIssue);
}

/** Creates a new issue in the configured repository.
 *  `extraLabels` se añaden además del label derivado de `kind` (GitHub crea los
 *  que no existan al asignarlos). Se deduplican. */
export async function createIssue(input: {
  title: string;
  body: string;
  kind: IssueKind;
  extraLabels?: string[];
}): Promise<Issue> {
  const url = `${GITHUB_API}/repos/${OWNER}/${REPO}/issues`;

  const labels = Array.from(
    new Set([KIND_LABEL[input.kind], ...(input.extraLabels ?? [])])
  );

  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      title: input.title,
      body: input.body,
      labels,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GitHub API ${res.status}: ${detail}`);
  }

  return toIssue((await res.json()) as GitHubApiIssue);
}

interface GitHubApiRelease {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string | null;
  draft: boolean;
  prerelease: boolean;
}

function toRelease(raw: GitHubApiRelease): Release {
  return {
    id: raw.id,
    tagName: raw.tag_name,
    name: raw.name,
    body: raw.body,
    url: raw.html_url,
    publishedAt: raw.published_at,
    isDraft: raw.draft,
    isPrerelease: raw.prerelease,
  };
}

/** Lists the repository's published releases, newest first (drafts excluded).
 *  El endpoint de releases es público para repos públicos: no requiere token. */
export async function listReleases(): Promise<Release[]> {
  const url = `${GITHUB_API}/repos/${OWNER}/${REPO}/releases?per_page=50`;

  const res = await fetch(url, {
    headers: publicHeaders(),
    // Releases cambian con cada deploy; cacheamos un poco para no agotar el
    // rate-limit pero sin quedar demasiado obsoletos.
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GitHub API ${res.status}: ${detail}`);
  }

  const raw = (await res.json()) as GitHubApiRelease[];
  return raw.filter((r) => !r.draft).map(toRelease);
}

/** Adds a comment to an existing issue. Returns the new comment's url. */
export async function addIssueComment(
  issueNumber: number,
  body: string
): Promise<{ id: number; url: string }> {
  const url = `${GITHUB_API}/repos/${OWNER}/${REPO}/issues/${issueNumber}/comments`;

  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ body }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GitHub API ${res.status}: ${detail}`);
  }

  const raw = (await res.json()) as { id: number; html_url: string };
  return { id: raw.id, url: raw.html_url };
}

/** Opens or closes an issue. For closed issues a reason can be set. */
export async function setIssueState(
  issueNumber: number,
  state: "open" | "closed",
  stateReason?: "completed" | "not_planned"
): Promise<Issue> {
  const url = `${GITHUB_API}/repos/${OWNER}/${REPO}/issues/${issueNumber}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({
      state,
      ...(state === "closed" && stateReason
        ? { state_reason: stateReason }
        : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GitHub API ${res.status}: ${detail}`);
  }

  return toIssue((await res.json()) as GitHubApiIssue);
}
