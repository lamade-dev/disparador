import { useEffect, useState } from 'react';
import { Plus, Smartphone, RefreshCw, Trash2, Power, QrCode, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { cn } from '../../lib/utils';

interface Instance {
  id: string; displayName: string; phoneNumber: string | null;
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'BLOCKED'; createdAt: string;
}

const statusColor: Record<string, string> = {
  CONNECTED: 'bg-green-100 text-green-800',
  DISCONNECTED: 'bg-gray-100 text-gray-600',
  CONNECTING: 'bg-yellow-100 text-yellow-800',
  BLOCKED: 'bg-red-100 text-red-800',
};

const statusLabel: Record<string, string> = {
  CONNECTED: 'Conectado', DISCONNECTED: 'Desconectado',
  CONNECTING: 'Conectando', BLOCKED: 'Bloqueado',
};

export default function MasterInstancesPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [qrModal, setQrModal] = useState<{ instanceId: string; base64: string } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  async function load() {
    const res = await api.get('/instances');
    setInstances(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const socket = getSocket();
    socket.on('instance:status', (data: { instanceId: string; status: string }) => {
      setInstances((prev) => prev.map((inst) =>
        inst.id === data.instanceId ? { ...inst, status: data.status as any } : inst
      ));
    });
    return () => { socket.off('instance:status'); };
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post('/instances', { displayName: newName });
      setInstances((prev) => [res.data, ...prev]);
      setNewName('');
      setShowForm(false);
      await showQrCode(res.data.id);
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Erro ao criar instância');
    } finally {
      setCreating(false);
    }
  }

  async function showQrCode(id: string) {
    setQrLoading(true);
    setQrModal({ instanceId: id, base64: '' });
    try {
      const res = await api.get(`/instances/${id}/qrcode`);
      setQrModal({ instanceId: id, base64: res.data.base64 });
    } catch {
      setQrModal(null);
      alert('Não foi possível obter o QR Code. Tente novamente.');
    } finally {
      setQrLoading(false);
    }
  }

  async function handleDisconnect(id: string) {
    await api.post(`/instances/${id}/disconnect`);
    setInstances((prev) => prev.map((inst) => inst.id === id ? { ...inst, status: 'DISCONNECTED' } : inst));
  }

  async function handleDelete(id: string) {
    if (!confirm('Deletar esta instância?')) return;
    await api.delete(`/instances/${id}`);
    setInstances((prev) => prev.filter((inst) => inst.id !== id));
  }

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Instâncias WhatsApp</h1>
          <p className="text-muted-foreground text-sm">Números compartilhados entre todos os gestores</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Instância
        </button>
      </div>

      {showForm && (
        <div className="bg-card border rounded-xl p-6">
          <h2 className="font-semibold mb-4">Nova Instância</h2>
          <form onSubmit={handleCreate} className="flex gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Nome da instância (ex: Vendas Principal)"
              required
            />
            <button
              type="submit"
              disabled={creating}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar e Conectar
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-muted transition-colors">
              Cancelar
            </button>
          </form>
        </div>
      )}

      {instances.length === 0 ? (
        <div className="bg-card border rounded-xl p-12 text-center">
          <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-medium">Nenhuma instância cadastrada</p>
          <p className="text-sm text-muted-foreground mt-1">Crie instâncias para que os gestores possam enviar mensagens</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {instances.map((inst) => (
            <div key={inst.id} className="bg-card border rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', inst.status === 'CONNECTED' ? 'bg-green-50' : 'bg-muted')}>
                    <Smartphone className={cn('w-5 h-5', inst.status === 'CONNECTED' ? 'text-green-600' : 'text-muted-foreground')} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{inst.displayName}</p>
                    <p className="text-xs text-muted-foreground">{inst.phoneNumber ?? 'Sem número'}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor[inst.status]}`}>
                  {statusLabel[inst.status]}
                </span>
              </div>

              <div className="flex gap-2">
                {inst.status !== 'CONNECTED' && (
                  <button onClick={() => showQrCode(inst.id)} className="flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors">
                    <QrCode className="w-3.5 h-3.5" />
                    QR Code
                  </button>
                )}
                {inst.status === 'CONNECTED' && (
                  <button onClick={() => handleDisconnect(inst.id)} className="flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors">
                    <Power className="w-3.5 h-3.5" />
                    Desconectar
                  </button>
                )}
                <button onClick={() => handleDelete(inst.id)} className="flex items-center gap-1.5 text-xs border border-destructive/30 text-destructive rounded-lg px-3 py-1.5 hover:bg-destructive/10 transition-colors ml-auto">
                  <Trash2 className="w-3.5 h-3.5" />
                  Deletar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {qrModal !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
            <h2 className="font-bold text-lg mb-2">Escanear QR Code</h2>
            <p className="text-sm text-muted-foreground mb-6">Abra o WhatsApp {'>'} Aparelhos conectados {'>'} Conectar aparelho</p>
            {qrLoading || !qrModal.base64 ? (
              <div className="w-64 h-64 mx-auto flex items-center justify-center bg-muted rounded-xl">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <img src={qrModal.base64} alt="QR Code" className="w-64 h-64 mx-auto rounded-xl" />
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={() => showQrCode(qrModal.instanceId)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-muted transition-colors">
                Atualizar
              </button>
              <button onClick={() => setQrModal(null)} className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
