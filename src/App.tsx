import { useState, useEffect, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ActivityProvider } from "@/contexts/ActivityContext";
import { ViewAsProvider, useViewAs } from "@/contexts/ViewAsContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Analytics } from "@vercel/analytics/react";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

// Lazy-loaded page components
const LoginPage = lazy(() => import("./pages/LoginPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ScholenPage = lazy(() => import("./pages/ScholenPage"));
const ContactenPage = lazy(() => import("./pages/ContactenPage"));
const SchoolDetailPage = lazy(() => import("./pages/SchoolDetailPage"));
const OpleidingenPage = lazy(() => import("./pages/OpleidingenPage"));
const ContractenPage = lazy(() => import("./pages/ContractenPage"));
const EventenPage = lazy(() => import("./pages/EventenPage"));
const EventDetailPage = lazy(() => import("./pages/EventDetailPage"));
const RapportagePage = lazy(() => import("./pages/RapportagePage"));
const GebruikersPage = lazy(() => import("./pages/GebruikersPage"));
const InstellingenPage = lazy(() => import("./pages/InstellingenPage"));
const TakenPage = lazy(() => import("./pages/TakenPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PublicFeedbackPage = lazy(() => import("./pages/PublicFeedbackPage"));
const AmbassadeursPage = lazy(() => import("./pages/AmbassadeursPage"));
const PublicInschrijvenPage = lazy(() => import("./pages/PublicInschrijvenPage"));
const StandenbouwerPage = lazy(() => import("./pages/StandenbouwerPage"));
const AuditLogPage = lazy(() => import("./pages/AuditLogPage"));
const AmbassadeurPortaalPage = lazy(() => import("./pages/AmbassadeurPortaalPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
    },
    mutations: {
      onError: (error: any) => {
        const message = error?.message || "Er is een fout opgetreden";
        if (message.includes("Failed to fetch") || message.includes("NetworkError") || message.includes("ERR_CONNECTION")) {
          import("sonner").then(({ toast }) => toast.error("Verbinding mislukt, probeer opnieuw"));
        }
      },
    },
  },
});

function PageFallback() {
  return (
    <div className="flex-1 flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function PublicRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/feedback/:formId" element={<PublicFeedbackPage />} />
        <Route path="/inschrijven/:evenementId" element={<PublicInschrijvenPage />} />
        <Route path="/ambassadeur-portaal" element={<AmbassadeurPortaalPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
      </Routes>
    </Suspense>
  );
}

function AppRoutes() {
  const { user, isAdmin, isStandenbouwer, loading } = useAuth();
  const { effectiveIsAdmin, effectiveIsStandenbouwer, effectiveCanEdit, isSimulating } = useViewAs();
  const [timedOut, setTimedOut] = useState(false);
  const pathname = window.location.pathname;
  const isPublicRoute = pathname.startsWith("/feedback/") || pathname.startsWith("/inschrijven/") || pathname.startsWith("/ambassadeur-portaal") || pathname === "/privacy";

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, [loading]);

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
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (isStandenbouwer && !isSimulating) {
    return (
      <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/standenbouwer" element={<StandenbouwerPage />} />
          <Route path="*" element={<Navigate to="/standenbouwer" replace />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    );
  }

  if (effectiveIsStandenbouwer && isSimulating) {
    return (
      <AppLayout>
        <ErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/standenbouwer" element={<StandenbouwerPage />} />
            <Route path="*" element={<Navigate to="/standenbouwer" replace />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/ambassadeurs" element={<AmbassadeursPage />} />
          <Route path="/" element={<DashboardPage />} />
          <Route path="/scholen" element={<ScholenPage />} />
          <Route path="/scholen/:id" element={<SchoolDetailPage />} />
          <Route path="/contacten" element={<ContactenPage />} />
          <Route path="/opleidingen" element={<OpleidingenPage />} />
          <Route path="/contracten" element={<ContractenPage />} />
          <Route path="/evenementen" element={<EventenPage />} />
          <Route path="/evenementen/:id" element={<EventDetailPage />} />
          <Route path="/rapportage" element={<RapportagePage />} />
          <Route path="/taken" element={<TakenPage />} />
          {effectiveIsAdmin && <Route path="/gebruikers" element={<GebruikersPage />} />}
          {effectiveIsAdmin && <Route path="/audit-log" element={<AuditLogPage />} />}
          {effectiveIsAdmin ? (
            <Route path="/instellingen" element={<InstellingenPage />} />
          ) : (
            <Route path="/instellingen" element={<Navigate to="/" replace />} />
          )}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
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
          <ViewAsProvider>
            <ActivityProvider>
              <AppRoutes />
            </ActivityProvider>
          </ViewAsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    <Analytics />
  </QueryClientProvider>
);

export default App;
