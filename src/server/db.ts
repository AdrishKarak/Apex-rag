/**
 * @file src/server/db.ts
 * @description Database connection bootstrapper that configures Prisma Client with a PostgreSQL connection pool adapter.
 * 
 * FLOW OF EXECUTION:
 * 1. Read the `DATABASE_URL` from the environments parser (`src/env.js`).
 * 2. Create a `pg.Pool` instance (node-postgres connection pool) to handle database queries.
 * 3. Wrap the database pool in a `PrismaPg` adapter to make it compatible with Prisma ORM.
 * 4. Instantiate a new `PrismaClient` using this adapter, dynamically specifying logging levels.
 * 5. In development modes, cache the instance globally on `globalThis` to avoid spawning redundant connection pools during code hot reloads.
 * 
 * CONNECTIONS:
 * - Loaded by `src/server/api/trpc.ts` to attach the database client context to incoming tRPC endpoints.
 * - Used throughout background workers (`src/lib/github-loaders.ts`, `src/lib/assembly.ts`, etc.) for direct data management.
 */

import { env } from "@/env";
import { PrismaClient } from "../../generated/prisma"; // Generated schema files containing DB client
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

/**
 * Creates and configures a new PrismaClient instance.
 */
const createPrismaClient = () => {
  // Initialize the PostgreSQL connection pool. It manages a cache of database client connections.
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
  
  // Wrap the pool with Prisma's native adapter to enable direct PG integration.
  const adapter = new PrismaPg(pool);
  
  // Instantiate PrismaClient using the PostgreSQL pool adapter and configure logging levels.
  return new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
};

// Set up a global cache reference to persist the client instance during development hot-reloads.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

// If in development mode and the schema gets reloaded, clear the cached instance to pull in schema updates.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = undefined;
}

// Export the active database instance. Resolves from the cached global object or spawns a new client.
export const db = globalForPrisma.prisma ?? createPrismaClient();

// Save the active instance to the global variable in non-production builds.
if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;


