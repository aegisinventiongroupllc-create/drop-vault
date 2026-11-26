import { beforeEach, describe, expect, it } from "vitest";
import { setSignupIntent } from "@/lib/signupIntent";
import { isCreatorSignup, isCustomerSignup } from "@/lib/foundingInvitation";

describe("sign-up side choice", () => {
  beforeEach(() => { sessionStorage.clear(); window.history.replaceState(null, "", "/?signup=creator"); });
  it("picking CUSTOMER beats an old creator link", () => {
    setSignupIntent("customer");
    expect(isCustomerSignup(window.location.search)).toBe(true);
    expect(isCreatorSignup(window.location.search)).toBe(false);
    expect(window.location.search).toContain("signup=customer");
  });
  it("without a pick, the link decides", () => {
    expect(isCreatorSignup(window.location.search)).toBe(true);
  });
});
