import "server-only";

import PgBoss from "pg-boss";

import type { SolivioRuntime } from "@solivio/sdk/runtime";
import { subscribers } from "@/generated/events";
import { jobs } from "@/generated/jobs";
import { createModuleLogger } from "@/server/runtime/logger";

const BOSS_KEY = Symbol.for("solivio.pgboss");
type GlobalWithBoss = typeof globalThis & { [BOSS_KEY]?: PgBoss };

const logger = createModuleLogger({ module: "jobs" });

/**
 * Starts the Postgres-backed job engine (pg-boss): registers every module
 * job (with optional cron schedule) and a queue per persistent event
 * subscriber, and returns the `enqueue` hook for the SDK runtime.
 *
 * Runs inside the Next server process today; can be split into a standalone
 * worker later without touching module code.
 */
export async function startJobEngine(): Promise<SolivioRuntime["enqueue"]> {
  const g = globalThis as GlobalWithBoss;
  if (!g[BOSS_KEY]) {
    const boss = new PgBoss({ connectionString: process.env.DATABASE_URL! });
    boss.on("error", (error) => logger.error("pg-boss error", { error: String(error) }));
    await boss.start();
    g[BOSS_KEY] = boss;
  }
  const boss = g[BOSS_KEY];

  for (const job of jobs) {
    await boss.createQueue(job.name).catch(() => {});
    await boss.work(job.name, { batchSize: 1 }, async ([item]) => {
      logger.info("job started", { job: job.name, id: item.id });
      await job.handler(item.data);
      logger.info("job finished", { job: job.name, id: item.id });
    });
    const schedule = typeof job.schedule === "function" ? job.schedule() : job.schedule;
    if (schedule) {
      await boss.schedule(job.name, schedule, undefined, {
        retryLimit: job.retryLimit ?? 3,
      });
    }
  }

  for (const subscriber of subscribers) {
    if (!subscriber.persistent) continue;
    const queue = `subscriber:${subscriber.id}`;
    await boss.createQueue(queue).catch(() => {});
    await boss.work(queue, { batchSize: 1 }, async ([item]) => {
      await subscriber.handler(item.data);
    });
  }

  return async (jobName, payload) => {
    await boss.send(jobName, (payload ?? {}) as object, {
      retryLimit: jobs.find((job) => job.name === jobName)?.retryLimit ?? 3,
    });
  };
}
