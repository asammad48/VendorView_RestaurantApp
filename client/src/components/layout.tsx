import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import CollapsibleSidebar from "./collapsible-sidebar";
import Header from "./header";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
