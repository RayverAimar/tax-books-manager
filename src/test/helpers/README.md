# Test helpers

Reusable test utilities. **Always prefer these over ad-hoc fixtures.**

## Patrón establecido

Todos los tests siguen **AAA** (Arrange / Act / Assert) y reutilizan estos helpers para minimizar duplicación.

```ts
import { aSalesInvoice, aPurchaseInvoice } from '@/test/helpers/factories';
import { buildSalesCsv, buildPurchasesCsv } from '@/test/helpers/csv';
import { resetMockDb, queueMockRows, mockHandler } from '@/test/helpers/db';
import { describeRepository } from '@/test/helpers/repository-contract';
```

## Módulos

- `factories.ts` — builders deterministas para entidades (`aSalesInvoice`, `aPurchaseInvoice`, `aCompany`, `aPeriod`). Aceptan `overrides` parciales.
- `csv.ts` — builders de filas/CSVs alineados al `field-registry`. Generan strings listos para `importSalesCSV` / `importPurchasesCSV`.
- `db.ts` — wrappers sobre el mock de `@tauri-apps/plugin-sql` definido en `src/test/setup.ts`. Permiten poner filas o un handler de queries por test.
- `repository-contract.ts` — suite reusable de comportamiento esperado en cualquier repository de facturas (sales o purchases).

## Convenciones

- Cada test file vive en `__tests__/<sibling>.test.ts` junto al código.
- `describe()` cubre una unidad pública; `it()` describe el caso en castellano corto.
- Test names empiezan con verbo: `'rechaza ...'`, `'devuelve ...'`, `'lanza ...'`.
- Datos: usar **siempre** una factory; nunca hardcodear objetos con 80 campos en línea.
- Nada de mocks ad-hoc de Tauri: vienen del setup global. Para DB, usar `db.ts`.
