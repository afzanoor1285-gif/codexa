import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  TrendingUp,
  BookOpen,
  Upload,
  Settings,
  LogOut,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import ProfilePhoto from "@/components/ProfilePhoto";
import AccountSettingsDialog from "@/components/AccountSettingsDialog";
import MobileNavigation from "@/components/MobileNavigation";
import { getUser, logout } from "@/lib/auth";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface StudentLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  activeNav?: "overview" | "courses" | "submit";
  backTo?: { label: string; href: string };
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({
  children,
  title,
  subtitle,
  activeNav,
  backTo,
  breadcrumbs,
  actions,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(getUser);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const updateUser = (event: Event) => {
      const updatedUser = (event as CustomEvent<ReturnType<typeof getUser>>).detail;
      setUser(updatedUser);
    };
    window.addEventListener("codexa:user-updated", updateUser);
    return () => window.removeEventListener("codexa:user-updated", updateUser);
  }, []);

  const studentName = user?.name?.trim() || user?.email?.split("@")[0] || "Student";
  const studentInitials = studentName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const currentNav =
    activeNav ||
    (location.pathname.startsWith("/student/courses")
      ? "courses"
      : location.pathname.startsWith("/student/submit")
      ? "submit"
      : "overview");

  const navItems = [
    { id: "overview", label: "Dashboard", icon: TrendingUp, href: "/student/dashboard" },
    { id: "courses", label: "My Courses", icon: BookOpen, href: "/student/courses" },
    { id: "submit", label: "Submit Code", icon: Upload, href: "/student/submit" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AccountSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} role="student" />

      {/* Persistent Desktop Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border/80 p-4 hidden lg:flex lg:flex-col justify-between z-30">
        <div>
          {/* Brand Header */}
          <Link to="/student/dashboard" className="flex items-center gap-3 px-2 mb-6 group">
            <BrandLogo className="w-9 h-9 object-contain" />
            <div>
              <span className="text-lg font-bold tracking-tight text-foreground">Codexa</span>
              <span className="block text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Student Portal</span>
            </div>
          </Link>

          {/* Nav List */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = currentNav === item.id;
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-border/60 space-y-1">
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
          >
            <Settings className="w-4 h-4 shrink-0" />
            Account Settings
          </button>
          <button
            onClick={() => {
              logout();
              navigate("/student/login");
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        {/* Top Navbar / Header */}
        <header className="sticky top-0 bg-card/90 backdrop-blur-md border-b border-border/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Menu */}
            <div className="lg:hidden shrink-0">
              <MobileNavigation
                items={[
                  { label: "Dashboard", icon: TrendingUp, href: "/student/dashboard" },
                  { label: "My Courses", icon: BookOpen, href: "/student/courses" },
                  { label: "Submit Code", icon: Upload, href: "/student/submit" },
                  { label: "Settings", icon: Settings, onSelect: () => setSettingsOpen(true) },
                  { label: "Sign Out", icon: LogOut, onSelect: logout, href: "/student/login" },
                ]}
              />
            </div>

            {/* Back Button if requested */}
            {backTo && (
              <button
                onClick={() => navigate(backTo.href)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border/60 shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{backTo.label}</span>
                <span className="sm:hidden">Back</span>
              </button>
            )}

            {/* Breadcrumbs or Page Title */}
            <div className="min-w-0">
              {breadcrumbs && breadcrumbs.length > 0 ? (
                <nav className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                  {breadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={idx}>
                      {crumb.href ? (
                        <Link to={crumb.href} className="hover:text-foreground transition-colors font-medium">
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="text-foreground font-semibold truncate">{crumb.label}</span>
                      )}
                      {idx < breadcrumbs.length - 1 && (
                        <ChevronRight className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </nav>
              ) : title ? (
                <div>
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
                    {title}
                  </h1>
                  {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
                </div>
              ) : null}
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {actions}
            <div className="h-4 w-px bg-border/60 hidden sm:block" />
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-muted/80 transition-colors"
              title="Open Settings"
            >
              <ProfilePhoto initials={studentInitials} role="student" className="w-8 h-8 text-xs" />
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-foreground leading-tight truncate max-w-[120px]">
                  {studentName}
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight">{user?.degree || "Student"}</p>
              </div>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;
