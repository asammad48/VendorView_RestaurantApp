import { useLocation } from "wouter";
import { Search, Bell, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";

const pageNames: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/restaurants": "Restaurants",
  "/analytics": "Analytics",
  "/users": "Users",
  "/feedbacks": "Feedbacks",
  "/reporting": "Reporting",
};

export default function Header() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const pageName = pageNames[location] || "Dashboard";

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800" data-testid="page-title">
          {pageName}
        </h1>
        
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative" data-testid="notifications-button">
            <Bell className="h-5 w-5 text-gray-400" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs flex items-center justify-center p-0"
              data-testid="notification-badge"
            >
              3
            </Badge>
          </Button>
          
          {/* Profile */}
          <div className="relative" data-testid="profile-menu">
            <Button
              variant="ghost"
              className="flex items-center space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              onClick={() => logout()}
              data-testid="profile-button"
            >
              <Avatar className="h-8 w-8">
                {user?.profilePicture && (
                  <AvatarImage src={user.profilePicture} alt={user.fullName || user.name} />
                )}
                <AvatarFallback 
                  data-testid="avatar-fallback"
                  className="bg-green-500 text-white font-medium"
                >
                  {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 
                   user?.name ? user.name.charAt(0).toUpperCase() : 
                   <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              {user && (
                <span className="hidden md:block" data-testid="user-name">
                  {user.fullName || user.name || user.email}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
