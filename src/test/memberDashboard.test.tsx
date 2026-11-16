import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MemberDashboard from "@/components/MemberDashboard";

vi.mock("@/hooks/useSubscriptions", () => {
  const subs: unknown[] = [];
  return { useSubscriptions: () => ({ subs }) };
});
vi.mock("@/hooks/useHearts", () => {
  const hearts: unknown[] = [];
  return { useMyHearts: () => ({ hearts }) };
});
vi.mock("@/hooks/useCustomRequests", () => ({ useCustomRequests: () => ({ requests: [], loading: false, refresh: vi.fn() }) }));
vi.mock("@/components/PersonalSkyBackdrop", () => ({ default: () => null }));
vi.mock("@/components/WalletIndicator", () => ({ default: () => null }));
vi.mock("@/components/TokenPurchaseHistory", () => ({ default: () => null }));
vi.mock("@/components/SuggestionBox", () => ({ default: () => null }));
vi.mock("@/components/LegalFooter", () => ({ default: () => null }));

afterEach(cleanup);

describe("customer dashboard category rendering", () => {
  it("does not crash when the customer has explicitly unchecked every category", () => {
    expect(() => render(<MemberDashboard balance={0} preference={[]} onBuyTokens={() => {}} />)).not.toThrow();
  });
  it("does not crash when all stored category entries are invalid", () => {
    const preference = JSON.parse('["unknown-category"]');
    expect(() => render(<MemberDashboard balance={0} preference={preference} onBuyTokens={() => {}} />)).not.toThrow();
  });
});