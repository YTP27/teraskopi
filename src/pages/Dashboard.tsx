import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, ShoppingCart, AlertTriangle, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalTransactions: number;
}

interface SalesData {
  date: string;
  sales: number;
  transactions: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface PopularMenuItem {
  name: string;
  quantity: number;
  revenue: number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f'];

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalTransactions: 0,
  });
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [popularMenus, setPopularMenus] = useState<PopularMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all necessary data in parallel
      const [ordersResponse, expensesResponse, lowStockResponse, recentOrdersResponse, 
             orderItemsResponse, menusResponse, categoriesResponse] = await Promise.all([
        supabase.from('orders').select('total, created_at, payment_method'),
        supabase.from('expenses').select('amount'),
        supabase.from('menus').select('name, stock').lt('stock', 5).eq('is_active', true),
        supabase.from('orders').select('id, total, created_at, payment_method').order('created_at', { ascending: false }).limit(5),
        supabase.from('order_items').select('menu_id, qty, subtotal'),
        supabase.from('menus').select('id, name, category_id, price'),
        supabase.from('categories').select('id, name')
      ]);

      if (ordersResponse.error) throw ordersResponse.error;
      if (expensesResponse.error) throw expensesResponse.error;
      if (lowStockResponse.error) throw lowStockResponse.error;
      if (recentOrdersResponse.error) throw recentOrdersResponse.error;
      if (orderItemsResponse.error) throw orderItemsResponse.error;
      if (menusResponse.error) throw menusResponse.error;
      if (categoriesResponse.error) throw categoriesResponse.error;

      const orders = ordersResponse.data || [];
      const expenses = expensesResponse.data || [];
      const orderItems = orderItemsResponse.data || [];
      const menus = menusResponse.data || [];
      const categories = categoriesResponse.data || [];

      // Calculate basic stats
      const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
      const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
      const netProfit = totalRevenue - totalExpenses;
      const totalTransactions = orders.length;

      setStats({
        totalRevenue,
        totalExpenses,
        netProfit,
        totalTransactions,
      });

      // Generate sales data for the last 7 days
      const today = new Date();
      const salesChartData: SalesData[] = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayOrders = orders.filter(order => 
          order.created_at.startsWith(dateStr)
        );
        
        const daySales = dayOrders.reduce((sum, order) => sum + Number(order.total), 0);
        const dayTransactions = dayOrders.length;
        
        salesChartData.push({
          date: date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
          sales: daySales,
          transactions: dayTransactions
        });
      }
      
      setSalesData(salesChartData);

      // Calculate category data for pie chart
      const categoryStats: { [key: string]: { name: string; value: number } } = {};
      
      categories.forEach(category => {
        categoryStats[category.id] = {
          name: category.name,
          value: 0
        };
      });

      // Add "Tanpa Kategori" for items without category
      categoryStats['no-category'] = {
        name: 'Tanpa Kategori',
        value: 0
      };

      orderItems.forEach(item => {
        const menu = menus.find(m => m.id === item.menu_id);
        if (menu) {
          const categoryId = menu.category_id || 'no-category';
          if (categoryStats[categoryId]) {
            categoryStats[categoryId].value += item.subtotal;
          }
        }
      });

      const categoryChartData: CategoryData[] = Object.values(categoryStats)
        .filter(cat => cat.value > 0)
        .map((cat, index) => ({
          name: cat.name,
          value: cat.value,
          color: COLORS[index % COLORS.length]
        }));

      setCategoryData(categoryChartData);

      // Calculate popular menu items
      const menuStats: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
      
      orderItems.forEach(item => {
        const menu = menus.find(m => m.id === item.menu_id);
        if (menu) {
          if (!menuStats[item.menu_id]) {
            menuStats[item.menu_id] = {
              name: menu.name,
              quantity: 0,
              revenue: 0
            };
          }
          menuStats[item.menu_id].quantity += item.qty;
          menuStats[item.menu_id].revenue += item.subtotal;
        }
      });

      const popularMenuData = Object.values(menuStats)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      setPopularMenus(popularMenuData);
      setLowStockItems(lowStockResponse.data || []);
      setRecentTransactions(recentOrdersResponse.data || []);
      
    } catch (error: any) {
      console.error('Dashboard fetch error:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Selamat datang di sistem manajemen Teras Kopi & Food</p>
        </div>
        <Button onClick={fetchDashboardData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-r from-success to-success/80 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pemasukan</CardTitle>
            <TrendingUp className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs opacity-90">Hari ini</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-500 to-red-400 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
            <TrendingDown className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalExpenses)}</div>
            <p className="text-xs opacity-90">Hari ini</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-info to-info/80 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Bersih</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.netProfit)}</div>
            <p className="text-xs opacity-90">Hari ini</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-warning to-warning/80 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
            <ShoppingCart className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
            <p className="text-xs opacity-90">Hari ini</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Sales Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Grafik Penjualan Mingguan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'sales' ? formatCurrency(value) : value,
                      name === 'sales' ? 'Penjualan' : 'Transaksi'
                    ]}
                  />
                  <Line type="monotone" dataKey="sales" stroke="#8884d8" strokeWidth={2} name="sales" />
                  <Line type="monotone" dataKey="transactions" stroke="#82ca9d" strokeWidth={2} name="transactions" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Belum ada data penjualan</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Perbandingan Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Belum ada data kategori</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popular Menu */}
        <Card>
          <CardHeader>
            <CardTitle>Menu Terlaris</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : popularMenus.length > 0 ? (
              <div className="space-y-3">
                {popularMenus.map((menu, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{menu.name}</p>
                        <p className="text-sm text-muted-foreground">{menu.quantity} terjual</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">{formatCurrency(menu.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Belum ada data penjualan</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Stok Menipis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Semua stok aman</p>
            ) : (
              <div className="space-y-2">
                {lowStockItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-orange-50 rounded">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-sm text-orange-600">Stok: {item.stock}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Transaksi Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Belum ada transaksi hari ini</p>
            ) : (
              <div className="space-y-2">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex justify-between items-center p-2 border rounded">
                    <div>
                      <p className="font-medium">{formatCurrency(transaction.total)}</p>
                      <p className="text-xs text-muted-foreground">{transaction.payment_method}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleTimeString('id-ID')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}