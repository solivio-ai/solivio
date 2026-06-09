/**
 * Open registries filled in by modules via TypeScript declaration merging.
 *
 * A module's `src/services.ts` augments {@link Services} with the services it
 * provides; its `src/events.ts` augments {@link Events} with the events it
 * emits. The generated registries (`yarn generate`) import those files, which
 * pulls the augmentations into the program — `getService("...")` and
 * `emitEvent("...")` are then fully typed.
 *
 * Example (in `modules/catalog/src/services.ts`):
 *
 * ```ts
 * declare module "@solivio/sdk" {
 *   interface Services {
 *     catalog: CatalogService;
 *   }
 * }
 * ```
 */

// biome-ignore lint/suspicious/noEmptyInterface: merged by module declarations
export interface Services {}

/**
 * Event name → payload map. Event names follow `<moduleId>.<entity>.<action>`
 * and a module may only declare events under its own id prefix.
 */
// biome-ignore lint/suspicious/noEmptyInterface: merged by module declarations
export interface Events {}

export type ServiceName = keyof Services;
export type EventName = keyof Events;
