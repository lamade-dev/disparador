import { useEffect, useState } from 'react';
import { UserPlus, Loader2, CheckCircle, XCircle, Edit2, Check, X } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';

interface Gestor {
  id: string;
  name: string;
  email: string;
  active: boolean;
  messageQuota: number;
  messagesUsed: number;
  createdAt: string;
}

export default function GestorsPage() {
  const [gestors, setGestors] = useState<Gestor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  // Quota editing
  const [editingQuota, setEditingQuota] = useState<string | null>(null);
  const [quotaValue, setQuotaValue] = useState('');

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

  function startEditQuota(gestor: Gestor) {
    setEditingQuota(gestor.id);
    setQuotaValue(String(gestor.messageQuota));
  }

  async function saveQuota(id: string) {
    const quota = parseInt(quotaValue, 10);
    if (isNaN(quota) || quota < 0) return;
    try {
      const res = await api.patch(`/users/${id}/quota`, { messageQuota: quota });
      setGestors((prev) => prev.map((g) => g.id === id ? { ...g, messageQuota: res.data.messageQuota } : g));
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Erro ao salvar cota');
    }
    setEditingQuota(null);
  }

  function cancelEditQuota() {
    setEditingQuota(null);
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
          gestors.map((g) => {
            const available = g.messageQuota > 0 ? g.messageQuota - g.messagesUsed : null;
            const usedPct = g.messageQuota > 0 ? Math.min(100, Math.round((g.messagesUsed / g.messageQuota) * 100)) : 0;

            return (
              <div key={g.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{g.name}</p>
                    <p className="text-sm text-muted-foreground">{g.email} · {formatDate(g.createdAt)}</p>
                  </div>

                  {/* Quota section */}
                  <div className="mx-6 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">Cota de disparos:</span>
                      {editingQuota === g.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={quotaValue}
                            onChange={(e) => setQuotaValue(e.target.value)}
                            className="w-20 border rounded px-2 py-0.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                            min="0"
                            autoFocus
                          />
                          <button onClick={() => saveQuota(g.id)} className="text-green-600 hover:text-green-700">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={cancelEditQuota} className="text-red-500 hover:text-red-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium">
                            {g.messageQuota === 0 ? 'Ilimitado' : g.messageQuota.toLocaleString()}
                          </span>
                          <button onClick={() => startEditQuota(g)} className="text-muted-foreground hover:text-foreground transition-colors">
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    {g.messageQuota > 0 && (
                      <>
                        <div className="w-full bg-muted rounded-full h-1.5 mb-1">
                          <div
                            className={`h-1.5 rounded-full transition-all ${usedPct >= 90 ? 'bg-red-500' : usedPct >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${usedPct}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {g.messagesUsed.toLocaleString()} usados · <span className={available! <= 0 ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>{available!.toLocaleString()} disponíveis</span>
                        </p>
                      </>
                    )}
                    {g.messageQuota === 0 && (
                      <p className="text-xs text-muted-foreground">{g.messagesUsed.toLocaleString()} usados · sem limite</p>
                    )}
                  </div>

                  <button
                    onClick={() => toggleActive(g)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${g.active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                  >
                    {g.active ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {g.active ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
