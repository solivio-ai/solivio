export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootModuleRuntime } = await import("./src/server/runtime/boot");
    const runtime = bootModuleRuntime();
    const { startJobEngine } = await import("./src/server/runtime/jobs");
    runtime.enqueue = await startJobEngine();
  }
}
