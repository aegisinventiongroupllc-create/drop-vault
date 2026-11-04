import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AgeVerification from "@/components/AgeVerification";
const mocks=vi.hoisted(()=>({insert:vi.fn(),affirm:vi.fn()}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:()=>({insert:mocks.insert})}}));
vi.mock("@/lib/ageConsent",()=>({affirmAgeConsent:mocks.affirm}));
vi.mock("@/i18n/I18nContext",()=>({useI18n:()=>({t:{age_title:"Drop That ",age_subtitle:"Adults only",age_consent:"Adult consent",tos_consent:"Terms consent",contractor_consent:"Independent consent",age_enter:"ENTER",age_leave:"LEAVE"}})}));
vi.mock("@/components/LegalFooter",()=>({default:()=>null}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
describe("entry consent persistence",()=>{
  it("does not enter when consent cannot be recorded",async()=>{
    mocks.insert.mockResolvedValue({error:{message:"Unavailable"}});
    const enter=vi.fn();render(<AgeVerification onVerified={enter}/>);
    for(const box of screen.getAllByRole("checkbox"))fireEvent.click(box);
    fireEvent.click(screen.getByRole("button",{name:"ENTER"}));
    await waitFor(()=>expect(screen.getByRole("alert")).toBeTruthy());
    expect(enter).not.toHaveBeenCalled();expect(mocks.affirm).not.toHaveBeenCalled();
  });
  it("does not enter when server receipt issuance fails",async()=>{
    mocks.insert.mockResolvedValue({error:null});mocks.affirm.mockRejectedValue(new Error("Unavailable"));
    const enter=vi.fn();render(<AgeVerification onVerified={enter}/>);
    for(const box of screen.getAllByRole("checkbox"))fireEvent.click(box);
    fireEvent.click(screen.getByRole("button",{name:"ENTER"}));
    await waitFor(()=>expect(screen.getByRole("alert")).toBeTruthy());expect(enter).not.toHaveBeenCalled();
  });
});