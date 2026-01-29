// frontend/src/pages/PlatformAdminsPage.tsx
import React, { useState, useEffect } from 'react';
import { UserData, PlatformAdminType } from '../types/user';
import { fetchPlatformAdmins, createPlatformAdmin } from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Plus, ShieldCheck, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const PlatformAdminsPage: React.FC = () => {
  const [admins, setAdmins] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado do Formulário
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    adminType: PlatformAdminType.SUPER_ADMIN
  });

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const data = await fetchPlatformAdmins();
      setAdmins(data);
    } catch (error) {
      toast.error('Erro ao carregar administradores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createPlatformAdmin(formData);
      toast.success('Administrador criado com sucesso!');
      setShowForm(false);
      setFormData({ firstName: '', lastName: '', email: '', password: '', adminType: PlatformAdminType.SUPER_ADMIN });
      loadAdmins(); // Recarregar a lista
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar administrador.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Administradores da Plataforma</CardTitle>
            <CardDescription>Utilizadores com acesso global de gestão.</CardDescription>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo Administrador
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-gray-400" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tipo de Acesso</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.firstName} {admin.lastName}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        {admin.platformAdminDetails?.adminType || 'SUPER_ADMIN'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${admin.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {admin.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* MODAL DE CRIAÇÃO */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Novo Administrador</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Primeiro Nome</Label>
                    <Input required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label>Apelido</Label>
                    <Input required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Palavra-passe Temporária</Label>
                  <Input type="password" required minLength={10} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Tipo de Administrador</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={formData.adminType}
                    onChange={e => setFormData({...formData, adminType: e.target.value as PlatformAdminType})}
                  >
                    <option value={PlatformAdminType.SUPER_ADMIN}>Super Admin (Total)</option>
                    <option value={PlatformAdminType.SUPPORT_L2}>Suporte Nível 2</option>
                    <option value={PlatformAdminType.AUDITOR}>Auditor</option>
                    <option value={PlatformAdminType.FINANCE}>Financeiro</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'A criar...' : 'Criar Administrador'}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PlatformAdminsPage;