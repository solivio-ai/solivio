export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootModuleRuntime } = await import("./src/server/runtime/boot");
    bootModuleRuntime();
    const { loadModules } = await import("./src/server/modules/registry");
    await loadModules();
  }
}
