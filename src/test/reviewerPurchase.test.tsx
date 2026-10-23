import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BuyTokensModal from "@/components/BuyTokensModal";
import { DEFAULT_PURCHASE_TOKENS, tokenInvoiceTotal } from "@/lib/tokenEconomy";
import { hasLibraryContent, isPlaybackInterruption } from "@/lib/teaserPlayback";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn().mockResolvedValue({ data: { enabled: false } }) } } }));
afterEach(cleanup);
describe("reviewer purchase safeguards", () => {
  it("starts with one $25 token rather than a five-token order", () => {
    render(<BuyTokensModal onClose={() => {}} onPurchase={() => {}} />);
    expect(screen.getByRole("spinbutton")).toHaveValue(1);
    expect(tokenInvoiceTotal(DEFAULT_PURCHASE_TOKENS)).toBe(25);
  });
  it.each([null, 0, -1, NaN])("does not offer an unlock for unavailable count %s", count => {
    expect(hasLibraryContent(count)).toBe(false);
  });
  it("allows an unlock when a library contains an item", () => {
    expect(hasLibraryContent(1)).toBe(true);
  });
  it("does not treat replacing a signed link as corrupt video", () => {
    expect(isPlaybackInterruption(new DOMException("play interrupted", "AbortError"))).toBe(true);
    expect(isPlaybackInterruption(new DOMException("unsupported", "NotSupportedError"))).toBe(false);
  });
});