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

const entityRelatedPaths = ["/branches", "/inventory-management", "/restaurant-management", "/hotel-management"];

const normalizePath = (rawPath: string) => rawPath.split("?")[0].split("#")[0];

const isWithinPath = (currentPath: string, basePath: string) =>
  currentPath === basePath || currentPath.startsWith(`${basePath}/`);

export const isNavigationItemActive = (currentPath: string, itemHref: string) => {
  const normalizedPath = normalizePath(currentPath);

  if (normalizedPath === itemHref) {
    return true;
  }

  if (normalizedPath === "/" && itemHref === "/dashboard") {
    return true;
  }

  if (
    itemHref === "/entities" &&
    entityRelatedPaths.some((path) => isWithinPath(normalizedPath, path))
  ) {
    return true;
  }

  return false;
};
