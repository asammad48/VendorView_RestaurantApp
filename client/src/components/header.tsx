import { useLocation } from "wouter";
import { useState } from "react";
import { Search, Bell, User, Menu, ChevronDown, UserCog, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import UpdateProfileModal from "./update-profile-modal";

const pageNames: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/restaurants": "Restaurants",
  "/analytics": "Analytics",
  "/users": "Users",
  "/feedbacks": "Feedbacks",
  "/reporting": "Reporting",
};

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export default function Header({ onMobileMenuToggle }: HeaderProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isUpdateProfileModalOpen, setIsUpdateProfileModalOpen] = useState(false);
  const pageName = pageNames[location] || "Dashboard";

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="inline-flex md:hidden"
            onClick={onMobileMenuToggle}
            aria-label="Open navigation menu"
            data-testid="mobile-menu-button"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </Button>
          
          <h1 className="text-xl md:text-2xl font-semibold text-gray-800" data-testid="page-title">
            {pageName}
          </h1>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild data-testid="profile-menu">
              <Button
                variant="ghost"
                className="flex items-center space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
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
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" data-testid="profile-dropdown">
              <DropdownMenuItem
                onClick={() => setIsUpdateProfileModalOpen(true)}
                className="flex items-center gap-2 cursor-pointer"
                data-testid="update-profile-item"
              >
                <UserCog className="h-4 w-4" />
                Update Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={logout}
                className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
                data-testid="logout-item"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Update Profile Modal */}
      <UpdateProfileModal
        isOpen={isUpdateProfileModalOpen}
        onClose={() => setIsUpdateProfileModalOpen(false)}
      />
    </header>
  );
}
