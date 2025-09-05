import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Calendar, BarChart3, TrendingUp, ShoppingCart, DollarSign, Clock, CheckCircle2, XCircle, AlertCircle, MoreHorizontal, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface Order {
  id: string;
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
  payment_date?: string;
  customer_name?: string;
  created_at: string;
  user_id?: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  menu_id: string;
  qty: number;
  price_at_order: number;
  subtotal: number;
  status: string;
  selected_variations?: any;
  created_at: string;
}

interface Menu {
  id: string;
  name: string;
  price: number;
}

interface SalesData {
  date: string;
  total_sales: number;
  total_orders: number;
  avg_order_value: number;
}

export function Reports() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeView, setActiveView] = useState<'analytics' | 'orders'>('analytics');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchData();
    loadPersistedState();
    
    // Set up real-time subscriptions
    const ordersChannel = supabase
      .channel('orders-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, (payload) => {
        console.log('Order change:', payload);
        if (payload.eventType === 'INSERT') {
          setOrders(prev => [payload.new as Order, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setOrders(prev => prev.map(order => 
            order.id === payload.new.id ? payload.new as Order : order
          ));
        } else if (payload.eventType === 'DELETE') {
          setOrders(prev => prev.filter(order => order.id !== payload.old.id));
        }
      })
      .subscribe();

    const orderItemsChannel = supabase
      .channel('order-items-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public', 
        table: 'order_items'
      }, (payload) => {
        console.log('Order item change:', payload);
        if (payload.eventType === 'INSERT') {
          setOrderItems(prev => [...prev, payload.new as OrderItem]);
        } else if (payload.eventType === 'UPDATE') {
          setOrderItems(prev => prev.map(item => 
            item.id === payload.new.id ? payload.new as OrderItem : item
          ));
        } else if (payload.eventType === 'DELETE') {
          setOrderItems(prev => prev.filter(item => item.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(orderItemsChannel);
    };
  }, []);

  // Save UI state to localStorage (not data, as data should come from database)
  useEffect(() => {
    const uiState = {
      activeView,
      dateFilter,
      startDate,
      endDate,
      currentPage
    };
    localStorage.setItem('reports-ui-state', JSON.stringify(uiState));
  }, [activeView, dateFilter, startDate, endDate, currentPage]);

  const loadPersistedState = () => {
    try {
      const savedState = localStorage.getItem('reports-ui-state');
      if (savedState) {
        const { 
          activeView: savedActiveView, 
          dateFilter: savedDateFilter, 
          startDate: savedStartDate, 
          endDate: savedEndDate,
          currentPage: savedCurrentPage
        } = JSON.parse(savedState);
        
        if (savedActiveView) setActiveView(savedActiveView);
        if (savedDateFilter) setDateFilter(savedDateFilter);
        if (savedStartDate) setStartDate(savedStartDate);
        if (savedEndDate) setEndDate(savedEndDate);
        if (savedCurrentPage) setCurrentPage(savedCurrentPage);
      }
    } catch (error) {
      console.error('Error loading persisted UI state:', error);
    }
  };

  useEffect(() => {
    if (dateFilter !== 'custom') {
      filterDataByDate();
    }
  }, [dateFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [ordersResponse, orderItemsResponse, menusResponse] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('order_items').select('*'),
        supabase.from('menus').select('id, name, price')
      ]);

      if (ordersResponse.error) throw ordersResponse.error;
      if (orderItemsResponse.error) throw orderItemsResponse.error;
      if (menusResponse.error) throw menusResponse.error;

      setOrders(ordersResponse.data || []);
      setOrderItems(orderItemsResponse.data || []);
      setMenus(menusResponse.data || []);
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

  const filterDataByDate = () => {
    const now = new Date();
    let startFilterDate: Date;

    switch (dateFilter) {
      case 'today':
        startFilterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startFilterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startFilterDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startFilterDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return;
    }

    // This filtering happens on the frontend for demo purposes
    // In production, you'd want to filter in the database query
  };

  const getFilteredOrders = () => {
    if (dateFilter === 'all') return orders;

    const now = new Date();
    let startFilterDate: Date;
    let endFilterDate: Date = now;

    if (dateFilter === 'custom' && startDate && endDate) {
      startFilterDate = new Date(startDate);
      endFilterDate = new Date(endDate);
      endFilterDate.setHours(23, 59, 59, 999);
    } else {
      switch (dateFilter) {
        case 'today':
          startFilterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startFilterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startFilterDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startFilterDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          return orders;
      }
    }

    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= startFilterDate && orderDate <= endFilterDate;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMenuName = (menuId: string) => {
    const menu = menus.find(m => m.id === menuId);
    return menu ? menu.name : 'Menu tidak ditemukan';
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: { [key: string]: string } = {
      cash: 'Tunai',
      debit: 'Kartu Debit',
      credit: 'Kartu Kredit',
      ewallet: 'E-Wallet',
    };
    return methods[method] || method;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    const statuses: { [key: string]: string } = {
      completed: 'Selesai',
      pending: 'Menunggu',
      preparing: 'Sedang Diproses',
      ready: 'Siap',
      delivered: 'Terkirim',
      cancelled: 'Dibatalkan',
    };
    return statuses[status] || status;
  };

  const getItemStatusLabel = (status: string) => {
    const statuses: { [key: string]: string } = {
      pending: 'Menunggu',
      preparing: 'Sedang Dibuat',
      ready: 'Siap',
      delivered: 'Terkirim',
    };
    return statuses[status] || status;
  };

  const calculateOrderStatus = (orderId: string, items: OrderItem[]) => {
    const orderItems = items.filter(item => item.order_id === orderId);
    if (orderItems.length === 0) return 'pending';

    const allDelivered = orderItems.every(item => item.status === 'delivered');
    const allReady = orderItems.every(item => item.status === 'ready' || item.status === 'delivered');
    const anyPreparing = orderItems.some(item => item.status === 'preparing' || item.status === 'ready' || item.status === 'delivered');
    const anyReady = orderItems.some(item => item.status === 'ready' || item.status === 'delivered');

    // If all items are delivered, order is completed
    if (allDelivered) return 'completed';
    
    // If all items are ready or delivered, order is ready 
    if (allReady) return 'ready';
    
    // If any item is being prepared, ready, or delivered, order is preparing
    if (anyPreparing) return 'preparing';
    
    // Default to pending
    return 'pending';
  };

  const updateOrderItemStatus = async (itemId: string, newStatus: string) => {
    try {
      console.log('🔄 Starting update for item:', { itemId, newStatus });
      
      // Update order item status in database
      const { data: updatedItem, error: updateError } = await supabase
        .from('order_items')
        .update({ status: newStatus })
        .eq('id', itemId)
        .select('*')
        .single();

      if (updateError) {
        console.error('❌ Error updating order item status:', updateError);
        throw updateError;
      }

      if (!updatedItem) {
        throw new Error('Gagal mengupdate item');
      }

      console.log('✅ Order item updated successfully:', updatedItem);

      // Get all items for this order to calculate order status
      const { data: allOrderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', updatedItem.order_id);

      if (itemsError) {
        console.error('❌ Error fetching order items:', itemsError);
        throw itemsError;
      }

      // Calculate new order status
      const newOrderStatus = calculateOrderStatus(updatedItem.order_id, allOrderItems || []);
      console.log('🔄 Calculated new order status:', newOrderStatus);

      // Update order status in database
      const { data: updatedOrder, error: orderError } = await supabase
        .from('orders')
        .update({ status: newOrderStatus })
        .eq('id', updatedItem.order_id)
        .select('*')
        .single();

      if (orderError) {
        console.error('❌ Error updating order status:', orderError);
        throw orderError;
      }

      console.log('✅ Order status updated successfully:', updatedOrder);

      // Update local state - use database data as source of truth
      setOrderItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId ? updatedItem : item
        )
      );

      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === updatedItem.order_id ? updatedOrder : order
        )
      );

      toast({
        title: 'Status Diperbarui',
        description: `Status berhasil diubah ke ${getItemStatusLabel(newStatus)}`,
      });

    } catch (error: any) {
      console.error('❌ Error in updateOrderItemStatus:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal memperbarui status pesanan',
        variant: 'destructive',
      });
      
      // Refresh data from database to ensure consistency
      console.log('🔄 Refreshing data due to error...');
      await fetchData();
    }
  };

  const updateOrderPaymentStatus = async (orderId: string, newStatus: string) => {
    try {
      const updateData: any = { payment_status: newStatus };
      if (newStatus === 'paid') {
        updateData.payment_date = new Date().toISOString();
      } else if (newStatus === 'unpaid') {
        updateData.payment_date = null;
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) {
        console.error('Error updating payment status:', error);
        throw error;
      }

      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, ...updateData } : order
      ));

      toast({
        title: 'Status Pembayaran Diperbarui',
        description: newStatus === 'paid' 
          ? 'Pesanan telah ditandai sebagai sudah bayar'
          : 'Status pembayaran berhasil diperbarui',
      });
    } catch (error: any) {
      console.error('Error in updateOrderPaymentStatus:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal memperbarui status pembayaran',
        variant: 'destructive',
      });
      // Refresh data to ensure consistency
      fetchData();
    }
  };

  // Calculate statistics
  const filteredOrders = getFilteredOrders();
  const totalSales = filteredOrders.reduce((sum, order) => sum + order.total, 0);
  const totalOrders = filteredOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  const completedOrders = filteredOrders.filter(order => order.status === 'completed').length;

  // Pagination for recent orders
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, startDate, endDate]);

  // Most popular items
  const itemStats = orderItems
    .filter(item => filteredOrders.some(order => order.id === item.order_id))
    .reduce((stats: { [key: string]: { name: string; qty: number; revenue: number } }, item) => {
      const menuName = getMenuName(item.menu_id);
      if (!stats[item.menu_id]) {
        stats[item.menu_id] = { name: menuName, qty: 0, revenue: 0 };
      }
      stats[item.menu_id].qty += item.qty;
      stats[item.menu_id].revenue += item.subtotal;
      return stats;
    }, {});

  const popularItems = Object.values(itemStats)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Payment method distribution
  const paymentStats = filteredOrders.reduce((stats: { [key: string]: number }, order) => {
    stats[order.payment_method] = (stats[order.payment_method] || 0) + 1;
    return stats;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Laporan & Manajemen Pesanan</h1>
          <p className="text-muted-foreground">Analisis performa bisnis dan kelola pesanan</p>
        </div>
      </div>

      <Tabs value={activeView} onValueChange={(value: any) => setActiveView(value)}>
        <TabsList>
          <TabsTrigger value="analytics">Analisis Penjualan</TabsTrigger>
          <TabsTrigger value="orders">Manajemen Pesanan</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">

      {/* Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filter Periode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="date-filter">Periode</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hari ini</SelectItem>
                  <SelectItem value="week">7 hari terakhir</SelectItem>
                  <SelectItem value="month">Bulan ini</SelectItem>
                  <SelectItem value="year">Tahun ini</SelectItem>
                  <SelectItem value="custom">Kustom</SelectItem>
                  <SelectItem value="all">Semua waktu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateFilter === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="start-date">Tanggal Mulai</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">Tanggal Akhir</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <Button onClick={filterDataByDate}>Terapkan Filter</Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penjualan</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-muted-foreground">
              {filteredOrders.length} dari {orders.length} pesanan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pesanan</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {completedOrders} selesai
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata Nilai Pesanan</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgOrderValue)}</div>
            <p className="text-xs text-muted-foreground">
              Per transaksi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tingkat Penyelesaian</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Pesanan berhasil
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Items */}
        <Card>
          <CardHeader>
            <CardTitle>Menu Terpopuler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {popularItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.qty} terjual</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(item.revenue)}</div>
                  </div>
                </div>
              ))}
              {popularItems.length === 0 && (
                <p className="text-muted-foreground text-center py-4">Tidak ada data untuk periode ini</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Metode Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(paymentStats).map(([method, count]) => (
                <div key={method} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{getPaymentMethodLabel(method)}</Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{count} transaksi</div>
                    <div className="text-sm text-muted-foreground">
                      {totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0}%
                    </div>
                  </div>
                </div>
              ))}
              {Object.keys(paymentStats).length === 0 && (
                <p className="text-muted-foreground text-center py-4">Tidak ada data untuk periode ini</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pesanan Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Memuat data...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Pelanggan</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Metode Pembayaran</TableHead>
                        <TableHead>Status Pembayaran</TableHead>
                        <TableHead>Status Pesanan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>{formatDate(order.created_at)}</TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {order.customer_name || 'Tanpa Nama'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{formatCurrency(order.total)}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getPaymentMethodLabel(order.payment_method)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={order.payment_status === 'paid' ? 'default' : 'destructive'}>
                              {order.payment_status === 'paid' ? 'Sudah Bayar' : 'Belum Bayar'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(order.status)}>
                              {getStatusLabel(order.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredOrders.length)} dari {filteredOrders.length} pesanan
                    </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        
                        {[...Array(totalPages)].map((_, i) => {
                          const page = i + 1;
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(page)}
                                  isActive={page === currentPage}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                        })}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}

                {filteredOrders.length === 0 && (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Tidak ada data untuk periode yang dipilih</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manajemen Pesanan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {orders.map((order) => {
                  const items = orderItems.filter(item => item.order_id === order.id);
                  return (
                    <Card key={order.id} className="border-l-4 border-l-primary overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className={`${isMobile ? 'space-y-3' : 'flex items-center justify-between'}`}>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg mb-1">
                              <span className="block sm:inline">Pesanan #{order.id.slice(-8)}</span>
                              {order.customer_name && (
                                <span className="block sm:inline text-base font-normal text-muted-foreground sm:ml-2">
                                  - {order.customer_name}
                                </span>
                              )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(order.created_at)}
                              <br className="sm:hidden" />
                              <span className="hidden sm:inline"> • </span>
                              {formatCurrency(order.total)}
                              <br className="sm:hidden" />
                              <span className="hidden sm:inline"> • </span>
                              {getPaymentMethodLabel(order.payment_method)}
                              {order.payment_date && (
                                <>
                                  <br className="sm:hidden" />
                                  <span className="hidden sm:inline"> • </span>
                                  Dibayar: {formatDate(order.payment_date)}
                                </>
                              )}
                            </p>
                          </div>
                          <div className={`${isMobile ? 'flex items-center justify-between' : 'flex flex-col items-end gap-2'}`}>
                            <Badge variant={order.payment_status === 'paid' ? 'default' : 'destructive'}>
                              {order.payment_status === 'paid' ? 'Sudah Bayar' : 'Belum Bayar'}
                            </Badge>
                            <div className={`flex gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
                              {order.payment_status === 'unpaid' && (
                                <Button
                                  size={isMobile ? "sm" : "sm"}
                                  onClick={() => updateOrderPaymentStatus(order.id, 'paid')}
                                  className={isMobile ? 'text-xs px-2' : ''}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  {isMobile ? 'Bayar' : 'Tandai Sudah Bayar'}
                                </Button>
                              )}
                              {order.payment_status === 'paid' && (
                                <Button
                                  size={isMobile ? "sm" : "sm"}
                                  variant="outline"
                                  onClick={() => updateOrderPaymentStatus(order.id, 'unpaid')}
                                  className={isMobile ? 'text-xs px-2' : ''}
                                >
                                  {isMobile ? 'Batal' : 'Batalkan Pembayaran'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {items.map((item) => (
                            <div key={item.id} className={`${isMobile ? 'space-y-3 p-3' : 'flex items-center justify-between p-3'} bg-muted/50 rounded-lg`}>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium mb-1">{getMenuName(item.menu_id)}</div>
                                <div className="text-sm text-muted-foreground">
                                  Qty: {item.qty} • {formatCurrency(item.subtotal)}
                                  {item.selected_variations && (() => {
                                    try {
                                      const variations = typeof item.selected_variations === 'string' 
                                        ? JSON.parse(item.selected_variations) 
                                        : item.selected_variations;
                                      return variations && variations.length > 0 && (
                                        <span className="block text-xs mt-1">
                                          Variasi: {variations.map((v: any) => v.name).join(', ')}
                                        </span>
                                      );
                                    } catch {
                                      return null;
                                    }
                                  })()}
                                </div>
                              </div>
                              
                              <div className={`${isMobile ? 'flex items-center justify-between flex-wrap gap-2' : 'flex items-center gap-2'}`}>
                                <Badge
                                  variant={
                                    item.status === 'delivered' ? 'default' :
                                    item.status === 'ready' ? 'secondary' :
                                    item.status === 'preparing' ? 'outline' : 'destructive'
                                  }
                                  className={isMobile ? 'text-xs' : ''}
                                >
                                  {getItemStatusLabel(item.status)}
                                </Badge>
                                
                                <div className={`flex gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
                                  {item.status === 'pending' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateOrderItemStatus(item.id, 'preparing')}
                                      className={isMobile ? 'text-xs px-2 h-8' : ''}
                                    >
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      {isMobile ? 'Buat' : 'Mulai Buat'}
                                    </Button>
                                  )}
                                  {item.status === 'preparing' && (
                                    <Button
                                      size="sm"
                                      onClick={() => updateOrderItemStatus(item.id, 'ready')}
                                      className={isMobile ? 'text-xs px-2 h-8' : ''}
                                    >
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Siap
                                    </Button>
                                  )}
                                  {item.status === 'ready' && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => updateOrderItemStatus(item.id, 'delivered')}
                                      className={isMobile ? 'text-xs px-2 h-8' : ''}
                                    >
                                      <ArrowRight className="h-3 w-3 mr-1" />
                                      Kirim
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {orders.length === 0 && (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Belum ada pesanan</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
