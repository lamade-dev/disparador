import { useEffect, useState } from 'react';
import { UserPlus, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';

interface Gestor { id: string; name: string; email: string; active: boolean; createdAt: string; }

export default function GestorsPage() {
  const [gestors, setGestors] = useState<Gestor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    api.get('/users').then((res) => { setGestors(res.data); setLoading(false); });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/users', form);
      setGestors((prev) => [res.data, ...prev]);
      setForm({ name: '', email: '', password: '' });
      setShowForm(false);
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Erro ao criar gestor');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(gestor: Gestor) {
    await api.patch(`/users/${gestor.id}`, { active: !gestor.active });
    setGestors((prev) => prev.map((g) => g.id === gestor.id ? { ...g, active: !g.active } : g));
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestores</h1>
          <p className="text-muted-foreground text-sm">{gestors.length} gestor{gestors.length !== 1 ? 'es' : ''} cadastrado{gestors.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Novo Gestor
        </button>
      </div>

      {showForm && (
        <div className="bg-card border rounded-xl p-6">
          <h2 className="font-semibold mb-4">Criar Novo Gestor</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-3 gap-3">
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Nome completo"
              required
            />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="email@exemplo.com"
              required
            />
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              className="border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Senha (mín. 6 caracteres)"
              required
            />
            <div className="col-span-3 flex gap-3">
              <button type="submit" disabled={saving} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Criar Gestor
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="border px-4 py-2 rounded-lg text-sm hover:bg-muted transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card border rounded-xl divide-y">
        {gestors.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Nenhum gestor cadastrado ainda</div>
        ) : (
          gestors.map((g) => (
            <div key={g.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{g.name}</p>
                <p className="text-sm text-muted-foreground">{g.email} · {formatDate(g.createdAt)}</p>
              </div>
              <button
                onClick={() => toggleActive(g)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${g.active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
              >
                {g.active ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {g.active ? 'Ativo' : 'Inativo'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
