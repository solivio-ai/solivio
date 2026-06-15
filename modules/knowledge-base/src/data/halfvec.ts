import { customType } from "drizzle-orm/pg-core";

/**
 * pgvector half-precision vector custom type.
 * Copied from modules/catalog/src/data/halfvec.ts — candidate for extraction
 * to @solivio/domain when a third module needs it.
 */
export const halfvec = customType<{
  data: number[];
  driverData: string;
  config: { dimensions: number };
}>({
  dataType(config) {
    return `halfvec(${config?.dimensions ?? 0})`;
  },
  toDriver(value) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value) {
    return value.slice(1, -1).split(",").map(Number);
  },
});
