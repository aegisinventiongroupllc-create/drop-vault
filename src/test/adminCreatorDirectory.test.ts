import { describe, expect, it } from "vitest";
import { filterAdminCreators } from "@/components/AdminCountries";

describe("administrator country directory", () => {
  it("includes every creator in the default all-creators view", () => {
    const creators = [{ user_id: "woman", vault_side: "women" }, { user_id: "man", vault_side: "men" }, { user_id: "new", vault_side: "" }];
    expect(filterAdminCreators(creators, "all").map(c => c.user_id)).toEqual(["woman", "man", "new"]);
    expect(filterAdminCreators(creators, "men").map(c => c.user_id)).toEqual(["man"]);
  });
});