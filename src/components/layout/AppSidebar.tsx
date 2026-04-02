import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  FileText,
  CalendarDays,
  BarChart3,
  Users,
  LogOut,
  Settings,
  CheckSquare,
  UserCheck,
  Contact,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useViewAs } from "@/contexts/ViewAsContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useMemo } from "react";

const allNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: ["admin", "editor", "viewer"] },
  { title: "Scholen", url: "/scholen", icon: GraduationCap, roles: ["admin", "editor", "viewer"] },
  { title: "Opleidingen", url: "/opleidingen", icon: BookOpen, roles: ["admin", "editor", "viewer"] },
  { title: "Evenementen", url: "/evenementen", icon: CalendarDays, roles: ["admin", "editor", "viewer"] },
  { title: "Ambassadeurs", url: "/ambassadeurs", icon: UserCheck, roles: ["admin", "editor", "viewer"] },
  { title: "Contracten", url: "/contracten", icon: FileText, roles: ["admin", "editor"] },
  { title: "Taken", url: "/taken", icon: CheckSquare, roles: ["admin", "editor"] },
  { title: "Rapportage", url: "/rapportage", icon: BarChart3, roles: ["admin", "editor", "viewer"] },
  { title: "Gebruikers", url: "/gebruikers", icon: Users, roles: ["admin"] },
  { title: "Instellingen", url: "/instellingen", icon: Settings, roles: ["admin"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, platformSettings } = useAuth();
  const { effectiveRole } = useViewAs();

  const visibleItems = useMemo(
    () => allNavItems.filter((item) => item.roles.includes(effectiveRole)),
    [effectiveRole]
  );

  const initials = user ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() : "?";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className={`px-4 py-5 ${collapsed ? "px-2" : ""}`}>
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              {platformSettings.companyLogoUrl && (
                <img src={platformSettings.companyLogoUrl} alt="Logo" className="h-7 w-7 rounded object-contain" />
              )}
              <div>
                <h1 className="text-base font-bold text-sidebar-foreground tracking-tight">
                  {platformSettings.companyName || "Elia Campus"}
                </h1>
                <p className="text-xs text-sidebar-foreground/60 mt-0.5">
                  Recruitment CRM
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              {platformSettings.companyLogoUrl ? (
                <img src={platformSettings.companyLogoUrl} alt="Logo" className="h-6 w-6 rounded object-contain" />
              ) : (
                <span className="text-lg font-bold text-sidebar-foreground">
                  {(platformSettings.companyName || "E")[0]}
                </span>
              )}
            </div>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const isActive =
                  item.url === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className={`relative flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        }`}
                        activeClassName=""
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-accent" />
                        )}
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className={`px-3 py-3 border-t border-sidebar-border ${collapsed ? "px-1" : ""}`}>
          {!collapsed && user && (
            <div className="w-full flex items-center gap-2.5 mb-2 px-1 py-1.5">
              <Avatar className="h-8 w-8 border border-sidebar-border">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback className="text-xs font-semibold bg-sidebar-accent text-sidebar-accent-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
                <p className="text-xs text-sidebar-foreground/60 capitalize">{user.role}</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-full flex items-center justify-center mb-2 py-1.5">
              <Avatar className="h-7 w-7 border border-sidebar-border">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback className="text-xs font-semibold bg-sidebar-accent text-sidebar-accent-foreground">{initials}</AvatarFallback>
              </Avatar>
            </div>
          )}
          
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="ml-2">Uitloggen</span>}
          </Button>
          {!collapsed && (
            <p className="text-[10px] text-sidebar-foreground/30 text-center mt-3 tracking-wide">
              Powered by <a href="https://wondermoon.be" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-sidebar-foreground/50 transition-colors">CampusBase</a>
            </p>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
