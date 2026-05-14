import { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Users, Trash2, FileSpreadsheet, CheckCircle, XCircle, Loader2, Download } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate, formatNumber } from '../../lib/utils';

function downloadTemplate() {
  const csv = [
    'telefone,nome',
    '11999999999,João Silva',
    '21988888888,Maria Santos',
    '31977777777,Carlos Oliveira',
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modelo_contatos.csv';
  a.click();
  URL.revokeObjectURL(url);
}

interface ContactList {
  id: string; fileName: string; totalRows: number;
  validCount: number; invalidCount: number; createdAt: string;
}

export default function ContactsPage() {
  const [lists, setLists] = useState<ContactList[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ContactList | null>(null);

  useEffect(() => {
    api.get('/contacts').then((res) => { setLists(res.data); setLoading(false); });
  }, []);

  const onDrop = useCallback(async (files: File[]) => {
    if (!files[0]) return;
    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', files[0]);

    try {
      const res = await api.post('/contacts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadResult(res.data);
      setLists((prev) => [res.data, ...prev]);
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Erro ao processar arquivo');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  async function handleDelete(id: string) {
    if (!confirm('Deletar esta lista de contatos?')) return;
    await api.delete(`/contacts/${id}`);
    setLists((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Listas de Contatos</h1>
          <p className="text-muted-foreground text-sm">Faça upload de planilhas Excel ou CSV com seus leads</p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
        >
          <Download className="w-4 h-4" />
          Baixar modelo de planilha
        </button>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="font-medium">Processando planilha...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-10 h-10 text-muted-foreground" />
            <div>
              <p className="font-medium">{isDragActive ? 'Solte o arquivo aqui' : 'Arraste e solte sua planilha'}</p>
              <p className="text-sm text-muted-foreground mt-1">ou clique para selecionar · Excel (.xlsx, .xls) ou CSV</p>
            </div>
            <p className="text-xs text-muted-foreground">A planilha deve ter colunas de telefone e, opcionalmente, nome</p>
          </div>
        )}
      </div>

      {uploadResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="font-medium text-green-800">Upload realizado com sucesso!</p>
              <p className="text-sm text-green-700">
                {formatNumber(uploadResult.validCount)} contatos válidos · {formatNumber(uploadResult.invalidCount)} ignorados
              </p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : lists.length === 0 ? (
        <div className="bg-card border rounded-xl p-12 text-center">
          <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-medium">Nenhuma lista importada ainda</p>
        </div>
      ) : (
        <div className="bg-card border rounded-xl divide-y">
          <div className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Listas Importadas
          </div>
          {lists.map((list) => (
            <div key={list.id} className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{list.fileName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(list.createdAt)}</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">{formatNumber(list.validCount)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <XCircle className="w-4 h-4" />
                  <span>{formatNumber(list.invalidCount)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{formatNumber(list.totalRows)} total</span>
                </div>
              </div>
              <button onClick={() => handleDelete(list.id)} className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
