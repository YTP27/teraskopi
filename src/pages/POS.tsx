import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, Minus, ShoppingCart, Trash2, Settings, RefreshCw, AlertCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MenuVariation {
  id: string;
  name: string;
  price_adjustment: number;
  is_active: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category_id: string;
  is_active: boolean;
  image_url?: string;
  variations?: MenuVariation[];
}

interface CartItem extends MenuItem {
  quantity: number;
  subtotal: number;
  selectedVariations: MenuVariation[];
  notes?: string;
}

interface Category {
  id: string;
  name: string;
}

export function POS() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'debit' | 'credit' | 'ewallet'>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [orderType, setOrderType] = useState<'order_and_pay' | 'order_only'>('order_and_pay');
  const [customerName, setCustomerName] = useState<string>('');
  
  // Dialog state
  const [showVariationDialog, setShowVariationDialog] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [selectedVariations, setSelectedVariations] = useState<MenuVariation[]>([]);
  const [orderNotes, setOrderNotes] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    loadPersistedData();
  }, []);

  // Save cart data to localStorage whenever it changes
  useEffect(() => {
    const cartData = {
      cartItems,
      customerName,
      paymentMethod,
      cashReceived
    };
    localStorage.setItem('pos-cart-data', JSON.stringify(cartData));
  }, [cartItems, customerName, paymentMethod, cashReceived]);

  const loadPersistedData = () => {
    try {
      const savedData = localStorage.getItem('pos-cart-data');
      if (savedData) {
        const { cartItems: savedCart, customerName: savedCustomer, paymentMethod: savedPayment, cashReceived: savedCash } = JSON.parse(savedData);
        if (savedCart?.length > 0) {
          setCartItems(savedCart);
          setCustomerName(savedCustomer || '');
          setPaymentMethod(savedPayment || 'cash');
          setCashReceived(savedCash || '');
        }
      }
    } catch (error) {
      console.error('Error loading persisted cart data:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [menusResponse, categoriesResponse, variationsResponse] = await Promise.all([
        supabase.from('menus').select('*').eq('is_active', true).gt('stock', 0),
        supabase.from('categories').select('*'),
        supabase.from('menu_variations').select('*').eq('is_active', true)
      ]);

      if (menusResponse.error) throw menusResponse.error;
      if (categoriesResponse.error) throw categoriesResponse.error;
      if (variationsResponse.error) throw variationsResponse.error;

      // Combine menus with their variations
      const menusWithVariations = menusResponse.data?.map(menu => ({
        ...menu,
        variations: variationsResponse.data?.filter(variation => variation.menu_id === menu.id) || []
      })) || [];

      setMenus(menusWithVariations);
      setCategories(categoriesResponse.data || []);
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

  // Group menus by category and sort alphabetically
  const groupedMenus = () => {
    if (selectedCategory !== 'all') {
      // If specific category is selected, return sorted menus without grouping
      return filteredMenus.sort((a, b) => a.name.localeCompare(b.name, 'id'));
    }

    // Group by category
    const grouped = categories.reduce((acc, category) => {
      const categoryMenus = filteredMenus
        .filter(menu => menu.category_id === category.id)
        .sort((a, b) => a.name.localeCompare(b.name, 'id'));
      
      if (categoryMenus.length > 0) {
        acc[category.name] = categoryMenus;
      }
      return acc;
    }, {} as Record<string, MenuItem[]>);

    return grouped;
  };

  const openVariationDialog = (menu: MenuItem) => {
    setSelectedMenu(menu);
    setSelectedVariations([]);
    setOrderNotes('');
    setShowVariationDialog(true);
  };

  const addToCart = (menu: MenuItem, variations: MenuVariation[] = [], notes: string = '') => {
    const variationKey = variations.map(v => v.id).sort().join(',');
    const notesKey = notes.trim();
    const existingItem = cartItems.find(item => 
      item.id === menu.id && 
      item.selectedVariations.map(v => v.id).sort().join(',') === variationKey &&
      (item.notes || '') === notesKey
    );
    
    const variationPrice = variations.reduce((sum, variation) => sum + variation.price_adjustment, 0);
    const finalPrice = menu.price + variationPrice;
    
    if (existingItem) {
      if (existingItem.quantity >= menu.stock) {
        toast({
          title: 'Stok Tidak Cukup',
          description: `Stok maksimal untuk ${menu.name} adalah ${menu.stock}`,
          variant: 'destructive',
        });
        return;
      }
      updateQuantity(existingItem.id, existingItem.quantity + 1, existingItem.selectedVariations, existingItem.notes);
    } else {
      const cartItem: CartItem = {
        ...menu,
        quantity: 1,
        subtotal: finalPrice,
        selectedVariations: variations,
        notes: notes.trim() || undefined,
      };
      setCartItems([...cartItems, cartItem]);
    }

    const variationText = variations.length > 0 ? ` (${variations.map(v => v.name).join(', ')})` : '';
    toast({
      title: 'Item Ditambahkan',
      description: `${menu.name}${variationText} ditambahkan ke keranjang`,
    });
  };

  const handleAddToCart = (menu: MenuItem) => {
    openVariationDialog(menu);
  };

  const updateQuantity = (id: string, quantity: number, variations: MenuVariation[] = [], notes?: string) => {
    if (quantity <= 0) {
      removeFromCart(id, variations, notes);
      return;
    }

    setCartItems(cartItems.map(item => {
      const variationKey = variations.map(v => v.id).sort().join(',');
      const itemVariationKey = item.selectedVariations.map(v => v.id).sort().join(',');
      const notesMatch = (item.notes || '') === (notes || '');
      
      if (item.id === id && itemVariationKey === variationKey && notesMatch) {
        if (quantity > item.stock) {
          toast({
            title: 'Stok Tidak Cukup',
            description: `Stok maksimal untuk ${item.name} adalah ${item.stock}`,
            variant: 'destructive',
          });
          return item;
        }
        const variationPrice = item.selectedVariations.reduce((sum, variation) => sum + variation.price_adjustment, 0);
        const finalPrice = item.price + variationPrice;
        return {
          ...item,
          quantity,
          subtotal: finalPrice * quantity,
        };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string, variations: MenuVariation[] = [], notes?: string) => {
    const variationKey = variations.map(v => v.id).sort().join(',');
    setCartItems(cartItems.filter(item => {
      const itemVariationKey = item.selectedVariations.map(v => v.id).sort().join(',');
      const notesMatch = (item.notes || '') === (notes || '');
      return !(item.id === id && itemVariationKey === variationKey && notesMatch);
    }));
  };

  const getTotalAmount = () => {
    return cartItems.reduce((total, item) => total + item.subtotal, 0);
  };

  const getChangeAmount = () => {
    const received = parseFloat(cashReceived) || 0;
    const total = getTotalAmount();
    return received - total;
  };

  const processOrder = async () => {
    if (cartItems.length === 0) {
      toast({
        title: 'Keranjang Kosong',
        description: 'Tambahkan item ke keranjang terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }

    if (!customerName.trim()) {
      toast({
        title: 'Nama Pelanggan Diperlukan',
        description: 'Masukkan nama pelanggan terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }

    // Only validate payment if user wants to pay now
    if (orderType === 'order_and_pay' && paymentMethod === 'cash') {
      const totalAmount = getTotalAmount();
      const cashAmount = parseFloat(cashReceived) || 0;
      
      if (cashAmount < totalAmount) {
        toast({
          title: 'Uang Tidak Cukup',
          description: `Uang yang diterima kurang dari total pembayaran`,
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      
      const isPaying = orderType === 'order_and_pay';
      const orderData = {
        total: getTotalAmount(),
        payment_method: isPaying ? paymentMethod : 'cash',
        payment_status: isPaying ? 'paid' : 'unpaid',
        payment_date: isPaying ? new Date().toISOString() : null,
        status: 'pending',
        customer_name: customerName.trim(),
        user_id: user.user?.id || null,
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        menu_id: item.id,
        qty: item.quantity,
        price_at_order: item.price,
        subtotal: item.subtotal,
        selected_variations: JSON.stringify(item.selectedVariations),
        notes: item.notes || null,
        status: 'pending'
      }));

      const { error: orderItemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (orderItemsError) throw orderItemsError;

      // Clear cart and reset form
      setCartItems([]);
      setCashReceived('');
      setCustomerName('');
      setPaymentMethod('cash');
      setShowCartDrawer(false);
      
      // Clear persisted data
      localStorage.removeItem('pos-cart-data');

      const changeAmount = (orderType === 'order_and_pay' && paymentMethod === 'cash') ? getChangeAmount() : 0;
      
      toast({
        title: 'Pesanan Berhasil',
        description: orderType === 'order_only' 
          ? `Pesanan atas nama ${customerName} telah dibuat. Pelanggan dapat bayar nanti.`
          : `Pesanan atas nama ${customerName} telah dibuat dan dibayar. ${paymentMethod === 'cash' && changeAmount > 0 ? `Kembalian: ${formatCurrency(changeAmount)}` : ''}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">POS Kasir</h1>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="pb-20">
        {/* Search and Filter */}
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari menu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
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
        <div className="px-4 space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Memuat menu...</p>
            </div>
          ) : selectedCategory !== 'all' ? (
            // Single category view
            <div className="space-y-4">
              {(() => {
                const menus = groupedMenus() as MenuItem[];
                return menus.length > 0 ? (
                  menus.map((menu) => (
                    <Card key={menu.id} className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{menu.name}</h3>
                            {menu.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{menu.description}</p>
                            )}
                          </div>
                          {menu.image_url && (
                            <img 
                              src={menu.image_url} 
                              alt={menu.name}
                              className="w-16 h-16 bg-muted rounded-lg ml-3 flex-shrink-0 object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-lg font-bold text-primary">{formatCurrency(menu.price)}</p>
                            <Badge variant={menu.stock > 10 ? 'default' : 'secondary'} className="text-xs">
                              Stok: {menu.stock}
                            </Badge>
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => handleAddToCart(menu)}
                            className="px-4"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Tambah
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Tidak ada menu yang ditemukan</p>
                  </div>
                );
              })()}
            </div>
          ) : (
            // All categories view with sections
            <div className="space-y-6">
              {(() => {
                const grouped = groupedMenus() as Record<string, MenuItem[]>;
                return Object.keys(grouped).length > 0 ? (
                  Object.entries(grouped).map(([categoryName, menus]) => (
                    <div key={categoryName} className="space-y-3">
                      {/* Category Header */}
                      <div className="sticky top-16 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2">
                        <h2 className="text-lg font-bold text-foreground border-l-4 border-primary pl-3">
                          {categoryName}
                        </h2>
                      </div>
                      
                      {/* Category Menu Items */}
                      <div className="space-y-4">
                        {menus.map((menu) => (
                          <Card key={menu.id} className="border-0 shadow-sm">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg">{menu.name}</h3>
                                  {menu.description && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{menu.description}</p>
                                  )}
                                </div>
                                {menu.image_url && (
                                  <img 
                                    src={menu.image_url} 
                                    alt={menu.name}
                                    className="w-16 h-16 bg-muted rounded-lg ml-3 flex-shrink-0 object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-lg font-bold text-primary">{formatCurrency(menu.price)}</p>
                                  <Badge variant={menu.stock > 10 ? 'default' : 'secondary'} className="text-xs">
                                    Stok: {menu.stock}
                                  </Badge>
                                </div>
                                <Button 
                                  size="sm"
                                  onClick={() => handleAddToCart(menu)}
                                  className="px-4"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Tambah
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Tidak ada menu yang ditemukan</p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Cart */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-primary text-primary-foreground p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">{cartItems.length} items</p>
              <p className="font-semibold">{formatCurrency(getTotalAmount())}</p>
            </div>
            <Button 
              variant="secondary" 
              onClick={() => setShowCartDrawer(true)}
              className="text-primary bg-primary-foreground hover:bg-primary-foreground/80"
            >
              Lihat Keranjang
              <ShoppingCart className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowCartDrawer(false)}>
          <div 
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-lg h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cart Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Keranjang Belanja</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowCartDrawer(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {cartItems.map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    {item.selectedVariations.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {item.selectedVariations.map(v => v.name).join(', ')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-orange-600 font-medium">
                        Note: {item.notes}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-primary">{formatCurrency(item.subtotal)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity - 1, item.selectedVariations, item.notes)}
                      className="h-8 w-8 p-0"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="font-medium min-w-[24px] text-center">{item.quantity}</span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedVariations, item.notes)}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => removeFromCart(item.id, item.selectedVariations, item.notes)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Footer */}
            <div className="border-t p-4 space-y-4">
              {/* Total */}
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total:</span>
                <span className="text-primary">{formatCurrency(getTotalAmount())}</span>
              </div>

              {/* Customer Info */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="customer-name-drawer">Nama Pelanggan</Label>
                  <Input
                    id="customer-name-drawer"
                    placeholder="Masukkan nama pelanggan"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Tipe Pesanan</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button
                      type="button"
                      variant={orderType === 'order_and_pay' ? 'default' : 'outline'}
                      onClick={() => setOrderType('order_and_pay')}
                      size="sm"
                    >
                      Pesan & Bayar
                    </Button>
                    <Button
                      type="button"
                      variant={orderType === 'order_only' ? 'default' : 'outline'}
                      onClick={() => setOrderType('order_only')}
                      size="sm"
                    >
                      Pesan Dulu
                    </Button>
                  </div>
                </div>

                {orderType === 'order_and_pay' && (
                  <div>
                    <Label>Metode Pembayaran</Label>
                    <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Pilih metode pembayaran" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Tunai</SelectItem>
                        <SelectItem value="debit">Kartu Debit</SelectItem>
                        <SelectItem value="credit">Kartu Kredit</SelectItem>
                        <SelectItem value="ewallet">E-Wallet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {orderType === 'order_and_pay' && paymentMethod === 'cash' && (
                  <div>
                    <Label htmlFor="cash-received-drawer">Uang Diterima</Label>
                    <Input
                      id="cash-received-drawer"
                      type="number"
                      placeholder="Masukkan jumlah uang"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                    />
                    {cashReceived && parseFloat(cashReceived) > 0 && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        <div className="flex justify-between">
                          <span>Kembalian:</span>
                          <span className={`font-bold ${
                            getChangeAmount() >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(getChangeAmount())}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Process Order Button */}
              <Button onClick={processOrder} className="w-full" size="lg">
                {orderType === 'order_only' ? 'Buat Pesanan' : 'Proses Pembayaran'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Variation Selection Dialog */}
      <Dialog open={showVariationDialog} onOpenChange={setShowVariationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pilih Variasi untuk {selectedMenu?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedMenu?.variations?.map((variation) => (
              <div key={variation.id} className="flex items-center space-x-2">
                <Checkbox
                  id={variation.id}
                  checked={selectedVariations.some(v => v.id === variation.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedVariations([...selectedVariations, variation]);
                    } else {
                      setSelectedVariations(selectedVariations.filter(v => v.id !== variation.id));
                    }
                  }}
                />
                <Label htmlFor={variation.id} className="flex-1">
                  {variation.name}
                  {variation.price_adjustment !== 0 && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({variation.price_adjustment > 0 ? '+' : ''}{formatCurrency(variation.price_adjustment)})
                    </span>
                  )}
                </Label>
              </div>
            ))}
            
            <div className="space-y-2 pt-4">
              <Label htmlFor="order-notes">Catatan Khusus (opsional)</Label>
              <Input
                id="order-notes"
                placeholder="Contoh: no sugar, extra hot, dll..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowVariationDialog(false)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                onClick={() => {
                  if (selectedMenu) {
                    addToCart(selectedMenu, selectedVariations, orderNotes);
                  }
                  setShowVariationDialog(false);
                }}
                className="flex-1"
              >
                Tambah ke Keranjang
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}