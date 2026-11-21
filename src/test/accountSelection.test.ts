import { beforeEach, describe, expect, it } from "vitest";
import { cancelAccountSelection, consumeAccountSelection, requestAccountSelection } from "@/lib/accountSelection";

describe("fresh-login account choice", () => {
  beforeEach(() => sessionStorage.clear());
  it("asks for creator or customer after a fresh login, only once", () => {
    requestAccountSelection();
    expect(consumeAccountSelection()).toBe(true);
    expect(consumeAccountSelection()).toBe(false);
  });
  it("keeps returning sessions on their saved dashboard", () => {
    expect(consumeAccountSelection()).toBe(false);
  });
  it("does not retain a failed sign-in request", () => {
    requestAccountSelection();
    cancelAccountSelection();
    expect(consumeAccountSelection()).toBe(false);
  });
});