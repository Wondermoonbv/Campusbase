import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ViewAsBanner } from "./ViewAsBanner";
import { AppFooter } from "./AppFooter";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <a href="#main-content" className="sr-skip-link">Naar hoofdinhoud</a>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <ViewAsBanner />
          <header className="h-12 flex items-center border-b border-border bg-card px-4 shrink-0">
            <SidebarTrigger className="mr-4" aria-label="Menu openen/sluiten" />
          </header>
          <main id="main-content" className="flex-1 overflow-auto" role="main">
            {children}
          </main>
          <AppFooter />
        </div>
      </div>
    </SidebarProvider>
  );
}
