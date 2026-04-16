import { useState, useEffect, useMemo } from "react";
import { usePendingInschrijvingenCount } from "@/hooks/usePendingInschrijvingen";
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
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Shield,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useViewAs } from "@/contexts/ViewAsContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
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
import { cn } from "@/lib/utils";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  children?: { title: string; url: string; icon: React.ComponentType<{ className?: string }>; roles: string[] }[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "OVERZICHT",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: ["admin", "editor", "viewer"] },
    ],
  },
  {
    label: "CAMPUS",
    items: [
      {
        title: "Scholen",
        url: "/scholen",
        icon: GraduationCap,
        roles: ["admin", "editor", "viewer"],
        children: [
          { title: "Contacten", url: "/contacten", icon: Contact, roles: ["admin", "editor", "viewer"] },
        ],
      },
      { title: "Opleidingen", url: "/opleidingen", icon: BookOpen, roles: ["admin", "editor", "viewer"] },
      { title: "Evenementen", url: "/evenementen", icon: CalendarDays, roles: ["admin", "editor", "viewer"] },
      { title: "Ambassadeurs", url: "/ambassadeurs", icon: UserCheck, roles: ["admin", "editor", "viewer"] },
    ],
  },
  {
    label: "BEHEER",
    items: [
      { title: "Contracten", url: "/contracten", icon: FileText, roles: ["admin", "editor"] },
      { title: "Taken", url: "/taken", icon: CheckSquare, roles: ["admin", "editor"] },
    ],
  },
  {
    label: "ANALYSE",
    items: [
      { title: "Rapportage", url: "/rapportage", icon: BarChart3, roles: ["admin", "editor", "viewer"] },
    ],
  },
  {
    label: "ADMINISTRATIE",
    items: [
      { title: "Gebruikers", url: "/gebruikers", icon: Users, roles: ["admin"] },
      { title: "Activiteitenlog", url: "/audit-log", icon: ClipboardList, roles: ["admin"] },
      { title: "Instellingen", url: "/instellingen", icon: Settings, roles: ["admin"] },
    ],
  },
];

const STORAGE_KEY = "sidebar-collapsed-groups";

function loadCollapsedGroups(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, platformSettings } = useAuth();
  const { effectiveRole } = useViewAs();

  const pendingCount = usePendingInschrijvingenCount();

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(loadCollapsedGroups);
  const [expandedSubmenus, setExpandedSubmenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsedGroups));
  }, [collapsedGroups]);

  // Auto-expand submenu if a child route is active
  useEffect(() => {
    navGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children?.some((c) => location.pathname.startsWith(c.url))) {
          setExpandedSubmenus((prev) => ({ ...prev, [item.url]: true }));
        }
      });
    });
  }, [location.pathname]);

  const visibleGroups = useMemo(() => {
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items
          .filter((item) => item.roles.includes(effectiveRole))
          .map((item) => ({
            ...item,
            children: item.children?.filter((c) => c.roles.includes(effectiveRole)),
          })),
      }))
      .filter((group) => group.items.length > 0);
  }, [effectiveRole]);

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const toggleSubmenu = (url: string) => {
    setExpandedSubmenus((prev) => ({ ...prev, [url]: !prev[url] }));
  };

  const isItemActive = (url: string) =>
    url === "/" ? location.pathname === "/" : location.pathname.startsWith(url);

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "?";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo / brand */}
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
                <p className="text-xs text-sidebar-foreground/60 mt-0.5">Recruitment CRM</p>
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

        {/* Navigation groups */}
        {visibleGroups.map((group) => {
          const isGroupCollapsed = !!collapsedGroups[group.label];

          return (
            <SidebarGroup key={group.label}>
              {/* Group label — clickable to collapse */}
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex items-center justify-between w-full px-4 pt-4 pb-1.5 group"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                    {group.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 text-sidebar-foreground/30 transition-transform duration-200 opacity-0 group-hover:opacity-100",
                      isGroupCollapsed && "-rotate-90"
                    )}
                  />
                </button>
              )}

              {/* Items */}
              {(!isGroupCollapsed || collapsed) && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const active = isItemActive(item.url);
                      const hasChildren = item.children && item.children.length > 0;
                      const submenuOpen = !!expandedSubmenus[item.url];

                      return (
                        <div key={item.title}>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={active}>
                              <div className="flex items-center w-full">
                                <NavLink
                                  to={item.url}
                                  end={item.url === "/"}
                                  className={cn(
                                    "relative flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors flex-1",
                                    active
                                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                                  )}
                                  activeClassName=""
                                >
                                  {active && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-accent" />
                                  )}
                                  <item.icon className="h-4 w-4 shrink-0" />
                                  {!collapsed && (
                                    <span className="flex-1">{item.title}</span>
                                  )}
                                  {!collapsed && item.url === "/ambassadeurs" && pendingCount > 0 && (
                                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white px-1">
                                      {pendingCount}
                                    </span>
                                  )}
                                </NavLink>
                                {hasChildren && !collapsed && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSubmenu(item.url);
                                    }}
                                    className="p-1.5 rounded hover:bg-sidebar-accent/50 transition-colors mr-1"
                                  >
                                    <ChevronDown
                                      className={cn(
                                        "h-3.5 w-3.5 text-sidebar-foreground/50 transition-transform duration-200",
                                        submenuOpen && "rotate-180"
                                      )}
                                    />
                                  </button>
                                )}
                              </div>
                            </SidebarMenuButton>
                          </SidebarMenuItem>

                          {/* Sub-items */}
                          {hasChildren && submenuOpen && !collapsed && (
                            <div className="ml-4 border-l border-sidebar-border/30 pl-2 mt-0.5 mb-1">
                              {item.children!.map((child) => {
                                const childActive = isItemActive(child.url);
                                return (
                                  <SidebarMenuItem key={child.title}>
                                    <SidebarMenuButton asChild isActive={childActive}>
                                      <NavLink
                                        to={child.url}
                                        className={cn(
                                          "flex items-center gap-2.5 px-3 py-1.5 rounded text-[13px] font-medium transition-colors",
                                          childActive
                                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/80"
                                        )}
                                        activeClassName=""
                                      >
                                        <child.icon className="h-3.5 w-3.5 shrink-0" />
                                        <span>{child.title}</span>
                                      </NavLink>
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        {!collapsed && (
          <p className="text-[10px] text-sidebar-foreground/30 text-center tracking-wide px-3">
            Powered by{" "}
            <a
              href="https://wondermoon.be"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:text-sidebar-foreground/50 transition-colors"
            >
              CampusBase
            </a>
          </p>
        )}
        <div className={cn("border-t border-sidebar-border", collapsed ? "px-1 py-1" : "px-2 py-1")}>
          <Popover>
            <PopoverTrigger asChild>
              <button
                aria-haspopup="menu"
                aria-label="Profielmenu openen"
                className={cn(
                  "flex items-center w-full gap-2 rounded-md transition-colors hover:bg-sidebar-accent/50 h-10",
                  collapsed ? "justify-center px-1" : "px-2"
                )}
              >
                <Avatar className="h-8 w-8 shrink-0 border border-sidebar-border">
                  <AvatarImage src={user?.avatarUrl} />
                  <AvatarFallback className="text-xs font-semibold bg-sidebar-accent text-sidebar-accent-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-sm font-medium text-sidebar-foreground truncate text-left">
                      {user?.firstName}
                    </span>
                    <ChevronUp className="h-4 w-4 shrink-0 text-sidebar-foreground/50" />
                  </>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              sideOffset={8}
              className="w-[var(--radix-popover-trigger-width)] p-0 bg-sidebar border-sidebar-border"
            >
              <div className="px-3 py-2.5">
                <p className="text-sm font-medium text-sidebar-foreground">{user?.name}</p>
                <p className="text-xs text-sidebar-foreground/60 capitalize">{user?.role}</p>
                {user?.email && (
                  <p className="text-xs text-sidebar-foreground/40 mt-0.5 truncate">{user.email}</p>
                )}
              </div>
              <Separator className="bg-sidebar-border" />
              {effectiveRole === "admin" && (
                <button
                  onClick={() => navigate("/instellingen")}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Instellingen
                </button>
              )}
              <Link
                to="/privacy"
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
              >
                <Shield className="h-4 w-4" />
                Privacy Policy
              </Link>
              <button
                onClick={logout}
                aria-label="Uitloggen"
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Uitloggen
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
