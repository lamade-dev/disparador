import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Send, CheckCheck, Reply, TrendingUp, Smartphone, Plus, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { formatDate, formatNumber } from '../../lib/utils';
import { useAuthStore } from '../../store/auth.store';

interface Stats {
  totals: { sent: number; delivered: number; replied: number; positive: number };
  campaigns: Array<{
    id: string; name: string; status: string;
    sentCount: number; deliveredCount: number; repliedCount: number; positiveCount: number;
    createdAt: string; contactList: { validCount: number };
  }>;
  instances: Array<{ id: string; displayName: string; status: string; phoneNumber: string | null }>;
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

export default function DashboardPage() {
  const { user } = useAuthStore();
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

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const { totals, campaigns, instances } = stats!;

  const statCards = [
    { label: 'Enviadas', value: totals.sent, icon: Send, color: 'text-blue-600 bg-blue-50' },
    { label: 'Entregues', value: totals.delivered, icon: CheckCheck, color: 'text-green-600 bg-green-50' },
    { label: 'Respondidas', value: totals.replied, icon: Reply, color: 'text-purple-600 bg-purple-50' },
    { label: 'Leads Positivos', value: totals.positive, icon: TrendingUp, color: 'text-orange-600 bg-orange-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Bem-vindo, {user?.name}</p>
        </div>
        <Link to="/campaigns/new" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          Nova Campanha
        </Link>
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
        <div className="lg:col-span-2 bg-card border rounded-xl">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Campanhas Recentes</h2>
            <Link to="/campaigns" className="text-sm text-primary hover:underline">Ver todas</Link>
          </div>
          {campaigns.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma campanha ainda</div>
          ) : (
            <div className="divide-y">
              {campaigns.map((c) => (
                <Link key={c.id} to={`/campaigns/${c.id}`} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(c.createdAt)} · {c.contactList.validCount} contatos</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs text-muted-foreground">
                      <span className="text-foreground font-medium">{c.sentCount}</span> enviadas
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${campaignStatusColor[c.status] ?? ''}`}>
                      {c.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border rounded-xl">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Instâncias</h2>
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
                    {inst.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
