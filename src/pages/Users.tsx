import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Edit, Trash2, Users as UsersIcon, UserCheck, UserX, Mail, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Profile {
  id: string;
  user_id: string;
  full_name?: string;
  email?: string;
  role: string;
  avatar_url?: string;
  username?: string;
  created_at: string;
  updated_at: string;
}

interface UserFormData {
  full_name: string;
  email: string;
  role: string;
  username: string;
}

const roles = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
  { value: 'cashier', label: 'Kasir' },
];

export function Users() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    full_name: '',
    email: '',
    role: 'staff',
    username: '',
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProfiles(data || []);
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
      full_name: '',
      email: '',
      role: 'staff',
      username: '',
    });
    setEditingProfile(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (profile: Profile) => {
    setEditingProfile(profile);
    setFormData({
      full_name: profile.full_name || '',
      email: profile.email || '',
      role: profile.role,
      username: profile.username || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.email) {
      toast({
        title: 'Error',
        description: 'Nama lengkap dan email harus diisi',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      if (editingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            email: formData.email,
            role: formData.role,
            username: formData.username || null,
          })
          .eq('id', editingProfile.id);

        if (error) throw error;

        toast({
          title: 'Berhasil!',
          description: 'Profil pengguna berhasil diperbarui',
        });
      } else {
        // For adding new users, we would typically use Supabase Auth
        // This is a simplified version for demo purposes
        toast({
          title: 'Info',
          description: 'Untuk menambah pengguna baru, gunakan fitur registrasi di halaman login',
          variant: 'default',
        });
      }

      setDialogOpen(false);
      resetForm();
      await fetchProfiles();
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

  const handleDelete = async (profile: Profile) => {
    if (profile.user_id === user?.id) {
      toast({
        title: 'Error',
        description: 'Anda tidak dapat menghapus akun Anda sendiri',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus pengguna "${profile.full_name}"?`)) {
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: 'Berhasil!',
        description: 'Pengguna berhasil dihapus',
      });

      await fetchProfiles();
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

  const getRoleLabel = (role: string) => {
    const roleObj = roles.find(r => r.value === role);
    return roleObj ? roleObj.label : role;
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'manager':
        return 'secondary';
      case 'staff':
        return 'outline';
      case 'cashier':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get current user's role to check permissions
  const currentUserProfile = profiles.find(p => p.user_id === user?.id);
  const canManageUsers = currentUserProfile?.role === 'owner';

  // Stats
  const totalUsers = profiles.length;
  const activeUsers = profiles.length; // In real app, you'd track active status
  const ownerCount = profiles.filter(p => p.role === 'owner').length;
  const staffCount = profiles.filter(p => p.role === 'staff' || p.role === 'cashier').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Pengguna</h1>
          <p className="text-muted-foreground">Kelola pengguna dan peran mereka</p>
        </div>
        {canManageUsers && (
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Pengguna
          </Button>
        )}
      </div>

      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Terdaftar di sistem
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pengguna Aktif</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Saat ini online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Owner</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ownerCount}</div>
            <p className="text-xs text-muted-foreground">
              Administrator
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffCount}</div>
            <p className="text-xs text-muted-foreground">
              Karyawan
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Daftar Pengguna
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
                    <TableHead>Pengguna</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Peran</TableHead>
                    <TableHead>Bergabung</TableHead>
                    <TableHead>Status</TableHead>
                    {canManageUsers && <TableHead>Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                            <AvatarFallback>
                              {getInitials(profile.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{profile.full_name || 'Tidak ada nama'}</p>
                            {profile.username && (
                              <p className="text-sm text-muted-foreground">@{profile.username}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {profile.email || 'Tidak ada email'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(profile.role)}>
                          {getRoleLabel(profile.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(profile.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="default">Aktif</Badge>
                      </TableCell>
                      {canManageUsers && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(profile)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {profile.user_id !== user?.id && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(profile)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {profiles.length === 0 && (
                <div className="text-center py-8">
                  <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Tidak ada pengguna ditemukan</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {canManageUsers && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingProfile ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
              </DialogTitle>
              <DialogDescription>
                {editingProfile 
                  ? 'Perbarui informasi pengguna' 
                  : 'Untuk menambah pengguna baru, minta mereka untuk mendaftar melalui halaman registrasi'
                }
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nama Lengkap *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Nama lengkap pengguna"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  required
                  disabled={!editingProfile} // Only allow editing email for existing users
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Peran *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih peran" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  {loading ? 'Menyimpan...' : editingProfile ? 'Perbarui' : 'Tambah'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {!canManageUsers && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Anda tidak memiliki izin untuk mengelola pengguna. Hanya owner yang dapat mengelola pengguna.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}