export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootModuleRuntime } = await import("./server/runtime/boot");
    const runtime = bootModuleRuntime();
    const { startJobEngine } = await import("./server/runtime/jobs");
    runtime.enqueue = await startJobEngine();
  }
}
