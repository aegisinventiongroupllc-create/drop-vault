// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
const rollback = Error('rollback');
const inTx = (fn: (sql: postgres.TransactionSql) => Promise<void>) =>
  db!.begin(fn).catch((e) => { if (e !== rollback) throw e; });

async function seed(sql: postgres.TransactionSql) {
  const [{ d }] = await sql`SELECT pg_get_functiondef('public.record_creator_withdrawal(uuid,text,text)'::regprocedure) AS d`;
  await sql.unsafe(d.replace('public.record_creator_withdrawal', 'pg_temp.record_creator_withdrawal'));
  const [{ id }] = await sql`SELECT gen_random_uuid() AS id`;
  await sql`INSERT INTO public.bunny_video_deliveries(creator_id,bucket,storage_path,source_updated_at,video_id,state)
            VALUES (${id},'vault',${id + '/bought.mp4'},now(),gen_random_uuid(),'ready')`;
  return id as string;
}

describe.skipIf(!db)('creator consent withdrawal', () => {
  afterAll(async () => { await db?.end(); });

  it('disables but keeps purchased stream copies and archives records', async () => {
    await inTx(async (sql) => {
      const creator = await seed(sql);
      await sql`SELECT pg_temp.record_creator_withdrawal(${creator},'withdraw','test')`;
      const copies = await sql`SELECT state FROM public.bunny_video_deliveries WHERE creator_id=${creator}`;
      expect(copies.map((c) => c.state)).toEqual(['withdrawn']);
      const archive = await sql`SELECT jsonb_array_length(snapshot->'stream_copies') AS n FROM public.creator_compliance_archive WHERE creator_id=${creator}`;
      expect(archive[0].n).toBe(1);
      throw rollback;
    });
  });

  it.each(['DELETE FROM public.bunny_video_deliveries WHERE creator_id=$1', "UPDATE public.bunny_video_deliveries SET state='ready' WHERE creator_id=$1"])(
    'blocks deleting or re-enabling a withdrawn copy: %s', async (statement) => {
      await expect(db!.begin(async (sql) => {
        const creator = await seed(sql);
        await sql`SELECT pg_temp.record_creator_withdrawal(${creator},'withdraw',null)`;
        await sql.unsafe(statement, [creator]);
      })).rejects.toThrow(/archived and cannot be changed/);
    });

  it('changes nothing when the request is invalid', async () => {
    await inTx(async (sql) => {
      const creator = await seed(sql);
      await sql`SAVEPOINT s`;
      await expect(sql`SELECT pg_temp.record_creator_withdrawal(${creator},'bogus',null)`).rejects.toThrow(/invalid kind/);
      await sql`ROLLBACK TO SAVEPOINT s`;
      const [{ state }] = await sql`SELECT state FROM public.bunny_video_deliveries WHERE creator_id=${creator}`;
      const w = await sql`SELECT 1 FROM public.creator_consent_withdrawals WHERE creator_id=${creator}`;
      expect(state).toBe('ready');
      expect(w).toHaveLength(0);
      throw rollback;
    });
  });

  it('cannot be called by signed-in users directly', async () => {
    const [{ ok }] = await db!`SELECT has_function_privilege('authenticated','public.record_creator_withdrawal(uuid,text,text)','EXECUTE') AS ok`;
    expect(ok).toBe(false);
  });
});
