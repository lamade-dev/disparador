import { useEffect, useState } from 'react';
import { Loader2, Save, Settings, Users, Zap } from 'lucide-react';
import { api } from '../../lib/api';

interface Settings {
  defaultMessageQuota: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [defaultQuota, setDefaultQuota] = useState('');

  useEffect(() => {
    api.get('/settings').then((res) => {
      setSettings(res.data);
      setDefaultQuota(String(res.data.defaultMessageQuota));
      setLoading(false);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const res = await api.put('/settings', {
        defaultMessageQuota: parseInt(defaultQuota, 10) || 0,
      });
      setSettings(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Configurações Gerais
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie as configurações globais da plataforma</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* New accounts quota */}
        <div className="bg-card border rounded-xl p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="font-semibold">Cota Padrão para Novas Contas</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Quantidade de disparos liberados automaticamente quando um gestor cria uma conta.
                Use <strong>0</strong> para acesso ilimitado por padrão.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium block mb-1.5">Disparos por nova conta</label>
              <div className="relative">
                <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="number"
                  min="0"
                  value={defaultQuota}
                  onChange={(e) => setDefaultQuota(e.target.value)}
                  className="w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  placeholder="0 = ilimitado"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {parseInt(defaultQuota, 10) === 0 || !defaultQuota
                  ? '⚡ Novas contas terão acesso ilimitado'
                  : `⚡ Novas contas receberão ${parseInt(defaultQuota, 10).toLocaleString()} disparos ao se cadastrar`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Configurações
          </button>
          {saved && (
            <span className="text-sm text-green-600 font-medium">✓ Salvo com sucesso</span>
          )}
        </div>
      </form>
    </div>
  );
}
