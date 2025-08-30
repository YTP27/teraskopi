import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  BarChart3,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Order {
  id: string;
  total: number;
  status: string;
  payment_method: string;
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
  const [dateFilter, setDateFilter] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (dateFilter !== "custom") {
      filterDataByDate();
    }
  }, [dateFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [ordersResponse, orderItemsResponse, menusResponse] =
        await Promise.all([
          supabase
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase.from("order_items").select("*"),
          supabase.from("menus").select("id, name, price"),
        ]);

      if (ordersResponse.error) throw ordersResponse.error;
      if (orderItemsResponse.error) throw orderItemsResponse.error;
      if (menusResponse.error) throw menusResponse.error;

      setOrders(ordersResponse.data || []);
      setOrderItems(orderItemsResponse.data || []);
      setMenus(menusResponse.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterDataByDate = () => {
    const now = new Date();
    let startFilterDate: Date;

    switch (dateFilter) {
      case "today":
        startFilterDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        break;
      case "week":
        startFilterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startFilterDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        startFilterDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return;
    }

    // This filtering happens on the frontend for demo purposes
    // In production, you'd want to filter in the database query
  };

  const getFilteredOrders = () => {
    if (dateFilter === "all") return orders;

    const now = new Date();
    let startFilterDate: Date;
    let endFilterDate: Date = now;

    if (dateFilter === "custom" && startDate && endDate) {
      startFilterDate = new Date(startDate);
      endFilterDate = new Date(endDate);
      endFilterDate.setHours(23, 59, 59, 999);
    } else {
      switch (dateFilter) {
        case "today":
          startFilterDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "week":
          startFilterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startFilterDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "year":
          startFilterDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          return orders;
      }
    }

    return orders.filter((order) => {
      const orderDate = new Date(order.created_at);
      return orderDate >= startFilterDate && orderDate <= endFilterDate;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMenuName = (menuId: string) => {
    const menu = menus.find((m) => m.id === menuId);
    return menu ? menu.name : "Menu tidak ditemukan";
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: { [key: string]: string } = {
      cash: "Tunai",
      debit: "Kartu Debit",
      credit: "Kartu Kredit",
      ewallet: "E-Wallet",
    };
    return methods[method] || method;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "pending":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    const statuses: { [key: string]: string } = {
      completed: "Selesai",
      pending: "Menunggu",
      cancelled: "Dibatalkan",
    };
    return statuses[status] || status;
  };

  // Calculate statistics
  const filteredOrders = getFilteredOrders();
  const totalSales = filteredOrders.reduce(
    (sum, order) => sum + order.total,
    0
  );
  const totalOrders = filteredOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  const completedOrders = filteredOrders.filter(
    (order) => order.status === "completed"
  ).length;

  // Most popular items
  const itemStats = orderItems
    .filter((item) =>
      filteredOrders.some((order) => order.id === item.order_id)
    )
    .reduce(
      (
        stats: {
          [key: string]: { name: string; qty: number; revenue: number };
        },
        item
      ) => {
        const menuName = getMenuName(item.menu_id);
        if (!stats[item.menu_id]) {
          stats[item.menu_id] = { name: menuName, qty: 0, revenue: 0 };
        }
        stats[item.menu_id].qty += item.qty;
        stats[item.menu_id].revenue += item.subtotal;
        return stats;
      },
      {}
    );

  const popularItems = Object.values(itemStats)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Payment method distribution
  const paymentStats = filteredOrders.reduce(
    (stats: { [key: string]: number }, order) => {
      stats[order.payment_method] = (stats[order.payment_method] || 0) + 1;
      return stats;
    },
    {}
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Laporan Penjualan</h1>
          <p className="text-muted-foreground">
            Analisis performa bisnis dan penjualan
          </p>
        </div>
      </div>

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

            {dateFilter === "custom" && (
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
            <CardTitle className="text-sm font-medium">
              Total Penjualan
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalSales)}
            </div>
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
            <CardTitle className="text-sm font-medium">
              Rata-rata Nilai Pesanan
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(avgOrderValue)}
            </div>
            <p className="text-xs text-muted-foreground">Per transaksi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tingkat Penyelesaian
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalOrders > 0
                ? Math.round((completedOrders / totalOrders) * 100)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Pesanan berhasil</p>
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
                      <p className="text-sm text-muted-foreground">
                        {item.qty} terjual
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {formatCurrency(item.revenue)}
                    </div>
                  </div>
                </div>
              ))}
              {popularItems.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  Tidak ada data untuk periode ini
                </p>
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
                    <Badge variant="outline">
                      {getPaymentMethodLabel(method)}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{count} transaksi</div>
                    <div className="text-sm text-muted-foreground">
                      {totalOrders > 0
                        ? Math.round((count / totalOrders) * 100)
                        : 0}
                      %
                    </div>
                  </div>
                </div>
              ))}
              {Object.keys(paymentStats).length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  Tidak ada data untuk periode ini
                </p>
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
                    <TableHead>Total</TableHead>
                    <TableHead>Metode Pembayaran</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.slice(0, 10).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{formatDate(order.created_at)}</TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(order.total)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getPaymentMethodLabel(order.payment_method)}
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

              {filteredOrders.length === 0 && (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Tidak ada data untuk periode yang dipilih
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
