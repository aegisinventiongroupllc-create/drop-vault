import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BuyTokensModal from "@/components/BuyTokensModal";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), affirm: vi.fn(), insert: vi.fn() }));
vi.mock("@/lib/ageConsent", () => ({ affirmAgeConsent: mocks.affirm }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  functions: { invoke: mocks.invoke },
  auth: { getSession: vi.fn(async () => ({ data: { session: { user: { id: "customer" } } } })), getUser: vi.fn(async () => ({ data: { user: { id: "customer" } } })) },
  from: vi.fn(() => ({ insert: mocks.insert })),
  channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() })),
  removeChannel: vi.fn(),
} }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("accepted request checkout", () => {
  it("requires both confirmations and sends a fresh receipt with the request, never a browser-supplied price", async () => {
    mocks.invoke.mockReset().mockImplementation(async (name, options) => options.body.probe ? { data: { enabled: name === "cryptocloud-create-invoice" } } : { data: { invoice_id: "invoice", invoice_url: "https://checkout.example/invoice", order_id: "order" } });
    mocks.affirm.mockResolvedValue("fresh-checkout-receipt");
    mocks.insert.mockResolvedValue({ error: null });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ip: "unknown" }))));
    vi.spyOn(window, "open").mockReturnValue(null);
    await act(async () => { render(<BuyTokensModal mode="custom_request" request={{ id: "request-123", amountUsd: 500 }} onClose={() => {}} onPurchase={() => {}} />); });
    const pay = screen.getByRole("button", { name: "GENERATE PAYMENT — $505" });
    expect(pay).toBeDisabled();
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(pay).toBeDisabled();
    fireEvent.click(screen.getAllByRole("checkbox")[1]);
    fireEvent.click(pay);
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("cryptocloud-create-invoice", { body: { kind: "custom_request", request_id: "request-123", consent_receipt: "fresh-checkout-receipt" } }));
    expect(mocks.affirm).toHaveBeenCalledWith("checkout");
  });

  it("does not create an invoice when the provider is unavailable", async () => {
    mocks.invoke.mockReset().mockResolvedValue({ data: { enabled: false } });
    await act(async () => { render(<BuyTokensModal mode="custom_request" request={{ id: "request-123", amountUsd: 20 }} onClose={() => {}} onPurchase={() => {}} />); });
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getAllByRole("checkbox")[1]);
    fireEvent.click(screen.getByRole("button", { name: "CHECKOUT UNAVAILABLE" }));
    expect(mocks.invoke.mock.calls.every(([, options]) => options.body.probe === true)).toBe(true);
  });
});