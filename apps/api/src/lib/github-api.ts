import { AppError } from "./errors.js";

const API_BASE = "https://api.github.com";

/**
 * Minimal GitHub REST client. The token is only sent to api.github.com, never stored or logged.
 * 401 is mapped to 400 so the web app doesn't take it for an expired session.
 */
export class GithubApi {
  constructor(
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  /** Like get(), but 404 returns null. */
  async getOrNull<T>(path: string): Promise<T | null> {
    try {
      return await this.request<T>("GET", path);
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) return null;
      throw error;
    }
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${API_BASE}${path}`, {
        method,
        headers: {
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "collab-code-platform",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new AppError("Could not reach GitHub. Please try again.", 502);
    }

    if (response.ok) return (await response.json()) as T;

    const detail = await response
      .json()
      .then((data) => (data as { message?: string }).message)
      .catch(() => undefined);

    switch (response.status) {
      case 401:
        throw new AppError("GitHub did not accept the token: it is not valid or has expired.", 400);
      case 403:
        throw new AppError(
          detail?.toLowerCase().includes("rate limit")
            ? "GitHub is limiting requests for now. Please try later."
            : "The token cannot write to this repository (it needs Contents: write).",
          403,
        );
      case 404:
        throw new AppError("Repository or branch not found, or the token has no access to it.", 404);
      case 409:
      case 422:
        throw new AppError(`GitHub rejected the change${detail ? `: ${detail}` : "."}`, 409);
      default:
        throw new AppError("GitHub returned an error. Please try again.", 502);
    }
  }
}
