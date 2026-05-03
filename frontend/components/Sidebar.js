import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Activity, BookOpen, BarChart2, Shield, Bell,
  Settings, LogOut, TrendingUp, Menu, X, Sun, Moon, Crown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import clsx from "clsx";

const NAV = [
  { href: "/",          icon: Activity,  label: "Dashboard"  },
  { href: "/journal",   icon: BookOpen,  label: "Journal"    },
  { href: "/analytics", icon: BarChart2, label: "Analytics"  },
  { href: "/strategy",  icon: Shield,    label: "Strategy"   },
  { href: "/alerts",    icon: Bell,      label: "Alerts"     },
  { href: "/settings",  icon: Settings,  label: "Settings"   },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { isLight, toggleTheme } = useTheme();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = user?.role === "admin"
    ? [...NAV, { href: "/admin", icon: Crown, label: "Admin" }]
    : NAV;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={clsx(
        "flex items-center border-b border-dark-600 min-h-[64px]",
        collapsed ? "justify-center px-4" : "justify-between px-5"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-200 to-emerald-400 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={16} className="text-white" />
            </div>
            <span className="font-display font-extrabold text-white text-[15px] tracking-tight">SYNOX</span>
          </div>
        )}
        <button
          onClick={() => { setCollapsed(c => !c); setMobileOpen(false); }}
          className="text-dark-400 hover:text-dark-100 transition-colors p-1"
        >
          {collapsed ? <Menu size={16} /> : <X size={16} />}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-2 flex flex-col gap-1 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = router.pathname === href;
          return (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)}>
              <div title={collapsed ? label : undefined} className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all cursor-pointer",
                collapsed ? "justify-center" : "",
                active
                  ? "bg-brand-200/10 border border-brand-200/30 text-brand-200"
                  : "text-dark-300 hover:text-dark-50 hover:bg-dark-700 border border-transparent"
              )}>
                <Icon size={16} className="flex-shrink-0" />
                {!collapsed && <span className={clsx("text-sm", active ? "font-semibold" : "font-normal")}>{label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-2 border-t border-dark-600">
        {!collapsed && (
          <div className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg mb-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-200 to-emerald-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {(user?.username || "U")[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-semibold text-dark-50 truncate">{user?.username}</div>
              <div className="text-xs text-dark-400 truncate">{user?.email}</div>
              <div className="mt-1 inline-flex rounded-full border border-brand-200/30 bg-brand-200/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-200">
                {user?.plan || "free"}
              </div>
              <div className="mt-1 ml-1 inline-flex rounded-full border border-dark-600 bg-dark-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-dark-200">
                {user?.role || "user"}
              </div>
            </div>
          </div>
        )}
        <button
          title={collapsed ? (isLight ? "Dark mode" : "Light mode") : undefined}
          onClick={toggleTheme}
          className={clsx(
            "mb-2 w-full flex items-center gap-3 rounded-lg px-3 py-2 text-dark-400 hover:text-brand-200 hover:bg-brand-200/10 transition-all border border-transparent",
            collapsed ? "justify-center" : ""
          )}
        >
          {isLight ? <Moon size={14} /> : <Sun size={14} />}
          {!collapsed && <span className="text-sm">{isLight ? "Dark mode" : "Light mode"}</span>}
        </button>
        <button
          title={collapsed ? "Logout" : undefined}
          onClick={logout}
          className={clsx(
            "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-dark-400 hover:text-red-400 hover:bg-red-400/5 transition-all border border-transparent",
            collapsed ? "justify-center" : ""
          )}
        >
          <LogOut size={14} />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={clsx(
          "hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-50 bg-dark-800 border-r border-dark-600 transition-all duration-300",
          collapsed ? "w-16" : "w-56"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-dark-800 border border-dark-600 text-dark-300"
        onClick={() => setMobileOpen(o => !o)}
      >
        <Menu size={18} />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setMobileOpen(false)} />
          <aside className="lg:hidden fixed top-0 left-0 bottom-0 w-56 z-50 bg-dark-800 border-r border-dark-600 flex flex-col">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
