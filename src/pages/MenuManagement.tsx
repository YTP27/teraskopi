import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, UtensilsCrossed, Search, Filter, X, MoreHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { toast } = useToast();
  const isMobile = useIsMobile();

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

  const filteredMenus = menus.filter((menu) => {
    const matchesSearch = menu.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || menu.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
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

  const MenuFormComponent = ({ onClose }: { onClose: () => void }) => (
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

      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1"
        >
          Batal
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Menyimpan...' : editingMenu ? 'Perbarui' : 'Tambah'}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">Manajemen Menu</h1>
              <p className="text-sm text-muted-foreground">Kelola menu makanan dan minuman</p>
            </div>
            {isMobile ? (
              <Drawer open={dialogOpen} onOpenChange={setDialogOpen}>
                <DrawerTrigger asChild>
                  <Button size="sm" onClick={openAddDialog}>
                    <Plus className="h-4 w-4 mr-1" />
                    Tambah
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>
                      {editingMenu ? 'Edit Menu' : 'Tambah Menu Baru'}
                    </DrawerTitle>
                    <DrawerDescription>
                      {editingMenu ? 'Perbarui informasi menu' : 'Tambahkan menu baru ke sistem'}
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="px-4 pb-4">
                    <MenuFormComponent onClose={() => setDialogOpen(false)} />
                  </div>
                </DrawerContent>
              </Drawer>
            ) : (
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Menu
              </Button>
            )}
          </div>

          {/* Search and Filter */}
          <div className="space-y-3">
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
                <SelectValue placeholder="Semua kategori" />
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
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-20">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Memuat data...</p>
          </div>
        ) : isMobile ? (
          /* Mobile Card View */
          <div className="space-y-6">
            {filteredMenus.length === 0 ? (
              <div className="text-center py-8">
                <UtensilsCrossed className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || selectedCategory !== 'all' 
                    ? 'Tidak ada menu yang sesuai dengan filter'
                    : 'Belum ada menu yang ditambahkan'
                  }
                </p>
              </div>
            ) : selectedCategory !== 'all' ? (
              // Single category view
              <div className="space-y-4">
                {(() => {
                  const menus = groupedMenus() as MenuItem[];
                  return menus.map((menu) => (
                    <Card key={menu.id} className="overflow-hidden shadow-sm border-0">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {/* Image */}
                          <div className="flex-shrink-0">
                            {menu.image_url ? (
                              <img
                                src={menu.image_url}
                                alt={menu.name}
                                className="h-16 w-16 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center">
                                <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg truncate">{menu.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {getCategoryName(menu.category_id || '')}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(menu)}
                                className="ml-2 flex-shrink-0"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>

                            {menu.description && (
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                {menu.description}
                              </p>
                            )}

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-primary">
                                  {formatCurrency(menu.price)}
                                </span>
                                <Badge variant={menu.stock > 10 ? 'default' : menu.stock > 0 ? 'secondary' : 'destructive'}>
                                  Stok: {menu.stock}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={menu.is_active ? 'default' : 'secondary'}>
                                  {menu.is_active ? 'Aktif' : 'Tidak Aktif'}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDelete(menu)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ));
                })()}
              </div>
            ) : (
              // All categories view with sections
              <div className="space-y-6">
                {(() => {
                  const grouped = groupedMenus() as Record<string, MenuItem[]>;
                  return Object.entries(grouped).map(([categoryName, menus]) => (
                    <div key={categoryName} className="space-y-3">
                      {/* Category Header */}
                      <div className="sticky top-28 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2">
                        <h2 className="text-lg font-bold text-foreground border-l-4 border-primary pl-3">
                          {categoryName}
                        </h2>
                      </div>
                      
                      {/* Category Menu Items */}
                      <div className="space-y-4">
                        {menus.map((menu) => (
                          <Card key={menu.id} className="overflow-hidden shadow-sm border-0">
                            <CardContent className="p-4">
                              <div className="flex gap-4">
                                {/* Image */}
                                <div className="flex-shrink-0">
                                  {menu.image_url ? (
                                    <img
                                      src={menu.image_url}
                                      alt={menu.name}
                                      className="h-16 w-16 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center">
                                      <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-semibold text-lg truncate">{menu.name}</h3>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditDialog(menu)}
                                      className="ml-2 flex-shrink-0"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </div>

                                  {menu.description && (
                                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                      {menu.description}
                                    </p>
                                  )}

                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg font-bold text-primary">
                                        {formatCurrency(menu.price)}
                                      </span>
                                      <Badge variant={menu.stock > 10 ? 'default' : menu.stock > 0 ? 'secondary' : 'destructive'}>
                                        Stok: {menu.stock}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant={menu.is_active ? 'default' : 'secondary'}>
                                        {menu.is_active ? 'Aktif' : 'Tidak Aktif'}
                                      </Badge>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleDelete(menu)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        ) : (
          /* Desktop Table View */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                Daftar Menu
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                    {(() => {
                      const sortedMenus = selectedCategory !== 'all' 
                        ? (groupedMenus() as MenuItem[])
                        : filteredMenus.sort((a, b) => a.name.localeCompare(b.name, 'id'));
                      return sortedMenus.map((menu) => (
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
                     ));
                   })()}
                   </TableBody>
                </Table>

                {filteredMenus.length === 0 && (
                  <div className="text-center py-8">
                    <UtensilsCrossed className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm || selectedCategory !== 'all' 
                        ? 'Tidak ada menu yang sesuai dengan filter'
                        : 'Belum ada menu yang ditambahkan'
                      }
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop Dialog */}
      {!isMobile && (
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
            <MenuFormComponent onClose={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}