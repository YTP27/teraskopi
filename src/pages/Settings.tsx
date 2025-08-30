import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings as SettingsIcon, Plus, Edit, Trash2, Tag, Store, Bell, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  created_at: string;
}

interface CategoryFormData {
  name: string;
}

interface StoreSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  logo_url: string;
  opening_hours: string;
  tax_rate: number;
  currency: string;
  notification_enabled: boolean;
  auto_print_receipt: boolean;
  low_stock_alert: boolean;
  low_stock_threshold: number;
}

const defaultSettings: StoreSettings = {
  name: 'Teras Kopi & Food',
  address: '',
  phone: '',
  email: '',
  description: '',
  logo_url: '',
  opening_hours: '08:00 - 22:00',
  tax_rate: 10,
  currency: 'IDR',
  notification_enabled: true,
  auto_print_receipt: false,
  low_stock_alert: true,
  low_stock_threshold: 5,
};

export function Settings() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({ name: '' });
  const [activeTab, setActiveTab] = useState('store');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const categoriesResponse = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: false });

      if (categoriesResponse.error) throw categoriesResponse.error;

      setCategories(categoriesResponse.data || []);

      // Load settings from localStorage (in real app, this would come from database)
      const savedSettings = localStorage.getItem('storeSettings');
      if (savedSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      }
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

  const saveSettings = () => {
    try {
      localStorage.setItem('storeSettings', JSON.stringify(settings));
      toast({
        title: 'Berhasil!',
        description: 'Pengaturan berhasil disimpan',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Gagal menyimpan pengaturan',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: '' });
    setEditingCategory(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name });
    setDialogOpen(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast({
        title: 'Error',
        description: 'Nama kategori harus diisi',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({ name: formData.name })
          .eq('id', editingCategory.id);

        if (error) throw error;

        toast({
          title: 'Berhasil!',
          description: 'Kategori berhasil diperbarui',
        });
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([{ name: formData.name }]);

        if (error) throw error;

        toast({
          title: 'Berhasil!',
          description: 'Kategori berhasil ditambahkan',
        });
      }

      setDialogOpen(false);
      resetForm();
      await fetchData();
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

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kategori "${category.name}"?`)) {
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id);

      if (error) throw error;

      toast({
        title: 'Berhasil!',
        description: 'Kategori berhasil dihapus',
      });

      await fetchData();
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const tabs = [
    { id: 'store', label: 'Info Toko', icon: Store },
    { id: 'categories', label: 'Kategori', icon: Tag },
    { id: 'notifications', label: 'Notifikasi', icon: Bell },
    { id: 'appearance', label: 'Tampilan', icon: Palette },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pengaturan</h1>
          <p className="text-muted-foreground">Kelola pengaturan aplikasi dan toko</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            className="mb-2"
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="mr-2 h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Store Settings Tab */}
      {activeTab === 'store' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Informasi Toko
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="store-name">Nama Toko</Label>
                <Input
                  id="store-name"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  placeholder="Nama toko Anda"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="store-phone">Nomor Telepon</Label>
                <Input
                  id="store-phone"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  placeholder="0812-3456-7890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="store-email">Email</Label>
                <Input
                  id="store-email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  placeholder="info@teraskopi.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="opening-hours">Jam Operasional</Label>
                <Input
                  id="opening-hours"
                  value={settings.opening_hours}
                  onChange={(e) => setSettings({ ...settings, opening_hours: e.target.value })}
                  placeholder="08:00 - 22:00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="store-address">Alamat</Label>
              <Textarea
                id="store-address"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                placeholder="Alamat lengkap toko"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store-description">Deskripsi</Label>
              <Textarea
                id="store-description"
                value={settings.description}
                onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                placeholder="Deskripsi singkat tentang toko"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax-rate">Pajak (%)</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  value={settings.tax_rate}
                  onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) || 0 })}
                  placeholder="10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="low-stock-threshold">Batas Stok Rendah</Label>
                <Input
                  id="low-stock-threshold"
                  type="number"
                  value={settings.low_stock_threshold}
                  onChange={(e) => setSettings({ ...settings, low_stock_threshold: parseInt(e.target.value) || 0 })}
                  placeholder="5"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-print"
                  checked={settings.auto_print_receipt}
                  onCheckedChange={(checked) => setSettings({ ...settings, auto_print_receipt: checked })}
                />
                <Label htmlFor="auto-print">Cetak struk otomatis</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="low-stock-alert"
                  checked={settings.low_stock_alert}
                  onCheckedChange={(checked) => setSettings({ ...settings, low_stock_alert: checked })}
                />
                <Label htmlFor="low-stock-alert">Notifikasi stok habis</Label>
              </div>
            </div>

            <Button onClick={saveSettings}>
              Simpan Pengaturan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Kategori Menu
              </CardTitle>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Kategori
              </Button>
            </div>
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
                      <TableHead>Nama Kategori</TableHead>
                      <TableHead>Tanggal Dibuat</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{category.name}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(category.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteCategory(category)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {categories.length === 0 && (
                  <div className="text-center py-8">
                    <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Belum ada kategori yang ditambahkan</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Pengaturan Notifikasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notifikasi Umum</p>
                  <p className="text-sm text-muted-foreground">Aktifkan notifikasi sistem</p>
                </div>
                <Switch
                  checked={settings.notification_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, notification_enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Peringatan Stok Rendah</p>
                  <p className="text-sm text-muted-foreground">Notifikasi ketika stok menu hampir habis</p>
                </div>
                <Switch
                  checked={settings.low_stock_alert}
                  onCheckedChange={(checked) => setSettings({ ...settings, low_stock_alert: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Cetak Struk Otomatis</p>
                  <p className="text-sm text-muted-foreground">Cetak struk secara otomatis setelah transaksi</p>
                </div>
                <Switch
                  checked={settings.auto_print_receipt}
                  onCheckedChange={(checked) => setSettings({ ...settings, auto_print_receipt: checked })}
                />
              </div>
            </div>

            <Button onClick={saveSettings}>
              Simpan Pengaturan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Pengaturan Tampilan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="logo-url">URL Logo</Label>
              <Input
                id="logo-url"
                value={settings.logo_url}
                onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-sm text-muted-foreground">
                URL gambar logo yang akan ditampilkan di aplikasi
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Mata Uang</Label>
              <Select value={settings.currency} onValueChange={(value) => setSettings({ ...settings, currency: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih mata uang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDR">Rupiah (IDR)</SelectItem>
                  <SelectItem value="USD">US Dollar (USD)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">Preview Logo</h4>
              {settings.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt="Logo preview"
                  className="h-16 w-auto rounded-lg object-contain"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = 'none';
                    const parent = img.parentElement;
                    if (parent) {
                      parent.innerHTML += '<p class="text-sm text-muted-foreground">Gagal memuat gambar</p>';
                    }
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Tidak ada logo yang diatur</p>
              )}
            </div>

            <Button onClick={saveSettings}>
              Simpan Pengaturan
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Perbarui nama kategori' : 'Tambahkan kategori menu baru'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nama Kategori *</Label>
              <Input
                id="category-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Minuman Panas"
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Menyimpan...' : editingCategory ? 'Perbarui' : 'Tambah'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}