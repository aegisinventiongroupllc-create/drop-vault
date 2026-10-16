import { describe, expect, it } from "vitest";
import { allowedVaults } from "@/lib/customerPreference";
describe("customer gender preference", () => {
  it("shows both genders only for explicit Both", () => { expect(allowedVaults("both")).toEqual(["women", "men"]); expect(allowedVaults(undefined)).toEqual(["women"]); });
  it("keeps women-only selection strict", () => { expect(allowedVaults("women")).toEqual(["women"]); });
  it("keeps men-only selection strict", () => { expect(allowedVaults("men")).toEqual(["men"]); });
});