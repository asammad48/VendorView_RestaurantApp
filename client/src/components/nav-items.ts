import { 
  LayoutDashboard, 
  Building2, 
  BarChart3, 
  Users, 
  MessageSquare, 
  FileText 
} from "lucide-react";

export const navigationItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Entities",
    href: "/entities",
    icon: Building2,
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