import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Loader2, CheckCircle } from 'lucide-react';
import { api } from '../../lib/api';

interface ContactList { id: string; fileName: string; validCount: number; }
interface Instance { id: string; displayName: string; status: string; phoneNumber: string | null; }

type Step = 1 | 2 | 3 | 4;

export default function CampaignNewPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    contactListId: '',
    messageTemplate: '',
    instanceIds: [] as string[],
    intervalMin: 15,
    intervalMax: 45,
    redirectNumber: '',
  });

  useEffect(() => {
    Promise.all([api.get('/contacts'), api.get('/instances')]).then(([c, i]) => {
      setLists(c.data);
      setInstances(i.data.filter((inst: Instance) => inst.status === 'CONNECTED'));
    });
  }, []);

  function toggleInstance(id: string) {
    setForm((prev) => ({
      ...prev,
      instanceIds: prev.instanceIds.includes(id)
        ? prev.instanceIds.filter((i) => i !== id)
        : [...prev.instanceIds, id],
    }));
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const res = await api.post('/campaigns', form);
      navigate(`/campaigns/${res.data.id}`);
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Erro ao criar campanha');
    } finally {
      setSaving(false);
    }
  }

  const canNext = () => {
    if (step === 1) return !!form.name && !!form.contactListId;
    if (step === 2) return form.messageTemplate.length >= 5;
    if (step === 3) return form.instanceIds.length > 0;
    return true;
  };

  const steps = [
    { n: 1, label: 'Lista' },
    { n: 2, label: 'Mensagem' },
    { n: 3, label: 'Instâncias' },
    { n: 4, label: 'Configurações' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nova Campanha</h1>
        <p className="text-muted-foreground text-sm">Siga os passos para configurar sua campanha</p>
      </div>

      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${step === s.n ? 'bg-primary text-primary-foreground' : step > s.n ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
              {step > s.n ? <CheckCircle className="w-3.5 h-3.5" /> : <span>{s.n}</span>}
              {s.label}
            </div>
            {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-xl p-6 space-y-5">
        {step === 1 && (
          <>
            <div>
              <label className="text-sm font-medium block mb-1.5">Nome da Campanha</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Ex: Promoção Black Friday"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Lista de Contatos</label>
              {lists.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma lista disponível. <a href="/contacts" className="text-primary hover:underline">Faça upload de uma planilha primeiro.</a></p>
              ) : (
                <div className="space-y-2">
                  {lists.map((list) => (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, contactListId: list.id }))}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-sm transition-colors ${form.contactListId === list.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    >
                      <span className="font-medium">{list.fileName}</span>
                      <span className="text-muted-foreground">{list.validCount} contatos válidos</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <div>
            <label className="text-sm font-medium block mb-1.5">Mensagem da Campanha</label>
            <p className="text-xs text-muted-foreground mb-3">Use {'{nome}'} e {'{telefone}'} para personalizar. A IA irá variar ligeiramente cada envio para evitar bloqueios.</p>
            <textarea
              value={form.messageTemplate}
              onChange={(e) => setForm((p) => ({ ...p, messageTemplate: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              rows={8}
              placeholder={`Olá {nome}! 👋\n\nTemos uma oferta especial para você...\n\nResponda esse mensagem para saber mais!`}
            />
            <p className="text-xs text-muted-foreground mt-2">{form.messageTemplate.length} caracteres</p>
          </div>
        )}

        {step === 3 && (
          <div>
            <label className="text-sm font-medium block mb-3">Instâncias para Envio</label>
            {instances.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma instância conectada. <a href="/instances" className="text-primary hover:underline">Conecte uma instância primeiro.</a></p>
            ) : (
              <div className="space-y-2">
                {instances.map((inst) => (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => toggleInstance(inst.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-sm transition-colors ${form.instanceIds.includes(inst.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  >
                    <div className="flex items-center gap-3">
                      {form.instanceIds.includes(inst.id) ? (
                        <CheckCircle className="w-4 h-4 text-primary" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                      )}
                      <span className="font-medium">{inst.displayName}</span>
                    </div>
                    <span className="text-muted-foreground text-xs">{inst.phoneNumber ?? '—'}</span>
                  </button>
                ))}
              </div>
            )}
            {form.instanceIds.length > 1 && (
              <p className="text-xs text-muted-foreground mt-3">
                As mensagens serão intercaladas entre as {form.instanceIds.length} instâncias automaticamente.
              </p>
            )}
          </div>
        )}

        {step === 4 && (
          <>
            <div>
              <label className="text-sm font-medium block mb-1.5">Intervalo entre mensagens</label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Mínimo (segundos)</p>
                  <input
                    type="number"
                    min={5}
                    max={600}
                    value={form.intervalMin}
                    onChange={(e) => setForm((p) => ({ ...p, intervalMin: parseInt(e.target.value) || 15 }))}
                    className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Máximo (segundos)</p>
                  <input
                    type="number"
                    min={5}
                    max={600}
                    value={form.intervalMax}
                    onChange={(e) => setForm((p) => ({ ...p, intervalMax: parseInt(e.target.value) || 45 }))}
                    className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Um intervalo aleatório entre {form.intervalMin}s e {form.intervalMax}s será usado para parecer mais humano.</p>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">Número de Redirecionamento <span className="text-muted-foreground font-normal">(opcional)</span></label>
              <input
                value={form.redirectNumber}
                onChange={(e) => setForm((p) => ({ ...p, redirectNumber: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="5511999999999"
              />
              <p className="text-xs text-muted-foreground mt-1.5">Este número receberá uma notificação toda vez que um lead demonstrar interesse.</p>
            </div>

            <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
              <p className="font-medium">Resumo da campanha</p>
              <div className="space-y-1 text-muted-foreground">
                <p>Lista: <b className="text-foreground">{lists.find((l) => l.id === form.contactListId)?.fileName}</b></p>
                <p>Contatos: <b className="text-foreground">{lists.find((l) => l.id === form.contactListId)?.validCount ?? 0}</b></p>
                <p>Instâncias: <b className="text-foreground">{form.instanceIds.length}</b></p>
                <p>Intervalo: <b className="text-foreground">{form.intervalMin}–{form.intervalMax}s</b></p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setStep((s) => (s - 1) as Step)}
          disabled={step === 1}
          className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep((s) => (s + 1) as Step)}
            disabled={!canNext()}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Próximo
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={saving || !canNext()}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Criar Campanha
          </button>
        )}
      </div>
    </div>
  );
}
