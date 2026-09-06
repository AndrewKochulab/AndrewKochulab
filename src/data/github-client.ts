/**
 * @module data/github-client
 * Typed access to the GitHub GraphQL API, limited to the queries this
 * project needs. The transport is injectable so the client is testable
 * without the network.
 */

/** Sends one GraphQL request and returns the `data` payload. */
export interface GraphQLTransport {
  query<T>(document: string, variables: Record<string, unknown>): Promise<T>;
}

/** Default transport using `fetch` against api.github.com. */
export class FetchGraphQLTransport implements GraphQLTransport {
  readonly #token: string;

  constructor(token: string) {
    this.#token = token;
  }

  async query<T>(document: string, variables: Record<string, unknown>): Promise<T> {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        authorization: `bearer ${this.#token}`,
        'content-type': 'application/json',
        'user-agent': 'andrewkochulab-profile-generator',
      },
      body: JSON.stringify({ query: document, variables }),
    });
    if (!response.ok) {
      throw new Error(`GitHub GraphQL responded ${response.status} ${response.statusText}`);
    }
    const payload = (await response.json()) as { data?: T; errors?: { message: string }[] };
    if (payload.errors && payload.errors.length > 0) {
      throw new Error(`GitHub GraphQL errors: ${payload.errors.map((e) => e.message).join('; ')}`);
    }
    if (payload.data === undefined) throw new Error('GitHub GraphQL returned no data');
    return payload.data;
  }
}

export interface RepositoryNode {
  readonly name: string;
  readonly isPrivate: boolean;
  readonly stargazerCount: number;
  readonly forkCount: number;
  readonly primaryLanguage: { readonly name: string; readonly color: string | null } | null;
  readonly languages: {
    readonly edges: readonly {
      readonly size: number;
      readonly node: { readonly name: string; readonly color: string | null };
    }[];
  };
}

/** GitHub's intensity buckets for a calendar day. */
export type ContributionLevel =
  'NONE' | 'FIRST_QUARTILE' | 'SECOND_QUARTILE' | 'THIRD_QUARTILE' | 'FOURTH_QUARTILE';

export interface ContributionDayNode {
  readonly date: string;
  readonly contributionCount: number;
  readonly contributionLevel: ContributionLevel;
}

/** Everything one fetch collects, shaped like the API but fully paginated. */
export interface RawProfile {
  readonly viewerLogin: string;
  readonly followers: number;
  readonly publicSourceRepos: number;
  readonly commits: number;
  readonly pullRequests: number;
  readonly totalContributions: number;
  readonly calendarDays: readonly ContributionDayNode[];
  readonly repositories: readonly RepositoryNode[];
}

const PROFILE_QUERY = `
query Profile($login: String!) {
  viewer { login }
  user(login: $login) {
    followers { totalCount }
    publicSource: repositories(privacy: PUBLIC, isFork: false, ownerAffiliations: OWNER) { totalCount }
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
  }
}`;

const REPOSITORIES_QUERY = `
query Repositories($login: String!, $after: String) {
  user(login: $login) {
    repositories(first: 100, after: $after, isFork: false, ownerAffiliations: OWNER, orderBy: { field: PUSHED_AT, direction: DESC }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        name
        isPrivate
        stargazerCount
        forkCount
        primaryLanguage { name color }
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
  }
}`;

interface ProfileResponse {
  readonly viewer: { readonly login: string };
  readonly user: {
    readonly followers: { readonly totalCount: number };
    readonly publicSource: { readonly totalCount: number };
    readonly contributionsCollection: {
      readonly totalCommitContributions: number;
      readonly totalPullRequestContributions: number;
      readonly contributionCalendar: {
        readonly totalContributions: number;
        readonly weeks: readonly { readonly contributionDays: readonly ContributionDayNode[] }[];
      };
    };
  } | null;
}

interface RepositoriesResponse {
  readonly user: {
    readonly repositories: {
      readonly pageInfo: { readonly hasNextPage: boolean; readonly endCursor: string | null };
      readonly nodes: readonly RepositoryNode[];
    };
  } | null;
}

/** Fetches the complete raw profile for `login`. */
export class GitHubClient {
  readonly #transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.#transport = transport;
  }

  async fetchProfile(login: string): Promise<RawProfile> {
    const [profile, repositories] = await Promise.all([
      this.#transport.query<ProfileResponse>(PROFILE_QUERY, { login }),
      this.#fetchAllRepositories(login),
    ]);
    if (profile.user === null) throw new Error(`GitHub user not found: ${login}`);
    const { contributionsCollection: contributions } = profile.user;
    return {
      viewerLogin: profile.viewer.login,
      followers: profile.user.followers.totalCount,
      publicSourceRepos: profile.user.publicSource.totalCount,
      commits: contributions.totalCommitContributions,
      pullRequests: contributions.totalPullRequestContributions,
      totalContributions: contributions.contributionCalendar.totalContributions,
      calendarDays: contributions.contributionCalendar.weeks.flatMap(
        (week) => week.contributionDays,
      ),
      repositories,
    };
  }

  async #fetchAllRepositories(login: string): Promise<RepositoryNode[]> {
    const nodes: RepositoryNode[] = [];
    let after: string | null = null;
    for (;;) {
      const page: RepositoriesResponse = await this.#transport.query<RepositoriesResponse>(
        REPOSITORIES_QUERY,
        { login, after },
      );
      if (page.user === null) throw new Error(`GitHub user not found: ${login}`);
      nodes.push(...page.user.repositories.nodes);
      const { pageInfo } = page.user.repositories;
      if (!pageInfo.hasNextPage || pageInfo.endCursor === null) return nodes;
      after = pageInfo.endCursor;
    }
  }
}
