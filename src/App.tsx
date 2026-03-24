import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import ScholenPage from "./pages/ScholenPage";
import SchoolDetailPage from "./pages/SchoolDetailPage";
import OpleidingenPage from "./pages/OpleidingenPage";
import ContractenPage from "./pages/ContractenPage";
import EventenPage from "./pages/EventenPage";
import EventDetailPage from "./pages/EventDetailPage";
import RapportagePage from "./pages/RapportagePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
