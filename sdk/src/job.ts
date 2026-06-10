/**
 * A background job — one per file under a module's `src/jobs/`,
 * default-exported via {@link defineJob}. Jobs run on the Postgres-backed
 * queue (pg-boss): retried on failure, optionally cron-scheduled.
 */
export interface JobDefinition<TPayload = void> {
  /** Unique name, must be prefixed with the module id: `<moduleId>.<job>`. */
  readonly name: string;
  /**
   * Cron expression; when set, the job is scheduled automatically at boot.
   * A function form is resolved at boot (the runtime is initialized then), so
   * modules can derive the schedule from their deployment options.
   */
  readonly schedule?: string | (() => string | undefined);
  /** Retry attempts on failure (default 3). */
  readonly retryLimit?: number;
  readonly handler: (payload: TPayload) => Promise<void>;
}

export function defineJob<TPayload = void>(job: JobDefinition<TPayload>): JobDefinition<TPayload> {
  return job;
}

// biome-ignore lint/suspicious/noExplicitAny: registry holds jobs of heterogeneous payloads
export type AnyJobDefinition = JobDefinition<any>;
