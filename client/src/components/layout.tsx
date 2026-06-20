import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import CollapsibleSidebar from "./collapsible-sidebar";
import Header from "./header";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { navigationItems, isNavigationItemActive } from "./nav-items";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import scannifyLogo from "@assets/New Banner - Scannify_1761489778431.png";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true"
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [location] = useLocation();
  
  // Hide sidebar completely for chef page and any nested chef routes
  const isChefPage = location.startsWith('/chef');
  
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {!isChefPage && (
        <CollapsibleSidebar
          collapsed={sidebarCollapsed}
          onToggle={(v) => {
            setSidebarCollapsed(v);
            localStorage.setItem("sidebarCollapsed", String(v));
          }}
        />
      )}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onMobileMenuToggle={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-screen-2xl mx-auto w-full min-w-0 flex flex-col items-center">
            <div className="w-full max-w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
      
      {/* Mobile Navigation Sheet */}
      {!isChefPage && (
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-64 p-0 border-r border-gray-100" data-testid="mobile-nav-sheet">
            {/* Logo */}
            <div className="flex items-center h-16 px-5 border-b border-gray-100">
              <img src={scannifyLogo} alt="Scannify" className="h-9 w-auto" data-testid="mobile-logo-image" />
            </div>

            <nav className="flex-1 py-4 px-3" data-testid="mobile-navigation">
              <div className="space-y-0.5">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isNavigationItemActive(location, item.href);

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileNavOpen(false)}
                      className={cn(
                        "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150",
                        isActive
                          ? "bg-[#15803d] text-white"
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                      )}
                      data-testid={`mobile-nav-${item.name.toLowerCase()}`}
                    >
                      <Icon className={cn(
                        "h-4 w-4 mr-3 flex-shrink-0 transition-colors",
                        isActive ? "text-white" : "text-gray-400 group-hover:text-gray-700"
                      )} />
                      <span className="flex-1">{item.name}</span>
                      {item.badge && (
                        <span className={cn(
                          "ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold",
                          isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                        )} data-testid={`mobile-badge-${item.name.toLowerCase()}`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="absolute bottom-0 left-0 right-0 border-t border-gray-100 px-5 py-3">
              <p className="text-[10px] text-gray-300 text-center">© 2024 Scannify</p>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
