import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Plus, Minus, Trash2, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  stock: number;
  category_id: string;
  is_active: boolean;
  image_url?: string;
}

interface CartItem extends MenuItem {
  quantity: number;
  subtotal: number;
}

interface Category {
  id: string;
  name: string;
}

export function POS() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch menus
      const { data: menusData, error: menusError } = await supabase
        .from('menus')
        .select('*')
        .eq('is_active', true)
        .gt('stock', 0);
      
      if (menusError) throw menusError;

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*');
      
      if (categoriesError) throw categoriesError;

      setMenus(menusData || []);
      setCategories(categoriesData || []);
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

  const filteredMenus = menus.filter((menu) => {
    const matchesCategory = selectedCategory === 'all' || menu.category_id === selectedCategory;
    const matchesSearch = menu.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (menu: MenuItem) => {
    const existingItem = cart.find((item) => item.id === menu.id);
    
    if (existingItem) {
      if (existingItem.quantity >= menu.stock) {
        toast({
          title: 'Stok Tidak Cukup',
          description: `Stok ${menu.name} hanya tersisa ${menu.stock}`,
          variant: 'destructive',
        });
        return;
      }
      
      setCart(cart.map((item) =>
        item.id === menu.id
          ? { 
              ...item, 
              quantity: item.quantity + 1, 
              subtotal: (item.quantity + 1) * item.price 
            }
          : item
      ));
    } else {
      const newItem: CartItem = {
        ...menu,
        quantity: 1,
        subtotal: menu.price,
      };
      setCart([...cart, newItem]);
    }
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    const menu = menus.find((m) => m.id === id);
    if (menu && quantity > menu.stock) {
      toast({
        title: 'Stok Tidak Cukup',
        description: `Stok ${menu.name} hanya tersisa ${menu.stock}`,
        variant: 'destructive',
      });
      return;
    }

    setCart(cart.map((item) =>
      item.id === id
        ? { 
            ...item, 
            quantity, 
            subtotal: quantity * item.price 
          }
        : item
    ));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.subtotal, 0);
  };

  const getChangeAmount = () => {
    const received = parseFloat(cashReceived) || 0;
    const total = getTotalAmount();
    return received - total;
  };

  const processOrder = async () => {
    if (cart.length === 0) {
      toast({
        title: 'Keranjang Kosong',
        description: 'Silakan tambahkan item ke keranjang terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }

    // Validate cash payment
    if (paymentMethod === 'cash') {
      const received = parseFloat(cashReceived) || 0;
      const total = getTotalAmount();
      
      if (received < total) {
        toast({
          title: 'Uang Tidak Cukup',
          description: `Uang yang diterima kurang dari total pembayaran`,
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      setLoading(true);
      
      const total = getTotalAmount();
      
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          total,
          payment_method: paymentMethod,
          status: 'completed',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        menu_id: item.id,
        qty: item.quantity,
        price_at_order: item.price,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Clear cart and refresh data
      setCart([]);
      setCashReceived('');
      await fetchData();

      const changeAmount = paymentMethod === 'cash' ? getChangeAmount() : 0;
      
      toast({
        title: 'Berhasil!',
        description: paymentMethod === 'cash' && changeAmount > 0 
          ? `Transaksi berhasil! Kembalian: ${formatCurrency(changeAmount)}`
          : `Transaksi sebesar ${formatCurrency(total)} berhasil diproses`,
      });

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-6rem)]">
        {/* Menu Selection */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">POS - Point of Sales</h1>
            <Button onClick={fetchData} disabled={loading}>
              Refresh Menu
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Cari menu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-auto max-h-[calc(100vh-16rem)]">
            {filteredMenus.map((menu) => (
              <Card key={menu.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  {menu.image_url && (
                    <img
                      src={menu.image_url}
                      alt={menu.name}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                  )}
                  <h3 className="font-semibold text-lg mb-2">{menu.name}</h3>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-lg font-bold text-primary">{formatCurrency(menu.price)}</p>
                    <Badge variant={menu.stock > 10 ? 'default' : 'secondary'}>
                      Stok: {menu.stock}
                    </Badge>
                  </div>
                  <Button
                    onClick={() => addToCart(menu)}
                    className="w-full"
                    disabled={menu.stock === 0}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah ke Keranjang
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredMenus.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Tidak ada menu yang ditemukan</p>
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="bg-card rounded-lg border p-4 h-fit max-h-[calc(100vh-6rem)] overflow-auto">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Keranjang</h2>
          </div>

          {cart.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Keranjang kosong</p>
          ) : (
            <div className="space-y-4">
              {/* Cart Items */}
              <div className="space-y-3 max-h-64 overflow-auto">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.price)} x {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Metode Pembayaran</label>
                <Select value={paymentMethod} onValueChange={(value) => {
                  setPaymentMethod(value);
                  setCashReceived('');
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="qris">QRIS</SelectItem>
                    <SelectItem value="transfer">Transfer Bank</SelectItem>
                    <SelectItem value="debit">Kartu Debit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cash Payment Section */}
              {paymentMethod === 'cash' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Uang Diterima</label>
                    <Input
                      type="number"
                      placeholder="Masukkan jumlah uang"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                    />
                  </div>
                  
                  {cashReceived && parseFloat(cashReceived) > 0 && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Uang Diterima:</span>
                        <span className="font-semibold">{formatCurrency(parseFloat(cashReceived))}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Total Pembayaran:</span>
                        <span className="font-semibold">{formatCurrency(getTotalAmount())}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Kembalian:</span>
                        <span className={`font-bold text-lg ${
                          getChangeAmount() >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(getChangeAmount())}
                        </span>
                      </div>
                      {getChangeAmount() < 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          Uang kurang {formatCurrency(Math.abs(getChangeAmount()))}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Total */}
              <div className="space-y-2">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(getTotalAmount())}</span>
                </div>
              </div>

              {/* Process Order Button */}
              <Button
                onClick={processOrder}
                className="w-full"
                size="lg"
                disabled={loading || cart.length === 0}
              >
                <DollarSign className="mr-2 h-5 w-5" />
                {loading ? 'Memproses...' : 'Proses Pesanan'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}