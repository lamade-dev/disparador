import { Request, Response } from 'express';
import fs from 'fs';
import xlsx from 'xlsx';
import { parse } from 'csv-parse/sync';
import { prisma } from '../../prisma/client';
import { normalizePhone, isValidPhone } from '../../services/phone/normalizer';

interface RawRow {
  [key: string]: string;
}

function findColumn(headers: string[], candidates: string[]): string | undefined {
  return headers.find((h) => candidates.some((c) => h.toLowerCase().includes(c)));
}

function parseFile(filePath: string, originalName: string): RawRow[] {
  const ext = originalName.split('.').pop()?.toLowerCase();
  if (ext === 'csv') {
    const content = fs.readFileSync(filePath, 'utf-8');
    return parse(content, { columns: true, skip_empty_lines: true, trim: true });
  }
  const wb = xlsx.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return xlsx.utils.sheet_to_json<RawRow>(ws, { defval: '' });
}

export async function uploadContacts(req: Request, res: Response) {
  if (!req.file) { res.status(400).json({ error: 'Arquivo não enviado' }); return; }

  const rows = parseFile(req.file.path, req.file.originalname);
  fs.unlinkSync(req.file.path);

  if (rows.length === 0) { res.status(400).json({ error: 'Planilha vazia' }); return; }

  const headers = Object.keys(rows[0]);
  const phoneCol = findColumn(headers, ['telefone', 'phone', 'celular', 'fone', 'whatsapp', 'numero', 'number']);
  const nameCol = findColumn(headers, ['nome', 'name', 'cliente', 'contato']);

  if (!phoneCol) { res.status(400).json({ error: 'Coluna de telefone não encontrada' }); return; }

  const valid: Array<{ rawPhone: string; phone: string; name: string | null; extra: RawRow }> = [];
  let invalid = 0;

  for (const row of rows) {
    const raw = String(row[phoneCol] ?? '').trim();
    const normalized = normalizePhone(raw);
    if (!normalized || !isValidPhone(normalized)) { invalid++; continue; }

    const extra = { ...row };
    if (phoneCol) delete extra[phoneCol];
    if (nameCol) delete extra[nameCol];

    valid.push({ rawPhone: raw, phone: normalized, name: nameCol ? String(row[nameCol] ?? '').trim() || null : null, extra });
  }

  const list = await prisma.contactList.create({
    data: {
      userId: req.user!.sub,
      fileName: req.file.originalname,
      totalRows: rows.length,
      validCount: valid.length,
      invalidCount: invalid,
      contacts: {
        createMany: {
          data: valid.map((v) => ({ rawPhone: v.rawPhone, phone: v.phone, name: v.name, extra: v.extra })),
        },
      },
    },
    select: { id: true, fileName: true, totalRows: true, validCount: true, invalidCount: true, createdAt: true },
  });

  res.status(201).json(list);
}

export async function listContactLists(req: Request, res: Response) {
  const lists = await prisma.contactList.findMany({
    where: { userId: req.user!.sub },
    select: { id: true, fileName: true, totalRows: true, validCount: true, invalidCount: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(lists);
}

export async function getContactList(req: Request, res: Response) {
  const page = parseInt(String(req.query.page ?? '1'), 10);
  const limit = 50;

  const [list, contacts, total] = await Promise.all([
    prisma.contactList.findFirst({ where: { id: req.params.id as string, userId: req.user!.sub } }),
    prisma.contact.findMany({
      where: { contactListId: req.params.id as string },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contact.count({ where: { contactListId: req.params.id as string } }),
  ]);

  if (!list) { res.status(404).json({ error: 'Lista não encontrada' }); return; }

  res.json({ ...list, contacts, total, page, pages: Math.ceil(total / limit) });
}

export async function deleteContactList(req: Request, res: Response) {
  const list = await prisma.contactList.findFirst({ where: { id: req.params.id as string, userId: req.user!.sub } });
  if (!list) { res.status(404).json({ error: 'Lista não encontrada' }); return; }
  await prisma.contactList.delete({ where: { id: req.params.id as string } });
  res.status(204).send();
}
