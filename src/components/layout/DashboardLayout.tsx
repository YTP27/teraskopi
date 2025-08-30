import { Outlet } from 'react-router-dom';
import { AppSidebar } from './Sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Menu } from 'lucide-react';

export function DashboardLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        
        <div className="flex-1">
          {/* Header with hamburger menu */}
          <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4">
            <SidebarTrigger className="h-8 w-8 shrink-0">
              <Menu className="h-4 w-4" />
              <span className="sr-only">Toggle sidebar</span>
            </SidebarTrigger>
            
            <div className="flex items-center space-x-2">
              <img 
                src="/logokopi.png" 
                alt="Logo Teras Kopi" 
                className="h-12 w-auto object-contain"
              />
              <h1 className="text-sm font-semibold">Teras Kopi</h1>
            </div>
          </header>
          
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
