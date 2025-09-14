import { useLocation } from "wouter";
import { Link } from "wouter";
import { 
  LayoutDashboard, 
  Building2, 
  BarChart3, 
  Users, 
  MessageSquare, 
  FileText 
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Entities",
    href: "/entities",
    icon: Building2,
    badge: "4",
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    name: "Users",
    href: "/users",
    icon: Users,
  },
  {
    name: "Feedbacks",
    href: "/feedbacks",
    icon: MessageSquare,
  },
  {
    name: "Reporting",
    href: "/reporting",
    icon: FileText,
  },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="hidden md:flex md:w-60 md:flex-col">
      <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto bg-white border-r border-gray-200">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg" data-testid="logo-text">R</span>
            </div>
            <div className="ml-3">
              <h2 className="text-lg font-semibold text-gray-800" data-testid="brand-name">Restaurant</h2>
              <p className="text-sm text-gray-500" data-testid="brand-subtitle">Dashboard</p>
            </div>
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
