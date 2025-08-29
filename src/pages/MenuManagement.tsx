import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, UtensilsCrossed } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category_id?: string;
  is_active: boolean;
  image_url?: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
}

interface MenuFormData {
  name: string;
  description: string;
  price: string;
  stock: string;
  category_id: string;
  is_active: boolean;
  image_url: string;
}

export function MenuManagement() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<MenuFormData>({
    name: '',
    description: '',
    price: '',
    stock: '',
    category_id: '',
    is_active: true,
    image_url: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [menusResponse, categoriesResponse] = await Promise.all([
        supabase.from('menus').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name')
      ]);

      if (menusResponse.error) throw menusResponse.error;
      if (categoriesResponse.error) throw categoriesResponse.error;

      setMenus(menusResponse.data || []);
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

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      stock: '',
      category_id: 'none',
      is_active: true,
      image_url: '',
    });
    setEditingMenu(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (menu: MenuItem) => {
    setEditingMenu(menu);
    setFormData({
      name: menu.name,
      description: menu.description || '',
      price: menu.price.toString(),
      stock: menu.stock.toString(),
      category_id: menu.category_id || 'none',
      is_active: menu.is_active,
      image_url: menu.image_url || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.stock) {
      toast({
        title: 'Error',
        description: 'Nama, harga, dan stok harus diisi',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const menuData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        category_id: formData.category_id === 'none' ? null : formData.category_id || null,
        is_active: formData.is_active,
        image_url: formData.image_url || null,
      };

      if (editingMenu) {
        const { error } = await supabase
          .from('menus')
          .update(menuData)
          .eq('id', editingMenu.id);

        if (error) throw error;

        toast({
          title: 'Berhasil!',
          description: 'Menu berhasil diperbarui',
        });
      } else {
        const { error } = await supabase
          .from('menus')
          .insert([menuData]);

        if (error) throw error;

        toast({
          title: 'Berhasil!',
          description: 'Menu berhasil ditambahkan',
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

  const handleDelete = async (menu: MenuItem) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus menu "${menu.name}"?`)) {
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('menus')
        .delete()
        .eq('id', menu.id);

      if (error) throw error;

      toast({
        title: 'Berhasil!',
        description: 'Menu berhasil dihapus',
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : '-';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Menu</h1>
          <p className="text-muted-foreground">Kelola menu makanan dan minuman</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Menu
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5" />
            Daftar Menu
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
                    <TableHead>Gambar</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menus.map((menu) => (
                    <TableRow key={menu.id}>
                      <TableCell>
                        {menu.image_url ? (
                          <img
                            src={menu.image_url}
                            alt={menu.name}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
                            <UtensilsCrossed className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{menu.name}</p>
                          {menu.description && (
                            <p className="text-sm text-muted-foreground">
                              {menu.description.length > 50
                                ? menu.description.substring(0, 50) + '...'
                                : menu.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getCategoryName(menu.category_id || '')}</TableCell>
                      <TableCell>{formatCurrency(menu.price)}</TableCell>
                      <TableCell>
                        <Badge variant={menu.stock > 10 ? 'default' : menu.stock > 0 ? 'secondary' : 'destructive'}>
                          {menu.stock}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={menu.is_active ? 'default' : 'secondary'}>
                          {menu.is_active ? 'Aktif' : 'Tidak Aktif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(menu)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(menu)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {menus.length === 0 && (
                <div className="text-center py-8">
                  <UtensilsCrossed className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Belum ada menu yang ditambahkan</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMenu ? 'Edit Menu' : 'Tambah Menu Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingMenu ? 'Perbarui informasi menu' : 'Tambahkan menu baru ke sistem'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Menu *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Nasi Goreng Special"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi singkat tentang menu"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Harga *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="25000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stok *</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak ada kategori</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">URL Gambar</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Menu aktif</Label>
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
                {loading ? 'Menyimpan...' : editingMenu ? 'Perbarui' : 'Tambah'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}