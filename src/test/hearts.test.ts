import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ insert: vi.fn(), delete: vi.fn(), eq: vi.fn(), getUser: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getUser: mocks.getUser }, from: () => ({ insert: mocks.insert, delete: mocks.delete }) } }));
import { toggleHeart } from "@/hooks/useHearts";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "fan" } } });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.delete.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ eq: () => Promise.resolve({ error: null }) });
});
it("saves a creator under the authenticated fan and broadcasts the change", async () => {
  const changed = vi.fn(); window.addEventListener("dtt-hearts-changed", changed);
  expect(await toggleHeart("creator", false)).toBe(true);
  expect(mocks.insert).toHaveBeenCalledWith({ user_id: "fan", creator_id: "creator" });
  expect(changed).toHaveBeenCalledTimes(1);
  window.removeEventListener("dtt-hearts-changed", changed);
});
it("toggles saved creators off", async () => { expect(await toggleHeart("creator", true)).toBe(false); expect(mocks.eq).toHaveBeenCalledWith("user_id", "fan"); });
it("does not report a saved heart when persistence fails", async () => { mocks.insert.mockResolvedValue({ error: { message: "denied" } }); expect(await toggleHeart("creator", false)).toBeNull(); });