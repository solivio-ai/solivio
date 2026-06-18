import { customType } from "drizzle-orm/pg-core";

/**
 * TODO move
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
