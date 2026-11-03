import { beforeEach, describe, expect, it } from "vitest";
import { clearAdminDashboardPreview, ADMIN_SESSION_KEY } from "@/lib/adminSession";

describe("normal account sign-in preview reset", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it("removes the customer preview that overrides creator sign-in", () => {
    localStorage.setItem("dtt_admin_view_as_customer", "1");
    clearAdminDashboardPreview();
    expect(localStorage.getItem("dtt_admin_view_as_customer")).toBeNull();
  });

  it("removes the creator preview that overrides customer sign-in", () => {
    localStorage.setItem("dtt_admin_view_as_creator", "1");
    clearAdminDashboardPreview();
    expect(localStorage.getItem("dtt_admin_view_as_creator")).toBeNull();
  });

  it("does not grant or change staff authorization", () => {
    sessionStorage.setItem(ADMIN_SESSION_KEY, "existing-session");
    clearAdminDashboardPreview();
    expect(sessionStorage.getItem(ADMIN_SESSION_KEY)).toBe("existing-session");
    expect(localStorage.getItem("dtt_admin_override")).toBeNull();
  });
});