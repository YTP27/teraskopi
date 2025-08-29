import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  UtensilsCrossed, 
  Wallet, 
  BarChart3, 
  Settings, 
  Users,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'POS (Kasir)', href: '/pos', icon: ShoppingCart },
  { name: 'Manajemen Menu', href: '/menu', icon: UtensilsCrossed },
  { name: 'Manajemen Keuangan', href: '/finance', icon: Wallet },
  { name: 'Laporan', href: '/reports', icon: BarChart3 },
  { name: 'Pengaturan', href: '/settings', icon: Settings },
  { name: 'Manajemen Pengguna', href: '/users', icon: Users },
];

export function AppSidebar() {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const { state, isMobile } = useSidebar();

  const handleSignOut = () => {
    signOut();
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar 
      className="border-r" 
      style={{ backgroundColor: '#fefbda', color: '#3f2213' }}
      collapsible="icon"
      variant={isMobile ? "floating" : "sidebar"}
    >
      {/* Header with Logo */}
      <SidebarHeader className="border-b" style={{ borderColor: '#3f2213' }}>
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <UtensilsCrossed className="h-4 w-4 text-primary-foreground" />
          </div>
          {state === "expanded" && (
            <div className="flex flex-col">
              <span className="text-sm font-bold" style={{ color: '#3f2213' }}>Teras Kopi</span>
              <span className="text-xs opacity-60" style={{ color: '#3f2213' }}>& Food</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-semibold" style={{ color: '#3f2213' }}>Menu Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} className="font-semibold">
                    <NavLink 
                      to={item.href} 
                      className="flex items-center gap-3"
                      style={{ color: '#3f2213' }}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with User Info */}
      <SidebarFooter className="border-t" style={{ borderColor: '#3f2213' }}>
        {state === "expanded" && (
          <div className="px-3 py-2">
            <div className="mb-2 text-xs opacity-60 font-medium" style={{ color: '#3f2213' }}>
              Logged in as: {user?.email}
            </div>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleSignOut} 
              className="w-full justify-start font-semibold hover:opacity-80"
              style={{ color: '#3f2213' }}
            >
              <LogOut className="h-4 w-4" />
              {state === "expanded" && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}