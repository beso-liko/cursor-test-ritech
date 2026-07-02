# Raporte Mujore të Kostove

Përdoreni këtë dosje për të ndjekur **shpenzimet reale** kundrejt parashikimeve në [`../COST_ANALYSIS.md`](../COST_ANALYSIS.md).

## Kur të përditësohet

Një herë në muaj (java e parë e muajit), pasi të mbyllen ciklet e faturimit për OpenAI, Supabase, Pinecone, Clerk dhe Vercel.

## Shabllon: `YYYY-MM-cost-report.md`

Kopjoni bllokun më poshtë në një skedar të ri, p.sh. `2026-07-cost-report.md`.

```markdown
# Raport Kostosh StudyBuddy — YYYY-MM

**Data e raportit:** YYYY-MM-DD  
**Referencë çmimesh:** [COST_ANALYSIS.md](../COST_ANALYSIS.md) (çmimet sipas datës …)

## Përmbledhje

| Metrika | Vlera |
|---------|-------|
| Përdorues të regjistruar | |
| MAU i vlerësuar | |
| Shpenzime totale infra | $ |
| Shpenzime OpenAI | $ |
| Drejtuesi dominues i kostos | |

## Shpenzime reale nga furnizuesit

| Shërbimi | Paneli | Faturuar | vs parashikimi | Shënime |
|----------|--------|----------|----------------|---------|
| OpenAI | platform.openai.com/usage | $ | | |
| Supabase | supabase.com/dashboard → Billing | $ | | |
| Pinecone | app.pinecone.io → Usage | $ | | |
| Clerk | dashboard.clerk.com → Billing | $ | | |
| Vercel (app) | vercel.com → Usage | $ | | |
| Vercel (marketing) | | $ | | |
| Domeni | registrar | $ | | amortizim vjetor |

## Metrika përdorimi (nga aplikacioni)

| Metrika | Vlera | Burimi |
|---------|-------|--------|
| Dokumente të procesuara | | Delta numërimi Supabase `documents` |
| Ruajtje totale (GB) | | Paneli Supabase Storage |
| Numri vektorëve Pinecone | | Statistikat e indeksit Pinecone |
| Chunks mesatar për dokument | | Mesatarja kolonës `chunk_count` |
| Sesione chat-i | | Delta rreshtash `chat_sessions` |

## Kontroll kalibrimi

Krahaso **koston e matur për dokument të procesuar** me modelin:

- Supozimi i modelit: ~$0.0034/dok (pipeline i plotë, gjenerimi i parë)
- Matja këtë muaj: $____ / ____ dok = $____/dok

Nëse matja ndryshon >30%, përditësoni kostot unitare në `docs/cost-model.csv`.

## Veprime

- [ ] Alarmet e faturimit janë konfiguruar?
- [ ] Ka paralajmërime për kufij plani falas?
- [ ] Parashikimi u përditësua në COST_ANALYSIS.md?
```

## Procedura e kalibrimit (një herë ose çdo tremujor)

1. Ngarkoni **një PDF test** (~10 faqe, me tekst) përmes aplikacionit.
2. Shënoni `chunk_count` në faqen e detajeve të dokumentit.
3. Ekzekutoni përmbledhje + flashcards + kuiz një herë secilin.
4. Dërgoni 5 mesazhe chat-i.
5. Regjistroni deltën e përdorimit OpenAI nga [platform.openai.com/usage](https://platform.openai.com/usage).
6. Përditësoni rreshtat UnitCosts në [`../cost-model.csv`](../cost-model.csv).

## Screenshot-e (opsionale)

Ruani screenshot-e të anonimizuara të paneleve në këtë dosje si `YYYY-MM-openai.png`, etj., për rishikime me investitorë ose ekipin.
