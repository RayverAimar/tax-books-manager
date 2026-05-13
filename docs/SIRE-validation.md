# Validación SIRE — guía operativa

Este documento describe el flujo para validar que los archivos TXT que genera Tax Books Manager pasen las reglas de SUNAT antes de subirlos al portal SOL.

## Niveles de validación

| # | Nivel | Qué cubre | Cuándo se ejecuta |
|---|---|---|---|
| 1 | **Validador estructural in-app** (`src/shared/lib/export/sire-validator.ts`) | Conteo de columnas, headers byte-a-byte, códigos enumerados (Tabla 1/2/3), longitudes, caracteres prohibidos, RUC módulo 11, DNI, fechas, coherencia aritmética | Automático antes de cada export TXT |
| 2 | **Script de regresión** (`scripts/validate-sire-export.ts`) | Estructura de exporters vs Excel oficial | A mano: `npx tsx scripts/validate-sire-export.ts` |
| 3 | **Tests de regresión** (`src/shared/lib/export/__tests__/sire-compliance.test.ts`) | Mismas reglas estructurales, pero como tests automáticos | CI / `pnpm test` |
| 4 | **PVSIRE oficial** | Las reglas de #1-#3 + validez del CDR, CAR contra padrón, RUC contra padrón | Manual antes de cada envío a SUNAT |
| 5 | **SIRE beta** | Envío real al backend de SUNAT (ambiente de pruebas) | Antes de shipear a producción |

## Lo que valida la app (offline, sin SUNAT)

El validador `validateForSireExport` corre **antes** de generar el TXT. Si encuentra errores, **el TXT no se genera** y el usuario ve un toast con los primeros 3 errores accionables (fila + campo + mensaje).

### Errores duros (bloquean export)

- RUC no tiene 11 dígitos numéricos
- RUC no pasa módulo 11
- Período no es YYYYMM
- Fecha de emisión no es dd/mm/yyyy
- Tipo de comprobante no está en Tabla 3 SIRE
- Tipo de documento de identidad no está en Tabla 1
- DNI no tiene exactamente 8 dígitos
- RUC del tercero no es numérico
- Moneda no es código ISO de 3 letras
- Campo excede longitud máxima
- Texto libre contiene `|`, `/` o `\` (excepto fechas)

### Warnings (no bloquean pero se reportan)

- RUC del tercero no pasa módulo 11
- Moneda no está en lista común
- Fecha de emisión fuera del período declarado
- Fecha de emisión futura
- BI + IGV ≠ Total (tolerancia ±0.05)

## Flujo recomendado para shipear

```
┌──────────────────┐
│ Tu app genera    │
│ TXT (auto)       │
└────────┬─────────┘
         │ Si falla → mensaje accionable, no se escribe archivo
         ▼
┌──────────────────┐
│ Validador in-app │  ✅ <1s, ~80% de cobertura PVSIRE
│ (automático)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ PVSIRE oficial   │  Valida CDR, padrón RUC, CAR, etc.
│ (offline)        │  → Genera ZIP firmado listo para SOL
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ SIRE beta (SOL)  │  Envío real al ambiente de pruebas
│                  │
└──────────────────┘
```

## Cómo validar con PVSIRE

PVSIRE (Programa Validador SIRE) es el único validador 100% oficial. Es offline pero requiere login SOL.

### Descarga

1. Ir a https://cpe.sunat.gob.pe/programa-validador-sire-pvsire
2. Descargar **Módulo 72 — Programa Validador SIRE** desde https://www2.sunat.gob.pe/pdt/pdtdown/independientes/independientes.htm
3. Descomprimir `PVSIRE.zip` y ejecutar

### Validación

1. Generar TXT desde la app (Export → TXT). El nombre será del tipo `LE20131312955202401001404000211112.TXT`.
2. Abrir PVSIRE → Login SOL con RUC + usuario + clave
3. Cargar el TXT → "Validar"
4. PVSIRE retorna:
   - ✅ **Sin errores** → genera ZIP firmado, listo para subir a SOL
   - ❌ **Errores** → lista detallada con código de error + fila + campo

### Si PVSIRE rechaza algo que el validador in-app aceptó

PVSIRE es el source of truth operacional. Si detecta algo nuevo:

1. Anotar el código de error y campo
2. Reproducirlo con datos sintéticos en `src/shared/lib/export/__tests__/sire-validator.test.ts` (test que falle)
3. Agregar la regla a `sire-validator.ts`
4. Confirmar que el test pase
5. Reconfirmar con PVSIRE

Esto cierra el feedback loop entre la app y la verdad operacional.

## Manual del PVSIRE

https://www2.sunat.gob.pe/orientacion/librosRegistros-Electronicos/descarga2/migeLibros/manuales/ManualUsuarioPVSIRE.pdf

Contiene la tabla completa de códigos de error que devuelve el validador, útil para mapearlos a mejoras del validador in-app.

## Limitaciones conocidas

- **Campo "ID" (RVIE pos 2)**: SIRE espera un identificador alfanumérico hasta 1500 chars. Hoy la app mapea `businessName` ahí por compatibilidad. PVSIRE puede aceptarlo o requerir un ID diferente — pendiente confirmar.
- **CAR SUNAT**: el validador in-app no verifica que el CAR exista en el padrón SUNAT (solo formato). Solo PVSIRE puede validarlo.
- **Estructura RCE pos 38-41**: la app emite vacío (correcto per Excel oficial). Si PVSIRE pidiera algún valor específico, ajustar `field-registry.ts`.
