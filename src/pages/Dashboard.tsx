import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, ShoppingCart, AlertTriangle, Star } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalTransactions: number;
}

interface ChartData {
  day: string;
  revenue: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalTransactions: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch revenue from orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('total, created_at');
      
      if (ordersError) throw ordersError;

      // Fetch expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount');
      
      if (expensesError) throw expensesError;

      // Fetch low stock items
      const { data: lowStock, error: lowStockError } = await supabase
        .from('menus')
        .select('name, stock')
        .lt('stock', 5)
        .eq('is_active', true);
      
      if (lowStockError) throw lowStockError;

      // Fetch recent transactions
      const { data: recentOrders, error: recentError } = await supabase
        .from('orders')
        .select('id, total, created_at, payment_method')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (recentError) throw recentError;

      // Calculate stats
      const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
      const totalExpenses = expenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
      const netProfit = totalRevenue - totalExpenses;
      const totalTransactions = orders?.length || 0;

      setStats({
        totalRevenue,
        totalExpenses,
        netProfit,
        totalTransactions,
      });

      // Generate weekly chart data
      generateWeeklyChartData(orders || []);

      setLowStockItems(lowStock || []);
      setRecentTransactions(recentOrders || []);
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateWeeklyChartData = (orders: any[]) => {
    const now = new Date();
    const weekData: ChartData[] = [];

    // Generate data for last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= dayStart && orderDate <= dayEnd;
      });

      const dayRevenue = dayOrders.reduce((sum, order) => sum + Number(order.total), 0);

      weekData.push({
        day: date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
        revenue: dayRevenue
      });
    }

    setChartData(weekData);
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
        {/* Weekly Sales Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Grafik Penjualan Mingguan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                  labelFormatter={(label) => `Hari: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Perbandingan Kategori</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada data kategori</p>
            </div>
          </CardContent>
        </Card>

        {/* Popular Menu */}
        <Card>
          <CardHeader>
            <CardTitle>Menu Terlaris</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada data penjualan</p>
            </div>
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