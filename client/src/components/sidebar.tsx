import { useLocation } from "wouter";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { navigationItems } from "./nav-items";
import scannifyLogo from "@assets/New Banner - Scannify_1761489778431.png";

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="hidden md:flex md:w-60 md:flex-col">
      <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto bg-white border-r border-gray-200">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-6">
          <div className="flex items-center">
            <img 
              src={scannifyLogo} 
              alt="Scannify" 
              className="h-12 w-auto" 
              data-testid="logo-image"
            />
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="mt-8 flex-1 px-6" data-testid="sidebar-navigation">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              
              // Define branch-related pages that should keep Entities selected
              const branchRelatedPages = ["/branches", "/restaurant-management", "/hotel-management"];
              
              // Check if current page is branch-related and item is Entities
              const isBranchPageAndEntities = branchRelatedPages.includes(location) && item.href === "/entities";
              
              const isActive = location === item.href || 
                             (location === "/" && item.href === "/dashboard") ||
                             isBranchPageAndEntities;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "nav-item",
                    isActive && "active"
                  )}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                >
                  <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="ml-auto bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs font-medium" data-testid={`badge-${item.name.toLowerCase()}`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
