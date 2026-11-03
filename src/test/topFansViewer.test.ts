import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { isOwnFanBoard } from "@/components/TopFansSection";

describe("Top 10 viewer distinction", () => {
  it("recognizes a creator viewing their own board", () => { expect(isOwnFanBoard("lovebug", "lovebug")).toBe(true); });
  it("keeps a customer on the customer side", () => { expect(isOwnFanBoard("lucky777", "lovebug")).toBe(false); });
  it("does not assume an unresolved session owns the board", () => { expect(isOwnFanBoard(null, "lovebug")).toBe(false); });
});