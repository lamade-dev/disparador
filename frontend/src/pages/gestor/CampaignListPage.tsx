import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MessageSquare, Loader2, Play, Pause, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate, formatNumber } from '../../lib/utils';

interface Campaign {
  id: string; name: string; status: string;
  sentCount: number; deliveredCount: number; repliedCount: number; positiveCount: number;
  createdAt: string; contactList: { fileName: string; validCount: number };
}

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-gray-100 text-gray-600' },
  RUNNING: { label: 'Enviando', color: 'bg-blue-100 text-blue-800' },
  PAUSED: { label: 'Pausada', color: 'bg-yellow-100 text-yellow-800' },
  COMPLETED: { label: 'Concluída', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-800' },
};

export default function CampaignListPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/campaigns').then((res) => { setCampaigns(res.data); setLoading(false); });
  }, []);

  async function handleAction(id: string, action: 'start' | 'pause' | 'cancel') {
    await api.patch(`/campaigns/${id}/${action}`);
    const res = await api.get('/campaigns');
    setCampaigns(res.data);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campanhas</h1>
          <p className="text-muted-foreground text-sm">{campaigns.length} campanha{campaigns.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/campaigns/new" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          Nova Campanha
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-card border rounded-xl p-12 text-center">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-medium">Nenhuma campanha ainda</p>
          <Link to="/campaigns/new" className="text-sm text-primary hover:underline mt-2 inline-block">Criar primeira campanha</Link>
        </div>
      ) : (
        <div className="bg-card border rounded-xl divide-y">
          {campaigns.map((c) => {
            const sc = statusConfig[c.status] ?? statusConfig.DRAFT;
            const progress = c.contactList.validCount > 0 ? Math.round((c.sentCount / c.contactList.validCount) * 100) : 0;
            return (
              <div key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link to={`/campaigns/${c.id}`} className="font-semibold hover:text-primary transition-colors">
                        {c.name}
                      </Link>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.contactList.fileName} · {formatDate(c.createdAt)}</p>

                    {(c.status === 'RUNNING' || c.status === 'PAUSED') && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{formatNumber(c.sentCount)} de {formatNumber(c.contactList.validCount)}</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Enviadas: <b className="text-foreground">{formatNumber(c.sentCount)}</b></span>
                      <span>Entregues: <b className="text-foreground">{formatNumber(c.deliveredCount)}</b></span>
                      <span>Respostas: <b className="text-foreground">{formatNumber(c.repliedCount)}</b></span>
                      <span>Positivos: <b className="text-green-600">{formatNumber(c.positiveCount)}</b></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {c.status === 'DRAFT' && (
                      <button onClick={() => handleAction(c.id, 'start')} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors">
                        <Play className="w-3.5 h-3.5" /> Iniciar
                      </button>
                    )}
                    {c.status === 'RUNNING' && (
                      <button onClick={() => handleAction(c.id, 'pause')} className="flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-muted transition-colors">
                        <Pause className="w-3.5 h-3.5" /> Pausar
                      </button>
                    )}
                    {c.status === 'PAUSED' && (
                      <button onClick={() => handleAction(c.id, 'start')} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors">
                        <Play className="w-3.5 h-3.5" /> Retomar
                      </button>
                    )}
                    {['RUNNING', 'PAUSED', 'DRAFT'].includes(c.status) && (
                      <button onClick={() => handleAction(c.id, 'cancel')} className="border border-destructive/30 text-destructive px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-destructive/10 transition-colors">
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
