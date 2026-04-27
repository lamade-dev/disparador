import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Send, CheckCheck, Reply, TrendingUp, Smartphone, RefreshCw, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { formatDate, formatNumber } from '../../lib/utils';

interface GestorStat { id: string; name: string; email: string; sent: number; delivered: number; replied: number; positive: number; sessions: number; }
interface Campaign { id: string; name: string; status: string; sentCount: number; deliveredCount: number; repliedCount: number; positiveCount: number; createdAt: string; user: { name: string }; contactList: { validCount: number }; }
interface Instance { id: string; displayName: string; status: string; phoneNumber: string | null; }

interface Stats {
  totals: { sent: number; delivered: number; replied: number; positive: number };
  campaigns: Campaign[];
  instances: Instance[];
  gestorStats: GestorStat[];
}

const statusColor: Record<string, string> = {
  CONNECTED: 'bg-green-100 text-green-800',
  DISCONNECTED: 'bg-gray-100 text-gray-600',
  CONNECTING: 'bg-yellow-100 text-yellow-800',
  BLOCKED: 'bg-red-100 text-red-800',
};

const campaignStatusColor: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  RUNNING: 'bg-blue-100 text-blue-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const campaignStatusLabel: Record<string, string> = {
  DRAFT: 'Rascunho', RUNNING: 'Enviando', PAUSED: 'Pausada', COMPLETED: 'Concluída', CANCELLED: 'Cancelada',
};

export default function ReportPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await api.get('/dashboard/stats');
    setStats(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const socket = getSocket();
    socket.on('campaign:stats', load);
    socket.on('instance:status', load);
    return () => { socket.off('campaign:stats', load); socket.off('instance:status', load); };
  }, [load]);

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const { totals, campaigns, instances, gestorStats } = stats!;

  const statCards = [
    { label: 'Total Enviadas', value: totals.sent, icon: Send, color: 'text-blue-600 bg-blue-50' },
    { label: 'Entregues', value: totals.delivered, icon: CheckCheck, color: 'text-green-600 bg-green-50' },
    { label: 'Respondidas', value: totals.replied, icon: Reply, color: 'text-purple-600 bg-purple-50' },
    { label: 'Leads Positivos', value: totals.positive, icon: TrendingUp, color: 'text-orange-600 bg-orange-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatório Global</h1>
        <p className="text-muted-foreground text-sm">Visão consolidada de todos os gestores</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-card border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold">{formatNumber(card.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Per-gestor breakdown */}
        <div className="lg:col-span-2 bg-card border rounded-xl">
          <div className="p-4 border-b flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold">Por Gestor</h2>
          </div>
          {gestorStats.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma sessão criada ainda</div>
          ) : (
            <div className="divide-y">
              {gestorStats.map((g) => (
                <div key={g.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-sm">{g.name}</p>
                      <p className="text-xs text-muted-foreground">{g.email} · {g.sessions} sessões</p>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground shrink-0">
                      <span>Env: <b className="text-foreground">{formatNumber(g.sent)}</b></span>
                      <span>Resp: <b className="text-foreground">{formatNumber(g.replied)}</b></span>
                      <span className="text-green-600">+{formatNumber(g.positive)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instance status */}
        <div className="bg-card border rounded-xl">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold">Instâncias</h2>
            </div>
            <Link to="/instances" className="text-sm text-primary hover:underline">Gerenciar</Link>
          </div>
          {instances.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Nenhuma instância</div>
          ) : (
            <div className="divide-y">
              {instances.map((inst) => (
                <div key={inst.id} className="flex items-center gap-3 p-4">
                  <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{inst.displayName}</p>
                    <p className="text-xs text-muted-foreground">{inst.phoneNumber ?? '—'}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor[inst.status] ?? ''}`}>
                    {inst.status === 'CONNECTED' ? 'ON' : 'OFF'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent sessions across all gestors */}
      <div className="bg-card border rounded-xl">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Sessões Recentes</h2>
        </div>
        {campaigns.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma sessão ainda</div>
        ) : (
          <div className="divide-y">
            {campaigns.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.user.name} · {formatDate(c.createdAt)} · {c.contactList.validCount} contatos</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">{c.sentCount}</span> enviadas
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${campaignStatusColor[c.status] ?? ''}`}>
                    {campaignStatusLabel[c.status] ?? c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
