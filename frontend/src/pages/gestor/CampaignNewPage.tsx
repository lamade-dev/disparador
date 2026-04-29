import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Loader2, CheckCircle, Sparkles, X, Copy, Check, ImagePlus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';

interface ContactList { id: string; fileName: string; validCount: number; }

type Step = 1 | 2 | 3;

interface GeneratedTemplate {
  template_name: string;
  category: string;
  body: string;
  footer: string;
  button: string;
  justification: string;
}

interface MediaFile {
  base64: string;
  type: 'image' | 'video';
  fileName: string;
  sizeKB: number;
}

const MAX_SIZE_MB = 15;

export default function CampaignNewPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    contactListId: '',
    messageTemplate: '',
    intervalMin: 15,
    intervalMax: 45,
    redirectNumber: '',
  });

  const [media, setMedia] = useState<MediaFile | null>(null);
  const [mediaError, setMediaError] = useState('');

  // AI modal state
  const [showAI, setShowAI] = useState(false);
  const [aiBase, setAiBase] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<GeneratedTemplate | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get('/contacts').then((res) => setLists(res.data));
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMediaError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      setMediaError('Formato inválido. Use imagem (JPG, PNG, GIF, WebP) ou vídeo (MP4).');
      return;
    }

    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > MAX_SIZE_MB) {
      setMediaError(`Arquivo muito grande (${sizeMB.toFixed(1)} MB). Máximo: ${MAX_SIZE_MB} MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:...;base64, prefix
      const base64 = result.split(',')[1];
      setMedia({
        base64,
        type: isVideo ? 'video' : 'image',
        fileName: file.name,
        sizeKB: Math.round(file.size / 1024),
      });
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const res = await api.post('/campaigns', {
        ...form,
        redirectNumber: form.redirectNumber || undefined,
        mediaBase64: media?.base64 || undefined,
        mediaType: media?.type || undefined,
        mediaFileName: media?.fileName || undefined,
      });
      navigate(`/sessions/${res.data.id}`);
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Erro ao criar sessão');
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateAI() {
    if (!aiBase.trim()) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post('/ai/generate-template', { baseMessage: aiBase });
      setAiResult(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Erro ao gerar template');
    } finally {
      setAiLoading(false);
    }
  }

  function handleUseTemplate() {
    if (!aiResult) return;
    const full = `${aiResult.body}\n\n${aiResult.footer}`;
    setForm((p) => ({ ...p, messageTemplate: full }));
    setShowAI(false);
    setAiResult(null);
    setAiBase('');
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const canNext = () => {
    if (step === 1) return !!form.name && !!form.contactListId;
    if (step === 2) return form.messageTemplate.length >= 5;
    return true;
  };

  const steps = [
    { n: 1, label: 'Lista' },
    { n: 2, label: 'Mensagem' },
    { n: 3, label: 'Configurações' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nova Sessão</h1>
        <p className="text-muted-foreground text-sm">Configure a sessão de disparo</p>
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
              <label className="text-sm font-medium block mb-1.5">Nome da Sessão</label>
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
          <div className="space-y-4">
            {/* Texto da mensagem */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium block">Mensagem da Sessão</label>
                  <p className="text-xs text-muted-foreground mt-0.5">Use {'{nome}'} e {'{telefone}'} para personalizar.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAI(true)}
                  className="flex items-center gap-1.5 bg-violet-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-violet-700 transition-colors shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Gerar com IA
                </button>
              </div>
              <textarea
                value={form.messageTemplate}
                onChange={(e) => setForm((p) => ({ ...p, messageTemplate: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                rows={7}
                placeholder={`Olá {nome}! 👋\n\nTemos uma oferta especial para você...\n\nResponda SIM para saber mais!`}
              />
              <p className="text-xs text-muted-foreground">{form.messageTemplate.length} / 1024 caracteres</p>
            </div>

            {/* Mídia (imagem ou vídeo) */}
            <div className="border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Mídia <span className="text-muted-foreground font-normal">(opcional)</span></p>
                  <p className="text-xs text-muted-foreground mt-0.5">Imagem ou vídeo até {MAX_SIZE_MB} MB. A mensagem será usada como legenda.</p>
                </div>
                {!media && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-muted transition-colors"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    Adicionar
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4"
                className="hidden"
                onChange={handleFileChange}
              />

              {mediaError && (
                <p className="text-xs text-red-500">{mediaError}</p>
              )}

              {media && (
                <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                  {media.type === 'image' ? (
                    <img
                      src={`data:image/jpeg;base64,${media.base64}`}
                      alt="preview"
                      className="w-16 h-16 object-cover rounded-lg border"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-black/10 rounded-lg border flex items-center justify-center">
                      <span className="text-2xl">🎬</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{media.fileName}</p>
                    <p className="text-xs text-muted-foreground">{media.type === 'image' ? 'Imagem' : 'Vídeo'} · {media.sizeKB > 1024 ? `${(media.sizeKB / 1024).toFixed(1)} MB` : `${media.sizeKB} KB`}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMedia(null)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <>
            <div>
              <label className="text-sm font-medium block mb-1.5">Intervalo entre mensagens</label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Mínimo (segundos)</p>
                  <input
                    type="number" min={5} max={600}
                    value={form.intervalMin}
                    onChange={(e) => setForm((p) => ({ ...p, intervalMin: parseInt(e.target.value) || 15 }))}
                    className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Máximo (segundos)</p>
                  <input
                    type="number" min={5} max={600}
                    value={form.intervalMax}
                    onChange={(e) => setForm((p) => ({ ...p, intervalMax: parseInt(e.target.value) || 45 }))}
                    className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Intervalo aleatório entre {form.intervalMin}s e {form.intervalMax}s para parecer mais humano.</p>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">Número de Redirecionamento <span className="text-muted-foreground font-normal">(opcional)</span></label>
              <input
                value={form.redirectNumber}
                onChange={(e) => setForm((p) => ({ ...p, redirectNumber: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="5511999999999"
              />
              <p className="text-xs text-muted-foreground mt-1.5">Quando um lead responder positivamente, este número receberá uma notificação no WhatsApp.</p>
            </div>

            <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
              <p className="font-medium">Resumo da sessão</p>
              <div className="space-y-1 text-muted-foreground">
                <p>Lista: <b className="text-foreground">{lists.find((l) => l.id === form.contactListId)?.fileName}</b></p>
                <p>Contatos: <b className="text-foreground">{lists.find((l) => l.id === form.contactListId)?.validCount ?? 0}</b></p>
                <p>Intervalo: <b className="text-foreground">{form.intervalMin}–{form.intervalMax}s</b></p>
                {media && <p>Mídia: <b className="text-foreground">{media.type === 'image' ? '🖼 Imagem' : '🎬 Vídeo'} · {media.fileName}</b></p>}
                {form.redirectNumber && <p>Redirect: <b className="text-foreground">{form.redirectNumber}</b></p>}
                <p className="text-xs">As instâncias serão definidas automaticamente pelo administrador.</p>
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

        {step < 3 ? (
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
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Criar Sessão
          </button>
        )}
      </div>

      {/* AI Template Generator Modal */}
      {showAI && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-600" />
                <h2 className="font-bold text-lg">Gerar Template com IA</h2>
              </div>
              <button onClick={() => { setShowAI(false); setAiResult(null); setAiBase(''); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Descreva sua mensagem base</label>
                <p className="text-xs text-muted-foreground mb-2">Explique o produto/serviço, oferta e público-alvo. A IA criará um template aprovável pela Meta.</p>
                <textarea
                  value={aiBase}
                  onChange={(e) => setAiBase(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
                  rows={4}
                  placeholder="Ex: Vendo curso de inglês online por R$ 97 com acesso vitalício. Quero atingir adultos que precisam aprender inglês para trabalho. Promoção válida só hoje."
                />
              </div>

              <button
                onClick={handleGenerateAI}
                disabled={aiLoading || aiBase.trim().length < 10}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {aiLoading ? 'Gerando...' : 'Gerar Template'}
              </button>

              {aiResult && (
                <div className="space-y-4 border-t pt-4">
                  <p className="text-sm font-semibold text-violet-700">Template gerado ✓</p>

                  <div className="space-y-3">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Body</p>
                        <button onClick={() => handleCopy(aiResult.body)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copied ? 'Copiado' : 'Copiar'}
                        </button>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{aiResult.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">{aiResult.body.length} / 1024 caracteres</p>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-1">Footer</p>
                      <p className="text-sm text-muted-foreground">{aiResult.footer}</p>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-1">Botão CTA</p>
                      <span className="inline-block bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full font-medium">{aiResult.button}</span>
                    </div>

                    <div className="bg-violet-50 border border-violet-100 rounded-lg p-3">
                      <p className="text-xs font-semibold text-violet-700 mb-1">Justificativa da IA</p>
                      <p className="text-xs text-violet-800">{aiResult.justification}</p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => { setAiResult(null); }}
                        className="flex-1 border py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                      >
                        Gerar novamente
                      </button>
                      <button
                        onClick={handleUseTemplate}
                        className="flex-1 bg-violet-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
                      >
                        Usar esta mensagem
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
