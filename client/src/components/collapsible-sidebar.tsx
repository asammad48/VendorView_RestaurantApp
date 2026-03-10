import { useState } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { 
  ChevronLeft,
  ChevronRight,
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { navigationItems } from "./nav-items";
import scannifyLogoFull from "@assets/New Banner - Scannify_1761489778431.png";
import scannifyLogoCollapsed from "@assets/New Banner - Scannify_1761489778431.png";

interface CollapsibleSidebarProps {
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
}

export default function CollapsibleSidebar({ 
  collapsed: controlledCollapsed, 
  onToggle 
}: CollapsibleSidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [location] = useLocation();
  
  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  
  const handleToggle = () => {
    const newCollapsed = !collapsed;
    if (onToggle) {
      onToggle(newCollapsed);
    } else {
      setInternalCollapsed(newCollapsed);
    }
  };

  return (
    <div className={cn(
      "hidden md:flex md:flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out",
      collapsed ? "md:w-16" : "md:w-64"
    )}>
      <div className="flex flex-col flex-grow pt-4 pb-4 overflow-y-auto">
        {/* Header with Logo and Toggle */}
        <div className={cn(
          "flex items-center px-4 mb-6",
          collapsed ? "justify-center" : "justify-between"
        )}>
          <div className={cn(
            "flex items-center transition-all duration-300",
            collapsed && "justify-center"
          )}>
            <img 
              src={collapsed ? scannifyLogoCollapsed : scannifyLogoFull} 
              alt="Scannify" 
              className={cn(
                "w-auto transition-all duration-300",
                collapsed ? "h-8" : "h-12"
              )}
              data-testid="logo-image"
            />
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            className={cn(
              "h-8 w-8 p-0 hover:bg-green-50 transition-colors",
              collapsed && "mx-auto mt-2"
            )}
            data-testid="sidebar-toggle"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            )}
          </Button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-3" data-testid="sidebar-navigation">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || (location === "/" && item.href === "/dashboard");
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out group relative",
                    isActive 
                      ? "bg-green-600 text-white shadow-md" 
                      : "text-gray-600 hover:text-green-600 hover:bg-green-50",
                    collapsed && "justify-center"
                  )}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                >
                  <Icon className={cn(
                    "flex-shrink-0 transition-colors",
                    collapsed ? "h-5 w-5" : "h-4 w-4 mr-3",
                    isActive ? "text-white" : "text-gray-500 group-hover:text-green-600"
                  )} />
                  
                  {!collapsed && (
                    <>
                      <span className="truncate">{item.name}</span>
                      {item.badge && (
                        <span className={cn(
                          "ml-auto px-2 py-0.5 rounded-full text-xs font-medium",
                          isActive 
                            ? "bg-white/20 text-white" 
                            : "bg-gray-200 text-gray-600"
                        )} data-testid={`badge-${item.name.toLowerCase()}`}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  
                  {/* Tooltip for collapsed state */}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                      {item.name}
                      {item.badge && (
                        <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                          {item.badge}
                        </span>
                      )}
                      {/* Arrow pointing to the icon */}
                      <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
        
        {/* Footer */}
        <div className={cn(
          "px-3 pt-4 border-t border-gray-100",
          collapsed && "px-2"
        )}>
          <div className={cn(
            "text-xs text-gray-500 text-center",
            collapsed ? "px-1" : "px-3"
          )}>
            {collapsed ? "©" : "© 2024 Scannify"}
          </div>
        </div>
      </div>
    </div>
  );
}