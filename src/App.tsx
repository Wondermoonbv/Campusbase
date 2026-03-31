import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ActivityProvider } from "@/contexts/ActivityContext";
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
import PublicFeedbackPage from "./pages/PublicFeedbackPage";
import AmbassadeursPage from "./pages/AmbassadeursPage";
import PublicInschrijvenPage from "./pages/PublicInschrijvenPage";
import StandenbouwerPage from "./pages/StandenbouwerPage";

const queryClient = new QueryClient();

function PublicRoutes() {
  return (
    <Routes>
      <Route path="/feedback/:formId" element={<PublicFeedbackPage />} />
      <Route path="/inschrijven/:evenementId" element={<PublicInschrijvenPage />} />
    </Routes>
  );
}

function AppRoutes() {
  const { user, isAdmin, isStandenbouwer, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  const pathname = window.location.pathname;
  const isPublicRoute = pathname.startsWith("/feedback/") || pathname.startsWith("/inschrijven/");

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  // Public routes render immediately without waiting for auth
  if (isPublicRoute) {
    return <PublicRoutes />;
  }

  if (loading) {
    if (timedOut) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <p className="text-destructive font-medium">Verbinding met de server duurt te lang.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Opnieuw proberen
          </button>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Laden...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Standenbouwer gets their own isolated routes
  if (isStandenbouwer) {
    return (
      <Routes>
        <Route path="/standenbouwer" element={<StandenbouwerPage />} />
        <Route path="*" element={<Navigate to="/standenbouwer" replace />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/ambassadeurs" element={<AmbassadeursPage />} />
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
        {isAdmin ? (
          <Route path="/instellingen" element={<InstellingenPage />} />
        ) : (
          <Route path="/instellingen" element={<Navigate to="/" replace />} />
        )}
        <Route path="/login" element={<Navigate to="/" replace />} />
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
          <ActivityProvider>
            <AppRoutes />
          </ActivityProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
