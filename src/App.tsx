import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/i18n/I18nContext";
import { HelmetProvider } from "react-helmet-async";
import GeoGate from "@/components/GeoGate";
import AppUpdateWatcher from "@/components/AppUpdateWatcher";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import SecretAdmin from "./pages/SecretAdmin.tsx";
import AdminPortal from "./pages/AdminPortal.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";

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
            <GeoGate>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/052417" element={<SecretAdmin />} />
                <Route path="/admin-portal" element={<AdminPortal />} />
                <Route path="/reset-password" element={<ResetPassword />} />
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
