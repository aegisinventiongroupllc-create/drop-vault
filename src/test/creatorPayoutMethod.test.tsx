import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreatorPayoutMethod from "@/components/CreatorPayoutMethod";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
vi.mock("@/i18n/creator", () => ({ useCreatorText: () => ({ how_paid: "How you get paid", ltc_ph: "LTC address", save_payout: "Save payout method", saved_toast: "Saved", tax_note: "", saved: "Saved", litecoin: "Litecoin" }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("creator payout selection", () => {
  beforeEach(() => { rpc.mockReset(); rpc.mockResolvedValue({ data: [], error: null }); });
  it("saves Litecoin only without submitting bank details", async () => {
    render(<CreatorPayoutMethod />);
    fireEvent.change(screen.getByRole("textbox", { name: "Litecoin payout address" }), { target: { value: "LreviewerWalletAddress" } });
    fireEvent.click(screen.getByRole("button", { name: "Save payout method" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("set_my_payout_method", {
      _method: "ltc", _account_holder: "", _bank_name: "", _routing: "", _account: "", _account_type: "", _ltc: "LreviewerWalletAddress",
    }));
  });
});