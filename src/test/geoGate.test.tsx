import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import GeoGate from "@/components/GeoGate";

vi.mock("@/components/LegalFooter", () => ({ default: () => null }));
vi.mock("@/components/GhostCountryMessage", () => ({ default: () => <input aria-label="Restriction state" /> }));

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });

const enter = () => render(<GeoGate><input aria-label="Protected account" /></GeoGate>);
describe("country entry access", () => {
  it.each(["JP", "ZA", "IR", "IN", "NG"])("denies excluded %s despite local overrides", async (country) => {
    localStorage.setItem("dtt_admin_override", "1");
    localStorage.setItem("dtt_geo_country", JSON.stringify({ code: "US", ts: Date.now() }));
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ country_code: country }) });
    vi.stubGlobal("fetch", fetcher);
    const view = enter();
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    await waitFor(() => expect(view.getByRole("textbox", { name: "Restriction state" })).toBeInTheDocument());
    expect(view.queryByRole("textbox", { name: "Protected account" })).toBeNull();
  });
  it("allows a nonexcluded detected country without relying on a saved value", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ country_code: "KE" }) }));
    const view = enter();
    await waitFor(() => expect(view.getByRole("textbox", { name: "Protected account" })).toBeInTheDocument());
  });
  it("denies access when both detection services fail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Unavailable")));
    const view = enter();
    await waitFor(() => expect(view.getByRole("button")).toBeEnabled());
    expect(view.queryByRole("textbox", { name: "Protected account" })).toBeNull();
  });
  it("denies placeholder country codes rather than treating them as eligible", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ country_code: "XX" }) }));
    const view = enter();
    await waitFor(() => expect(view.getByRole("button")).toBeEnabled());
    expect(view.queryByRole("textbox", { name: "Protected account" })).toBeNull();
  });
});