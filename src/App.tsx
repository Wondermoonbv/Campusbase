import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ScholenPage from "./pages/ScholenPage";
import SchoolDetailPage from "./pages/SchoolDetailPage";
import OpleidingenPage from "./pages/OpleidingenPage";
import ContractenPage from "./pages/ContractenPage";
import EventenPage from "./pages/EventenPage";
import EventDetailPage from "./pages/EventDetailPage";
import RapportagePage from "./pages/RapportagePage";
import GebruikersPage from "./pages/GebruikersPage";
import InstellingenPage from "./pages/InstellingenPage";
import TakenPage from "./pages/TakenPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAdmin } = useAuth();

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/scholen" element={<ScholenPage />} />
        <Route path="/scholen/:id" element={<SchoolDetailPage />} />
        <Route path="/opleidingen" element={<OpleidingenPage />} />
        <Route path="/contracten" element={<ContractenPage />} />
        <Route path="/evenementen" element={<EventenPage />} />
        <Route path="/evenementen/:id" element={<EventDetailPage />} />
        <Route path="/rapportage" element={<RapportagePage />} />
        <Route path="/taken" element={<TakenPage />} />
        {isAdmin && <Route path="/gebruikers" element={<GebruikersPage />} />}
        <Route path="/instellingen" element={<InstellingenPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
