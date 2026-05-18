export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { loadModules } = await import("./src/server/modules/registry");
    await loadModules();
  }
}
