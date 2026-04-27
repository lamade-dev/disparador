import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, XCircle, Send, CheckCheck, Reply, TrendingUp, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { formatDate, formatPhone, formatNumber } from '../../lib/utils';

interface Message {
  id: string; phone: string; name: string | null;
  status: string; sentText: string | null; sentAt: string | null;
  responseText: string | null; responseSentiment: string | null; responseAt: string | null;
}

interface Campaign {
  id: string; name: string; status: string;
  sentCount: number; deliveredCount: number; repliedCount: number; positiveCount: number;
  messageTemplate: string; intervalMin: number; intervalMax: number; redirectNumber: string | null;
  contactList: { fileName: string; validCount: number };
  messages: Message[]; total: number; createdAt: string;
}

const msgStatusColor: Record<string, string> = {
  PENDING: 'text-gray-400',
  SENT: 'text-blue-500',
  DELIVERED: 'text-green-600',
  FAILED: 'text-red-500',
};

const sentimentColor: Record<string, string> = {
  POSITIVE: 'bg-green-100 text-green-800',
  NEGATIVE: 'bg-red-100 text-red-800',
  NEUTRAL: 'bg-gray-100 text-gray-600',
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await api.get(`/campaigns/${id}`);
    setCampaign(res.data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
    const socket = getSocket();
    socket.on('campaign:stats', (data: any) => {
      if (data.campaignId === id) {
        setCampaign((prev) => prev ? { ...prev, ...data } : prev);
      }
    });
    socket.on('campaign:message', (data: any) => {
      if (data.campaignId === id) {
        setCampaign((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === data.messageId
                ? { ...m, responseSentiment: data.sentiment, responseAt: new Date().toISOString() }
                : m
            ),
          };
        });
      }
    });
    return () => { socket.off('campaign:stats'); socket.off('campaign:message'); };
  }, [id, load]);

  async function doAction(action: 'start' | 'pause' | 'cancel') {
    setActionLoading(true);
    try {
      await api.patch(`/campaigns/${id}/${action}`);
      await load();
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!campaign) return <p>Sessão não encontrada</p>;

  const progress = campaign.contactList.validCount > 0
    ? Math.round((campaign.sentCount / campaign.contactList.validCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/sessions')} className="p-2 rounded-lg border hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <p className="text-muted-foreground text-sm">{campaign.contactList.fileName} · {formatDate(campaign.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === 'DRAFT' && (
            <button disabled={actionLoading} onClick={() => doAction('start')} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Iniciar
            </button>
          )}
          {campaign.status === 'RUNNING' && (
            <button disabled={actionLoading} onClick={() => doAction('pause')} className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
              Pausar
            </button>
          )}
          {campaign.status === 'PAUSED' && (
            <button disabled={actionLoading} onClick={() => doAction('start')} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Retomar
            </button>
          )}
          {['RUNNING', 'PAUSED', 'DRAFT'].includes(campaign.status) && (
            <button disabled={actionLoading} onClick={() => { if (confirm('Cancelar esta sessão?')) doAction('cancel'); }} className="border border-destructive/30 text-destructive px-3 py-2 rounded-lg text-sm hover:bg-destructive/10 transition-colors">
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Enviadas', value: campaign.sentCount, icon: Send, color: 'text-blue-600 bg-blue-50' },
          { label: 'Entregues', value: campaign.deliveredCount, icon: CheckCheck, color: 'text-green-600 bg-green-50' },
          { label: 'Respondidas', value: campaign.repliedCount, icon: Reply, color: 'text-purple-600 bg-purple-50' },
          { label: 'Positivos', value: campaign.positiveCount, icon: TrendingUp, color: 'text-orange-600 bg-orange-50' },
        ].map((card) => (
          <div key={card.label} className="bg-card border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold">{formatNumber(card.value)}</p>
          </div>
        ))}
      </div>

      {(campaign.status === 'RUNNING' || campaign.status === 'PAUSED') && (
        <div className="bg-card border rounded-xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progresso do envio</span>
            <span className="font-medium">{formatNumber(campaign.sentCount)} / {formatNumber(campaign.contactList.validCount)} ({progress}%)</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="bg-card border rounded-xl">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Mensagens ({formatNumber(campaign.total)})</h2>
        </div>
        <div className="divide-y">
          {campaign.messages.map((msg) => (
            <div key={msg.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{msg.name ?? 'Sem nome'}</p>
                    <p className="text-xs text-muted-foreground">{formatPhone(msg.phone)}</p>
                    <span className={`text-xs font-medium ${msgStatusColor[msg.status]}`}>{msg.status}</span>
                    {msg.responseSentiment && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sentimentColor[msg.responseSentiment]}`}>
                        {msg.responseSentiment}
                      </span>
                    )}
                  </div>
                  {msg.sentText && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{msg.sentText}</p>
                  )}
                  {msg.responseText && (
                    <div className="mt-2 bg-green-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-green-800">{msg.responseText}</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground shrink-0">
                  {msg.sentAt ? formatDate(msg.sentAt) : '—'}
                </p>
              </div>
            </div>
          ))}
          {campaign.messages.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma mensagem ainda. Inicie a sessão para começar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
