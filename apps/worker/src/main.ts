import { Worker } from "bullmq";
import { MockBrokerProvider } from "@tradoxy/broker";

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379", maxRetriesPerRequest: null };

const worker = new Worker("broker-sync", async (job) => {
  const provider = new MockBrokerProvider();
  const snapshot = await provider.getAccountSnapshot();
  return { jobId: job.id, provider: provider.id, snapshot };
}, { connection });

worker.on("failed", (job, error) => console.error("broker-sync failed", { jobId: job?.id, message: error.message }));

async function shutdown() { await worker.close(); process.exit(0); }
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

