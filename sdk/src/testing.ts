/**
 * Test helpers for module authors. `createTestContext` builds a
 * {@link ModuleContext} backed by no-op/stub infrastructure so a module's
 * `register` (and the capabilities it returns) can be unit-tested in isolation,
 * without the core. Override any handle via `overrides`.
 */
import type {
  AiClientFactory,
  ConfigResolver,
  EventBus,
  Logger,
  ModuleContext,
} from "./module-context.js";
import type { CoreServices } from "./services.js";

function noopLogger(): Logger {
  const log: Logger = {
    debug() {},
    info() {},
    warn() {},
    error() {},
    child() {
      return log;
    },
  };
  return log;
}

/** A stub that throws on any property access — used for un-overridden services. */
function unprovided<T extends object>(name: string): T {
  return new Proxy({} as T, {
    get() {
      throw new Error(`createTestContext: ${name} not provided — pass it via overrides.`);
    },
  });
}

export interface TestContextOverrides {
  logger?: Logger;
  config?: Partial<ConfigResolver> & { values?: Record<string, string> };
  ai?: Partial<AiClientFactory>;
  services?: Partial<CoreServices>;
  events?: EventBus;
}

export function createTestContext(overrides: TestContextOverrides = {}): ModuleContext {
  const values = overrides.config?.values ?? {};
  const config: ConfigResolver = {
    get: overrides.config?.get ?? ((key) => values[key]),
    require:
      overrides.config?.require ??
      ((key) => {
        const v = values[key];
        if (v === undefined) throw new Error(`Missing config: ${key}`);
        return v;
      }),
  };

  const ai: AiClientFactory = {
    chatModelId: overrides.ai?.chatModelId ?? (() => "test-chat-model"),
    embeddingModelId: overrides.ai?.embeddingModelId ?? (() => "test-embedding-model"),
  };

  const events: EventBus = overrides.events ?? { subscribe() {} };

  const services: CoreServices = {
    products: overrides.services?.products ?? unprovided("services.products"),
    offers: overrides.services?.offers ?? unprovided("services.offers"),
    history: overrides.services?.history ?? unprovided("services.history"),
  };

  return {
    logger: overrides.logger ?? noopLogger(),
    config,
    ai,
    events,
    services,
  };
}
