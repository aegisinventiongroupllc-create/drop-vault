import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CustomerLaunchWaitlist from "@/components/CustomerLaunchWaitlist";
import AdminCustomerWaitlist from "@/components/AdminCustomerWaitlist";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn(), invoke: vi.fn(), create: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc, auth: { getUser: mocks.getUser, signOut: vi.fn() }, functions: { invoke: mocks.invoke } } }));
vi.mock("@/lib/customerTicketImage", () => ({ createCustomerTicketImage: mocks.create, saveCustomerTicketImage: vi.fn() }));
vi.mock("@/components/CreatorLaunchCountdown", () => ({ default: () => null }));
vi.mock("@/components/GalaxyReel", () => ({ default: () => null }));
vi.mock("@/components/DttFutureAnnouncement", () => ({ default: () => null }));
vi.mock("@/components/LegalFooter", () => ({ default: () => null }));
vi.mock("@/components/AutoTranslator", () => ({ getTargetLang: () => "en" }));

const saved = { country: "US", joined_at: "2026-11-21T15:00:00Z", language: "en" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "12345678-1234-1234-1234-123456789abc" } }, error: null });
  mocks.create.mockResolvedValue(new Blob());
  mocks.invoke.mockResolvedValue({ data: { enabled: false }, error: null });
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

describe("customer waiting-list recovery and updates", () => {
  it("retries a failed status read before allowing a join", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error("Offline") }).mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: saved, error: null });
    render(<CustomerLaunchWaitlist />);
    fireEvent.change(screen.getByLabelText("Your country"), { target: { value: "US" } });
    fireEvent.click(await screen.findByRole("button", { name: "RETRY WAITING LIST" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "JOIN FREE & GET MY DTT TICKET" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "JOIN FREE & GET MY DTT TICKET" }));
    await screen.findByRole("dialog");
    expect(mocks.rpc.mock.calls.map(call => call[1]._action)).toEqual(["status", "status", "join"]);
    expect(mocks.rpc).toHaveBeenLastCalledWith("my_customer_launch_waitlist", { _action: "join", _country: "US", _language: "en" });
  });
  it("only saves changed countries and does not celebrate an existing membership", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: saved, error: null }).mockResolvedValueOnce({ data: { ...saved, country: "CA" }, error: null });
    render(<CustomerLaunchWaitlist />);
    await waitFor(() => expect(screen.getByLabelText("Saved country")).toHaveValue("US"));
    expect(screen.getByRole("button", { name: "UPDATE MY COUNTRY" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Saved country"), { target: { value: "CA" } });
    fireEvent.click(screen.getByRole("button", { name: "UPDATE MY COUNTRY" }));
    await waitFor(() => expect(mocks.create).toHaveBeenLastCalledWith(expect.objectContaining({ country: "CA", annualUsd: 10, number: "DTT-12345678-1234-1234-1234-123456789ABC" }), "Canada"));
    await waitFor(() => expect(screen.getByRole("button", { name: "UPDATE MY COUNTRY" })).toBeDisabled());
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("admin waiting-list country selection", () => {
  it("resets pagination when selecting a country and returns to all countries", async () => {
    const data = { total: 55, countries: [{ country: "US", total: 52 }, { country: "CA", total: 3 }], entries: [] };
    mocks.rpc.mockImplementation(async (fn: string) => ({ data: fn === "admin_customer_launch_waitlist" ? data : null, error: null }));
    render(<AdminCustomerWaitlist />);
    fireEvent.click(await screen.findByRole("button", { name: "NEXT" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("admin_customer_launch_waitlist", { _country: undefined, _offset: 50 }));
    fireEvent.click(await screen.findByRole("button", { name: "Canada 3" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("admin_customer_launch_waitlist", { _country: "CA", _offset: 0 }));
    fireEvent.click(await screen.findByRole("button", { name: "ALL COUNTRIES 55" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenLastCalledWith("admin_customer_launch_waitlist", { _country: undefined, _offset: 0 }));
    expect(screen.getByRole("button", { name: "SEND PAY NOW TO ALL WAITING CUSTOMERS" })).toBeDisabled();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });
});