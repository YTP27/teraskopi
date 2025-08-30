import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const { toast } = useToast();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Berhasil login!',
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-100 to-yellow-50 p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-lg hover:shadow-xl transition border border-orange-200/60 bg-gradient-to-br from-white to-orange-50">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img
              src="/logokopi.png"
              alt="Teras Kopi Logo"
              className="h-24 w-24 object-contain drop-shadow-md"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">Teras Kopi & Food</CardTitle>
          <CardDescription className="text-gray-500">
            Masuk ke sistem manajemen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@teraskopi.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-md"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Masuk'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-gray-600">
            Belum punya akun?{' '}
            <Link to="/auth/register" className="text-orange-600 font-medium hover:underline">
              Daftar di sini
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
