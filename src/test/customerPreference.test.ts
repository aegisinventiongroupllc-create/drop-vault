import { describe, expect, it } from "vitest";
import { allowedVaults } from "@/lib/customerPreference";
describe("customer gender preference", () => {
  it("shows both genders only for explicit Both", () => { expect(allowedVaults("both")).toEqual(["women", "men"]); expect(allowedVaults(undefined)).toEqual(["women"]); });
  it("keeps women-only selection strict", () => { expect(allowedVaults("women")).toEqual(["women"]); });
  it("keeps men-only selection strict", () => { expect(allowedVaults("men")).toEqual(["men"]); });
  it("requires an explicit Trans Women choice", () => { expect(allowedVaults("trans_women")).toEqual(["trans_women"]); expect(allowedVaults("both")).not.toContain("trans_women"); });
  it("requires an explicit Trans Men choice", () => { expect(allowedVaults("trans_men")).toEqual(["trans_men"]); expect(allowedVaults("both")).not.toContain("trans_men"); });
});