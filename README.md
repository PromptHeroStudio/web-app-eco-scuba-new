# ECO SCUBA

ECO SCUBA je v1 radni prostor za KVS „S.C.U.B.A.“ Sarajevo: učitava javni poziv, strukturira podatke projekta, provjerava budžet i usklađenost, te priprema paket editabilnih DOCX/XLSX/PDF dokumenata.

## Trenutna verzija

- Model podataka i Zod validacija nalaze se u `lib/proposal-model.ts`.
- Deterministički validatori blokiraju paket dok nedostajuća polja, budžet ili usklađenost nisu riješeni.
- Node route `POST /api/generate` koristi generatore u `lib/document-generators.ts`.
- Zlatni BH Pošta fixture je u `test/fixtures/bh-posta-2026/`.
- UI v1 je fokusiran na dva ekrana: ulazne podatke i generisanje/preview paketa.

Generisanje iz realnog Anthropic API-ja i trajna Supabase pohrana su sljedeći korak nakon potvrde modela i fixture-a; API ključevi se ne čuvaju u repozitoriju.

## Razvoj

```bash
pnpm dev
pnpm test
pnpm build
```
