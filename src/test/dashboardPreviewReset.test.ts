import { beforeEach, describe, expect, it } from "vitest";
import { clearAdminDashboardPreview, startAdminDashboardPreview, ADMIN_SESSION_KEY } from "@/lib/adminSession";

describe("normal account sign-in preview reset", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it.each(["creator", "customer"] as const)("switches exclusively to the %s dashboard", role => {
    localStorage.setItem("dtt_admin_view_as_creator", "1");
    localStorage.setItem("dtt_admin_view_as_customer", "1");
    startAdminDashboardPreview(role);
    expect(localStorage.getItem(`dtt_admin_view_as_${role}`)).toBe("1");
    expect(localStorage.getItem(`dtt_admin_view_as_${role === "creator" ? "customer" : "creator"}`)).toBeNull();
    expect(sessionStorage.getItem(ADMIN_SESSION_KEY)).toBeNull();
  });

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