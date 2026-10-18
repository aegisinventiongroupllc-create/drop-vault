// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";

const connection = process.env.SUPABASE_DB_URL;
const database = connection ? postgres(connection, { max: 1 }) : null;

// Run against the live catalog only when a secure sandbox connection is available.
describe.skipIf(!database)("live database privacy rules", () => {
  let policies: { tablename: string; policyname: string; permissive: string; cmd: string; roles: string[]; qual: string | null; with_check: string | null }[] = [];
  beforeAll(async () => {
    if (!database) throw new Error("Secure database connection required");
    policies = await database`SELECT tablename, policyname, permissive, cmd, roles, qual, with_check FROM pg_policies WHERE schemaname IN ('public', 'storage')`;
  });
  afterAll(async () => { await database?.end(); });

  it("enables RLS on every application table", async () => {
    if (!database) throw new Error("Secure database connection required");
    const rows = await database`SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity`;
    expect(rows).toHaveLength(0);
  });

  it("limits personal-profile reads to the owner or a server-verified admin", () => {
    const reads = policies.filter(p => p.tablename === "profiles" && p.cmd === "SELECT");
    expect(reads).toHaveLength(2);
    expect(reads.every(p => p.roles.length === 1 && p.roles[0] === "authenticated")).toBe(true);
    expect(reads.find(p => p.policyname === "Users can view own profile")?.qual).toMatch(/auth\.uid\(\).*user_id/s);
    expect(reads.find(p => p.policyname === "Admins can view all profiles")?.qual).toMatch(/has_role.*auth\.uid\(\).*admin/s);
  });

  it("excludes personal contact and legal details from the public profile projection", async () => {
    if (!database) throw new Error("Secure database connection required");
    const rows = await database`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='public_profiles'`;
    expect(rows.map(r => r.column_name).sort()).toEqual(["user_id", "display_name", "country", "vault_side", "role", "created_at", "avatar_config", "profile_photo_path", "tags"].sort());
  });

  it("keeps the creator photo bucket private", async () => {
    if (!database) throw new Error("Secure database connection required");
    const rows = await database`SELECT public FROM storage.buckets WHERE id='creator-profile-photos'`;
    expect(rows).toHaveLength(1);
    expect(rows[0].public).toBe(false);
  });

  it.each(["INSERT", "UPDATE", "DELETE"])("requires both file-owner and folder-owner checks for photo %s", cmd => {
    const writes = policies.filter(p => p.tablename === "objects" && p.permissive === "PERMISSIVE" && p.cmd === cmd && `${p.qual} ${p.with_check}`.includes("creator-profile-photos"));
    expect(writes).toHaveLength(1);
    expect(writes[0].roles).toEqual(["authenticated"]);
    const clauses = cmd === "UPDATE" ? [writes[0].qual, writes[0].with_check] : [cmd === "INSERT" ? writes[0].with_check : writes[0].qual];
    for (const clause of clauses) {
      expect(clause).toMatch(/owner_id.*auth\.uid\(\)/s);
      expect(clause).toMatch(/foldername\(name\).*auth\.uid\(\)/s);
      expect(clause).toMatch(/has_role.*creator/s);
    }
  });

  it("allows other members to read only selected photos with matching registered ownership", () => {
    const reads = policies.filter(p => p.tablename === "objects" && p.cmd === "SELECT" && p.qual?.includes("creator-profile-photos"));
    expect(reads).toHaveLength(1);
    expect(reads[0].roles).toEqual(["authenticated"]);
    expect(reads[0].qual).toMatch(/cpp\.is_active/);
    expect(reads[0].qual).toMatch(/objects\.owner_id.*cpp\.creator_id/s);
    expect(reads[0].qual).toMatch(/cpp\.creator_id.*foldername\(objects\.name\)/s);
  });

  it("exposes only the allowlisted globe setting to visitors", () => {
    const reads = policies.filter(p => p.tablename === "app_settings" && p.cmd === "SELECT" && p.roles.includes("anon"));
    expect(reads).toHaveLength(1);
    expect(reads[0].qual).toBe("(key = 'globe_style'::text)");
  });

  it("denies anonymous access to private profiles and direct writes to the public view", async () => {
    if (!database) throw new Error("Secure database connection required");
    const rows = await database`SELECT has_table_privilege('anon','public.profiles','SELECT') AS private_read, has_table_privilege('authenticated','public.public_profiles','UPDATE') AS public_write, has_table_privilege('authenticated','public.profiles','TRUNCATE') AS truncate_private`;
    expect(rows[0]).toMatchObject({ private_read: false, public_write: false, truncate_private: false });
  });
});