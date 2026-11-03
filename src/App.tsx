import AutoTranslator from "@/components/AutoTranslator";
import LanguageTransition from "@/components/LanguageTransition";
import SiteLanguagePicker from "@/components/SiteLanguagePicker";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/i18n/I18nContext";
import { HelmetProvider } from "react-helmet-async";
import GeoGate from "@/components/GeoGate";
import { VipFogMachine } from "@/components/VipBackdrop";
import AppUpdateWatcher from "@/components/AppUpdateWatcher";
import BeRightBack from "@/components/BeRightBack";
import LaunchIntro from "@/components/LaunchIntro";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import SecretAdmin from "./pages/SecretAdmin.tsx";
import AdminPortal from "./pages/AdminPortal.tsx";
import AdminVerificationDashboard from "./pages/AdminVerificationDashboard";
import ParticipantInvite from "./pages/ParticipantInvite";
import ResetPassword from "./pages/ResetPassword.tsx";
import Pricing from "./pages/Pricing.tsx";
import EntryPassGate from "./components/EntryPassGate";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <I18nProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppUpdateWatcher />
            <AutoTranslator />
            <LanguageTransition />
            <SiteLanguagePicker />
            <VipFogMachine />
            <BeRightBack />
            <LaunchIntro />
            <GeoGate>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/admin-access" element={<SecretAdmin />} />
                <Route path="/admin-portal" element={<AdminPortal />} />
                <Route path="/admin/verifications" element={<AdminVerificationDashboard />} />
                <Route path="/participant-invite" element={<ParticipantInvite />} />
                <Route path="/reset-password" element={<ResetPassword />} />
<Route path="/pricing" element={<Pricing />} />
                <Route path="/entry-pass-preview" element={<EntryPassGate onPurchased={() => { window.location.href = "/"; }} />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </GeoGate>
          </BrowserRouter>
        </TooltipProvider>
      </I18nProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
