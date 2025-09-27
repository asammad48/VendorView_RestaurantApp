import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import CollapsibleSidebar from "./collapsible-sidebar";
import Header from "./header";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { navigationItems } from "./nav-items";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [location] = useLocation();
  
  // Hide sidebar completely for chef page and any nested chef routes
  const isChefPage = location.startsWith('/chef');
  
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {!isChefPage && (
        <CollapsibleSidebar 
          collapsed={sidebarCollapsed} 
          onToggle={setSidebarCollapsed} 
        />
      )}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onMobileMenuToggle={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-screen-2xl mx-auto w-full min-w-0">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile Navigation Sheet */}
      {!isChefPage && (
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-[280px] sm:w-[400px]" data-testid="mobile-nav-sheet">
            <SheetHeader>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm" data-testid="mobile-logo-text">R</span>
                </div>
                <div className="ml-3">
                  <SheetTitle className="text-base font-semibold text-gray-800" data-testid="mobile-brand-name">Restaurant</SheetTitle>
                  <p className="text-xs text-gray-500" data-testid="mobile-brand-subtitle">Dashboard</p>
                </div>
              </div>
            </SheetHeader>
            
            <nav className="mt-6" data-testid="mobile-navigation">
              <div className="space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href || (location === "/" && item.href === "/dashboard");
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileNavOpen(false)}
                      className={cn(
                        "flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out group",
                        isActive 
                          ? "bg-green-600 text-white shadow-md" 
                          : "text-gray-600 hover:text-green-600 hover:bg-green-50"
                      )}
                      data-testid={`mobile-nav-${item.name.toLowerCase()}`}
                    >
                      <Icon className={cn(
                        "h-5 w-5 mr-3 flex-shrink-0",
                        isActive ? "text-white" : "text-gray-500 group-hover:text-green-600"
                      )} />
                      <span>{item.name}</span>
                      {item.badge && (
                        <span className={cn(
                          "ml-auto px-2 py-0.5 rounded-full text-xs font-medium",
                          isActive 
                            ? "bg-white/20 text-white" 
                            : "bg-gray-200 text-gray-600"
                        )} data-testid={`mobile-badge-${item.name.toLowerCase()}`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
