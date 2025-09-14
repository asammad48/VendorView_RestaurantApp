import { ReactNode, useState } from "react";
import CollapsibleSidebar from "./collapsible-sidebar";
import Header from "./header";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <CollapsibleSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={setSidebarCollapsed} 
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
