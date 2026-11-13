// Runs once when the app starts. Next.js looks for this file by name.

export async function register() {
  // The timer needs Node.js features, so skip it in other runtimes.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAutoFetch } = await import("@/jobs/auto-fetch");
    startAutoFetch();
  }
}
