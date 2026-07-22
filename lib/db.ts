import { Pool, type PoolClient, type QueryResultRow } from "pg";

const DEFAULT_DATABASE_URL = "postgresql://betterbox:betterbox@127.0.0.1:54329/betterbox_story";

declare global {
  // eslint-disable-next-line no-var
  var storyReaderPool: Pool | undefined;
}

function isNextProductionBuild(): boolean {
  // CI / Docker image builds often have no Postgres; ISR pages must not fail the build.
  return process.env.NEXT_PHASE === "phase-production-build";
}

export const pool =
  globalThis.storyReaderPool ??
  new Pool({
    connectionString: process.env.STORY_DATABASE_URL ?? DEFAULT_DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 3_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.storyReaderPool = pool;
}

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
  try {
    const result = await pool.query<T>(text, values);
    return result.rows;
  } catch (error) {
    if (isNextProductionBuild()) {
      console.warn(
        "[db] build-time query failed; returning empty rows:",
        error instanceof Error ? error.message : error,
      );
      return [];
    }
    throw error;
  }
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
