import { useEffect, useState } from 'react';
import { Settings2, Loader2, CheckCircle, Shuffle, Target } from 'lucide-react';
import { api } from '../../lib/api';

interface Instance { id: string; displayName: string; phoneNumber: string | null; status: string; }
interface Config { mode: 'ALL' | 'SPECIFIC'; specificInstanceId: string | null; }

export default function DispatchConfigPage() {
  const [config, setConfig] = useState<Config>({ mode: 'ALL', specificInstanceId: null });
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/dispatch-config'),
      api.get('/instances'),
    ]).then(([cfg, inst]) => {
      setConfig(cfg.data);
      setInstances(inst.data);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await api.put('/dispatch-config', config);
      setConfig(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  }

  const connectedInstances = instances.filter((i) => i.status === 'CONNECTED');

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuração de Disparo</h1>
        <p className="text-muted-foreground text-sm">Defina como as instâncias serão usadas para enviar mensagens</p>
      </div>

      <div className="bg-card border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Modo de Disparo
        </h2>

        <div className="space-y-3">
          <button
            onClick={() => setConfig((c) => ({ ...c, mode: 'ALL' }))}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-colors ${config.mode === 'ALL' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${config.mode === 'ALL' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              <Shuffle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Todas as Instâncias</p>
              <p className="text-sm text-muted-foreground">As mensagens são distribuídas entre todas as instâncias conectadas em round-robin</p>
            </div>
            {config.mode === 'ALL' && <CheckCircle className="w-5 h-5 text-primary shrink-0" />}
          </button>

          <button
            onClick={() => setConfig((c) => ({ ...c, mode: 'SPECIFIC' }))}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-colors ${config.mode === 'SPECIFIC' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${config.mode === 'SPECIFIC' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              <Target className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Instância Específica</p>
              <p className="text-sm text-muted-foreground">Todas as mensagens são enviadas por uma única instância definida</p>
            </div>
            {config.mode === 'SPECIFIC' && <CheckCircle className="w-5 h-5 text-primary shrink-0" />}
          </button>
        </div>

        {config.mode === 'SPECIFIC' && (
          <div className="pt-2">
            <label className="text-sm font-medium block mb-2">Selecione a Instância</label>
            {connectedInstances.length === 0 ? (
              <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
                Nenhuma instância conectada. Conecte uma instância primeiro em <b>Instâncias</b>.
              </p>
            ) : (
              <div className="space-y-2">
                {instances.map((inst) => (
                  <button
                    key={inst.id}
                    disabled={inst.status !== 'CONNECTED'}
                    onClick={() => setConfig((c) => ({ ...c, specificInstanceId: inst.id }))}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${config.specificInstanceId === inst.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  >
                    <div className="flex items-center gap-3">
                      {config.specificInstanceId === inst.id
                        ? <CheckCircle className="w-4 h-4 text-primary" />
                        : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                      }
                      <span className="font-medium">{inst.displayName}</span>
                      <span className="text-muted-foreground">{inst.phoneNumber ?? '—'}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${inst.status === 'CONNECTED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {inst.status === 'CONNECTED' ? 'Conectado' : 'Desconectado'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {config.mode === 'ALL' && connectedInstances.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <b className="text-foreground">{connectedInstances.length}</b> instância{connectedInstances.length !== 1 ? 's' : ''} conectada{connectedInstances.length !== 1 ? 's' : ''} disponível{connectedInstances.length !== 1 ? 'eis' : ''} para disparo.
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || (config.mode === 'SPECIFIC' && !config.specificInstanceId)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Salvar Configuração
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            Salvo com sucesso
          </span>
        )}
      </div>
    </div>
  );
}
