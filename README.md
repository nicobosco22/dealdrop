# DealDrop

A personal deal finder: pay the least for the best stuff. Tech, house items, furniture and LEGO.

## Run it on your computer

```bash
npm run dev
```

Then open http://localhost:3000 and press **Fetch deals now**.

## Run the tests

```bash
npm test
```

## Where things are

| Folder | What it does |
| --- | --- |
| `src/sources/` | One file per data source. Each turns that source's format into our one deal shape (`types.ts`). |
| `src/jobs/` | `run-fetch.ts` runs every source; `save-deals.ts` saves deals and price history. |
| `src/db/` | The database tables (`schema.ts`) and how we open the database (`client.ts`). |
| `src/lib/` | Small helpers: reading prices (`money.ts`), sorting products into categories (`classify.ts`), reading specs (`specs.ts`). |
| `src/app/` | The web pages. |
| `drizzle/` | The SQL that creates the tables. Made by `npm run db:generate`; don't edit by hand. |
| `.data/` | Your local database. Not saved to GitHub. Delete it to start fresh. |

## Rules this app follows

- Never make up a price. If a price can't be read, the deal is skipped.
- Every deal stores its link and the time it was last checked.
- No video games. Consoles and gaming gear are tracked; the games themselves are skipped.
- Keys live in `.env.local`, never in the code. See `.env.example`.

## Build progress

- [x] Step 1: project, database, tests
- [x] Step 2: first source working end to end (CheapShark game prices; removed later, video games are not tracked)
- [x] Step 3: main screen (filters, sortable table, card view)
- [x] Step 4: categories, subcategories, spec filters
- [ ] Step 5: more sources, duplicate merging (DealNews feed done; Best Buy and eBay wait for keys)
- [x] Step 6: price history check, fake-markdown flag, deal score (uses the history DealNews reports; our own 90-day history is still building)
- [ ] Step 7: watchlist, alerts, favorites
- [ ] Step 8: put it online with a 10-minute timer
