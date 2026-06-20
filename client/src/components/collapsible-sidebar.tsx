import { useState } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { navigationItems, isNavigationItemActive } from "./nav-items";
import scannifyLogoFull from "@assets/New Banner - Scannify_1761489778431.png";

interface CollapsibleSidebarProps {
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
}

export default function CollapsibleSidebar({
  collapsed: controlledCollapsed,
  onToggle,
}: CollapsibleSidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [location] = useLocation();

  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggle = () => {
    const next = !collapsed;
    if (onToggle) onToggle(next);
    else setInternalCollapsed(next);
  };

  return (
    <div
      className={cn(
        "hidden md:flex md:flex-col bg-white border-r border-gray-100 transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden",
        collapsed ? "md:w-[68px]" : "md:w-56"
      )}
    >
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        {/* Logo row — also holds the toggle button in both states */}
        <div
          className={cn(
            "flex items-center h-16 px-3 border-b border-gray-100 flex-shrink-0",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          {collapsed ? (
            <button
              onClick={handleToggle}
              title="Expand sidebar"
              data-testid="sidebar-toggle"
              aria-label="Expand sidebar"
              className="flex items-center gap-1 group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#15803d] group-hover:bg-[#166534] transition-colors flex items-center justify-center flex-shrink-0">
                <span className="text-white font-black text-sm tracking-tight">S</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#15803d] transition-colors" />
            </button>
          ) : (
            <>
              <img
                src={scannifyLogoFull}
                alt="Scannify"
                className="h-9 w-auto"
                data-testid="logo-image"
              />
              <button
                onClick={handleToggle}
                className="ml-2 flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-[#15803d] hover:bg-green-50 transition-colors"
                data-testid="sidebar-toggle"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 min-h-0 py-3 overflow-hidden" data-testid="sidebar-navigation">
          <div className={cn("space-y-0.5", collapsed ? "px-2" : "px-3")}>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isNavigationItemActive(location, item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center rounded-lg text-sm font-medium transition-all duration-150",
                    collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5",
                    isActive
                      ? "bg-[#15803d] text-white"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  )}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                >
                  {/* Active left accent bar */}
                  {!collapsed && isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white/40 rounded-r-full" />
                  )}

                  <Icon
                    className={cn(
                      "flex-shrink-0 transition-colors",
                      collapsed ? "h-[18px] w-[18px]" : "h-4 w-4 mr-3",
                      isActive
                        ? "text-white"
                        : "text-gray-400 group-hover:text-gray-700"
                    )}
                  />

                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.name}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            "ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold",
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-gray-100 text-gray-500"
                          )}
                          data-testid={`badge-${item.name.toLowerCase()}`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}

                  {/* Tooltip (collapsed only) */}
                  {collapsed && (
                    <div className="pointer-events-none absolute left-full ml-3 z-50">
                      <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-md whitespace-nowrap shadow-lg">
                        {item.name}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className={cn("border-t border-gray-100 py-3 flex-shrink-0", collapsed ? "px-2" : "px-4")}>
          <p className={cn("text-[10px] text-gray-300 text-center", collapsed && "leading-tight")}>
            {collapsed ? "©" : "© 2024 Scannify"}
          </p>
        </div>
      </div>
    </div>
  );
}
