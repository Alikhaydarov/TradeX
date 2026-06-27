import { getPostgresPool } from "@/lib/backend/postgres";

export type Mt5SyncJob = {
  id: string;
  account_id: string;
  user_id: string;
  requested_from: string | null;
  requested_to: string | null;
  attempts: number;
};

function retryDelayMinutes(attempts: number) {
  return Math.min(60, Math.max(2, 2 ** Math.max(0, attempts - 1)));
}

export async function enqueueMt5SyncJob(input: {
  accountId: string;
  userId: string;
  from?: string | null;
  to?: string | null;
  priority?: number;
}) {
  const pool = getPostgresPool();
  if (!pool) return null;

  const result = await pool.query<{ id: string }>(
    `insert into public.mt5_sync_jobs (
       account_id, user_id, priority, requested_from, requested_to, status, run_after, updated_at
     )
     values ($1, $2, $3, $4::timestamptz, $5::timestamptz, 'queued', now(), now())
     on conflict (account_id) where status in ('queued', 'running')
     do update set
       priority = least(public.mt5_sync_jobs.priority, excluded.priority),
       requested_from = coalesce(public.mt5_sync_jobs.requested_from, excluded.requested_from),
       requested_to = coalesce(excluded.requested_to, public.mt5_sync_jobs.requested_to),
       status = case when public.mt5_sync_jobs.status = 'running' then 'running' else 'queued' end,
       run_after = case when public.mt5_sync_jobs.status = 'running' then public.mt5_sync_jobs.run_after else now() end,
       updated_at = now()
     returning id`,
    [input.accountId, input.userId, input.priority ?? 100, input.from || null, input.to || null],
  );

  return result.rows[0] || null;
}

export async function claimMt5SyncJobs(limit: number) {
  const pool = getPostgresPool();
  if (!pool) throw new Error("DATABASE_URL or SUPABASE_DB_URL is required for MT5 sync queue.");

  const result = await pool.query<Mt5SyncJob>(
    `with picked as (
       select id
       from public.mt5_sync_jobs
       where status = 'queued'
       and run_after <= now()
       order by priority asc, created_at asc
       limit $1
       for update skip locked
     )
     update public.mt5_sync_jobs job
     set status = 'running',
         locked_until = now() + interval '3 minutes',
         attempts = attempts + 1,
         updated_at = now()
     from picked
     where job.id = picked.id
     returning job.id, job.account_id, job.user_id, job.requested_from, job.requested_to, job.attempts`,
    [Math.max(1, Math.min(25, limit))],
  );

  return result.rows;
}

export async function completeMt5SyncJob(jobId: string) {
  const pool = getPostgresPool();
  if (!pool) return;
  await pool.query(
    `update public.mt5_sync_jobs
     set status = 'done', locked_until = null, last_error = null, updated_at = now()
     where id = $1`,
    [jobId],
  );
}

export async function failMt5SyncJob(jobId: string, attempts: number, message: string) {
  const pool = getPostgresPool();
  if (!pool) return;
  const delay = retryDelayMinutes(attempts);
  await pool.query(
    `update public.mt5_sync_jobs
     set status = case when attempts >= max_attempts then 'error' else 'queued' end,
         run_after = case when attempts >= max_attempts then run_after else now() + ($2::text || ' minutes')::interval end,
         locked_until = null,
         last_error = $3,
         updated_at = now()
     where id = $1`,
    [jobId, delay, message.slice(0, 1000)],
  );
}
