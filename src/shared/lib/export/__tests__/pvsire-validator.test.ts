/**
 * Tests del validador PVSIRE-parity contra los códigos de error esperados
 * del JAR original (ValidacionParametricoRVIE.java).
 *
 * Cada test verifica que el comportamiento coincide byte-a-byte con PVSIRE 1.7.0.
 */
import { describe, it, expect } from 'vitest';
import {
  validaRucDeclarante,
  validaIdRazonSocial,
  validaPeriodo,
  validaFechaEmision,
  validaTipoComprobante,
  validaNumSerie,
  validaNumCP,
  validaTipoDocIdentidad,
  validaNumDocIdentidad,
  validaMoneda,
  validaTipoCambio,
  validaExpresion,
  validarDecimales,
  validarFormatoMonto,
  isValidDate,
  isZeroDecimal,
  getCodigoTipoDoc,
  validaValorMtoExonerado,
  validaValorMtoInafecto,
  validaValorISC,
  validaValorBIGravIVAP,
  validaValorIVAP,
  validaValorICBPER,
  validaValorOtrosTributos,
  validaValorTotalCP,
  validaValorFacturadoExportacion,
  validaValorBIGravada,
  validaValorIGVIPM,
  validaValorDsctoBI,
  validaValorDsctoIGVIPM,
  validaCLU,
  validaIdProyecto,
  validaFechaEmisionModUni,
  validaFechaEmisionMod,
  validaTipoCpModUni,
  validaTipoCpMod,
  validaNumSerieModUni,
  validaNumSerieMod,
  validaNumCPModUni,
  validaNumCPMod,
  validaCAR,
  validaTipoComprobanteRCE,
  validaCodDam,
  validaClasifBssSss,
  validaPorcPart,
  validaIMB,
  validaCAROrig,
  validaDetraccion,
  validaCodTipoNota,
  validaCodEstCDP,
  validaAnioEmisionRCE,
  validaNumSerieRCE,
  validaNumCPRCE,
  validaValorBIGravadaRCE,
  validaValorIGVIPMDG,
  validaValorBIGravadaDGNG,
  validaValorIGVIPMDGNG,
  validaValorBIGravadaDNG,
  validaValorIGVIPMDNG,
  validaValorAdqNG,
  validaValorISCRCE,
  validaValorICBPERRCE,
  validaValorOtrosTribRCE,
  validaValorTotalCPRCE,
  validaPeriodoRCE,
  validaFechaEmisionRCE,
  validaInconsistencia,
  validaRucDeclaranteRCE,
  validaIdRazonSocialRCE,
  validaMonedaRCE,
  validaTipoCambioRCE,
  validaFechaVencimientoRCE,
  validaNroFinalRCE,
  validaTipoDocIdentidadRCE,
  validaNumDocIdentidadRCE,
  validaRazonSocialClienteRCE,
  validaFechaEmisionModRCE,
  validaTipoCPModRCE,
  validaNumSerieCPModRCE,
  validaNumCPModRCE
} from '../pvsire-validator';
import {
  PVSIRE_ERROR_CODES,
  PVSIRE_AMOUNT_ERROR_CODES,
  PVSIRE_RCE_ERROR_CODES,
  PVSIRE_RCE_MOD_ERROR_CODES
} from '@/shared/constants/pvsire-rules';

const E = { ...PVSIRE_ERROR_CODES, ...PVSIRE_AMOUNT_ERROR_CODES };
const ERCE = PVSIRE_RCE_ERROR_CODES;
const EMOD = PVSIRE_RCE_MOD_ERROR_CODES;

describe('validaRucDeclarante', () => {
  it('vacío → 201', () => {
    expect(validaRucDeclarante('', '20131312955')).toBe(E.VACIO);
    expect(validaRucDeclarante(null, '20131312955')).toBe(E.VACIO);
  });
  it('longitud != 11 → 202', () => {
    expect(validaRucDeclarante('123', '20131312955')).toBe(E.LONGITUD_INCORRECTA);
    expect(validaRucDeclarante('201313129551', '20131312955')).toBe(E.LONGITUD_INCORRECTA);
  });
  it('no numérico → 203', () => {
    expect(validaRucDeclarante('2013131295A', '20131312955')).toBe(E.REGEX_FALLA);
  });
  it('no coincide con declarante → 225', () => {
    expect(validaRucDeclarante('20131312955', '10719887304')).toBe(E.RUC_NO_COINCIDE_DECLARANTE);
  });
  it('válido y coincide → 0', () => {
    expect(validaRucDeclarante('20131312955', '20131312955')).toBe(E.OK);
  });
});

describe('validaIdRazonSocial', () => {
  it('vacío → 201', () => {
    expect(validaIdRazonSocial('')).toBe(E.VACIO);
  });
  it('longitud > 1500 → 202', () => {
    expect(validaIdRazonSocial('X'.repeat(1501))).toBe(E.LONGITUD_INCORRECTA);
  });
  it('válido → 0', () => {
    expect(validaIdRazonSocial('EMPRESA EJEMPLO SAC')).toBe(E.OK);
  });
});

describe('validaPeriodo', () => {
  it('vacío → 201', () => {
    expect(validaPeriodo('', '202501')).toBe(E.VACIO);
  });
  it('longitud != 6 → 202', () => {
    expect(validaPeriodo('20251', '202501')).toBe(E.LONGITUD_INCORRECTA);
  });
  it('mes inválido → 204', () => {
    expect(validaPeriodo('202513', '202513')).toBe(E.REGEX_PERIODO);
  });
  it('no coincide con período del libro → 205', () => {
    expect(validaPeriodo('202501', '202502')).toBe(E.PERIODO_NO_COINCIDE);
  });
  it('válido → 0', () => {
    expect(validaPeriodo('202501', '202501')).toBe(E.OK);
  });
});

describe('validaFechaEmision', () => {
  it('vacío → 201', () => {
    expect(validaFechaEmision('', null, '202501', '01')).toBe(E.VACIO);
  });
  it('longitud != 10 → 202', () => {
    expect(validaFechaEmision('1/1/2025', null, '202501', '01')).toBe(E.LONGITUD_INCORRECTA);
  });
  it('fecha calendario inválida → 206', () => {
    expect(validaFechaEmision('32/01/2025', null, '202501', '01')).toBe(E.FECHA_INVALIDA);
  });
  it('fecha menor al período → 207', () => {
    expect(validaFechaEmision('15/12/2024', null, '202501', '01')).toBe(E.FECHA_MENOR_PERIODO);
  });
  it('fecha mayor al período → 208', () => {
    expect(validaFechaEmision('15/02/2025', null, '202501', '01')).toBe(E.FECHA_MAYOR_PERIODO);
  });
  it('fecha dentro del período → 0', () => {
    expect(validaFechaEmision('15/01/2025', null, '202501', '01')).toBe(E.OK);
  });
});

describe('validaTipoComprobante', () => {
  it('vacío → 201', () => {
    expect(validaTipoComprobante('', false)).toBe(E.VACIO);
  });
  it('longitud != 2 → 202', () => {
    expect(validaTipoComprobante('1', false)).toBe(E.LONGITUD_INCORRECTA);
  });
  it('no numérico → 203', () => {
    expect(validaTipoComprobante('AA', false)).toBe(E.REGEX_FALLA);
  });
  it('código no oficial → 211', () => {
    expect(validaTipoComprobante('99', false)).toBe(E.TIPO_CP_NO_EN_LISTA);
  });
  it('código válido (01 factura) → 0', () => {
    expect(validaTipoComprobante('01', false)).toBe(E.OK);
  });
  it('código 64 no es "incluido"', () => {
    expect(validaTipoComprobante('64', true)).toBe(E.TIPO_CP_NO_EN_LISTA);
  });
});

describe('validaNumSerie', () => {
  it('factura electrónica serie F001 → 0', () => {
    expect(validaNumSerie('F001', '01', false)).toBe(E.OK);
  });
  it('factura serie contingencia 0001 (4 dígitos) → 0', () => {
    expect(validaNumSerie('0001', '01', false)).toBe(E.OK);
  });
  it('factura serie B001 (boleta) → 213 regex falla', () => {
    expect(validaNumSerie('B001', '01', false)).toBe(E.SERIE_REGEX);
  });
  it('boleta serie B001 → 0', () => {
    expect(validaNumSerie('B001', '03', false)).toBe(E.OK);
  });
  it('boleta serie EB01 (electrónica) → 0', () => {
    expect(validaNumSerie('EB01', '03', false)).toBe(E.OK);
  });
  it('serie con longitud incorrecta → 212', () => {
    expect(validaNumSerie('F01', '01', false)).toBe(E.SERIE_LONGITUD);
  });
});

describe('validaNumCP', () => {
  it('numCP factura 8 dígitos → 0', () => {
    expect(validaNumCP('00000001', 'F001', '01', false)).toBe(E.OK);
  });
  it('numCP longitud excedida → 215', () => {
    expect(validaNumCP('123456789', 'F001', '01', false)).toBe(E.NUMCP_LONGITUD);
  });
  it('numCP cero → 216', () => {
    expect(validaNumCP('00000000', 'F001', '01', false)).toBe(E.NUMCP_REGEX);
  });
  it('numCP no numérico → 216', () => {
    expect(validaNumCP('ABCDEFG1', 'F001', '01', false)).toBe(E.NUMCP_REGEX);
  });
  it('liquidación de compras serie E001 acepta hasta 8 dígitos', () => {
    expect(validaNumCP('12345678', 'E001', '04', false)).toBe(E.OK);
  });
  it('liquidación de compras serie LXXX acepta hasta 7 dígitos', () => {
    expect(validaNumCP('1234567', 'L001', '04', false)).toBe(E.OK);
    expect(validaNumCP('12345678', 'L001', '04', false)).toBe(E.NUMCP_REGEX);
  });
});

describe('validaTipoDocIdentidad', () => {
  const args = {
    tipoCP: '01',
    tipoCPMod: '',
    valFacExp: '0.00',
    valTotal: '1000.00',
    nroFinal: '',
    isIncluido: false
  };
  it('factura sin doc identidad (total >= 700) → 201 obligatorio', () => {
    expect(
      validaTipoDocIdentidad(
        '',
        args.tipoCP,
        args.tipoCPMod,
        args.valFacExp,
        args.valTotal,
        args.nroFinal,
        args.isIncluido
      )
    ).toBe(E.VACIO);
  });
  const call = (td: string) =>
    validaTipoDocIdentidad(
      td,
      args.tipoCP,
      args.tipoCPMod,
      args.valFacExp,
      args.valTotal,
      args.nroFinal,
      args.isIncluido
    );
  it('doc identidad inválido → 223', () => {
    expect(call('Z')).toBe(E.TIPO_DOC_NO_EN_LISTA);
  });
  it('doc identidad 6=RUC válido → 0', () => {
    expect(call('6')).toBe(E.OK);
  });
  it('tipo 00 (otros) acepta doc identidad opcional', () => {
    expect(validaTipoDocIdentidad('', '00', '', '0.00', '1000.00', '', false)).toBe(E.OK);
  });
});

describe('validaNumDocIdentidad', () => {
  it('RUC (tipo 6) con módulo 11 inválido → 238', () => {
    expect(validaNumDocIdentidad('20000000000', '6', '01', false)).toBe(E.RUC_MOD11_INVALIDO);
  });
  it('RUC válido (módulo 11) → 0', () => {
    expect(validaNumDocIdentidad('20131312955', '6', '01', false)).toBe(E.OK);
  });
  it('DNI (tipo 1) 8 dígitos → 0', () => {
    expect(validaNumDocIdentidad('12345678', '1', '01', false)).toBe(E.OK);
  });
  it('DNI con != 8 dígitos → 202', () => {
    expect(validaNumDocIdentidad('1234567', '1', '01', false)).toBe(E.LONGITUD_INCORRECTA);
  });
  it('RUC alfa → 203', () => {
    expect(validaNumDocIdentidad('2013131295A', '6', '01', false)).toBe(E.REGEX_FALLA);
  });
});

describe('validaMoneda', () => {
  it('vacío → 201', () => {
    expect(validaMoneda('')).toBe(E.VACIO);
  });
  it('longitud != 3 → 202', () => {
    expect(validaMoneda('PE')).toBe(E.LONGITUD_INCORRECTA);
  });
  it('código no en lista ISO → 203', () => {
    expect(validaMoneda('XYZ')).toBe(E.REGEX_FALLA);
  });
  it('PEN → 0', () => {
    expect(validaMoneda('PEN')).toBe(E.OK);
  });
});

describe('validaTipoCambio', () => {
  it('moneda contabilidad con TC con valor → 229', () => {
    expect(validaTipoCambio('1.000', 'PEN', 'PEN')).toBe(E.TC_NO_DEBE_TENER_VALOR);
  });
  it('moneda extranjera sin TC → 201', () => {
    expect(validaTipoCambio('', 'USD', 'PEN')).toBe(E.VACIO);
  });
  it('moneda extranjera con TC correcto (5 chars) → 0', () => {
    expect(validaTipoCambio('3.800', 'USD', 'PEN')).toBe(E.OK);
  });
  it('TC con longitud incorrecta → 202', () => {
    expect(validaTipoCambio('3.8', 'USD', 'PEN')).toBe(E.LONGITUD_INCORRECTA);
  });
});

describe('validaExpresion (patterns)', () => {
  it('FACT1 acepta E001', () => {
    expect(validaExpresion('E001', 'FACT1')).toBe(true);
  });
  it('FACT1 acepta F001', () => {
    expect(validaExpresion('F001', 'FACT1')).toBe(true);
  });
  it('FACT1 acepta 4 dígitos contingencia', () => {
    expect(validaExpresion('0001', 'FACT1')).toBe(true);
  });
  it('FACT1 rechaza B001', () => {
    expect(validaExpresion('B001', 'FACT1')).toBe(false);
  });
  it('FACT2 acepta EB01 (boleta electrónica)', () => {
    expect(validaExpresion('EB01', 'FACT2')).toBe(true);
  });
  it('FACT7 rechaza serie todo ceros', () => {
    expect(validaExpresion('0000', 'FACT7')).toBe(false);
  });
});

describe('validarDecimales', () => {
  it('positivo válido', () => {
    expect(validarDecimales('100.00', 1)).toBe(true);
    expect(validarDecimales('100.00', 3)).toBe(true);
  });
  it('negativo con tipo 3 (solo positivo) → false', () => {
    expect(validarDecimales('-100.00', 3)).toBe(false);
  });
  it('negativo con tipo 2 (solo negativo) → true', () => {
    expect(validarDecimales('-100.00', 2)).toBe(true);
  });
  it('hasta 12 enteros + 2 decimales', () => {
    expect(validarDecimales('123456789012.34', 1)).toBe(true);
    expect(validarDecimales('1234567890123.45', 1)).toBe(false);
  });
});

describe('isValidDate (dd/MM/yyyy)', () => {
  it('válida', () => {
    expect(isValidDate('15/01/2025')).toBe(true);
  });
  it('día inválido (32)', () => {
    expect(isValidDate('32/01/2025')).toBe(false);
  });
  it('febrero 29 año no bisiesto', () => {
    expect(isValidDate('29/02/2025')).toBe(false);
  });
  it('febrero 29 bisiesto (2024)', () => {
    expect(isValidDate('29/02/2024')).toBe(true);
  });
});

describe('getCodigoTipoDoc', () => {
  it.each([
    ['0', 0],
    ['1', 1],
    ['4', 4],
    ['6', 6],
    ['7', 7],
    ['A', 10],
    ['B', 11],
    ['C', 12],
    ['D', 13],
    ['E', 14],
    ['F', 15],
    ['Z', -1]
  ])('mapea %s → %d', (input, expected) => {
    expect(getCodigoTipoDoc(input)).toBe(expected);
  });
});

// ============================================================================
// Helpers de monto
// ============================================================================

describe('isZeroDecimal', () => {
  it.each([
    ['0', true],
    ['0.00', true],
    ['-0.00', true],
    ['0.5', false],
    ['100.00', false],
    ['', false]
  ])('isZeroDecimal(%s) → %s', (input, expected) => {
    expect(isZeroDecimal(input)).toBe(expected);
  });
});

describe('validarFormatoMonto', () => {
  it('decimal positivo válido → 0', () => {
    expect(validarFormatoMonto('100.50')).toBe(E.OK);
  });
  it('decimal negativo válido → 0', () => {
    expect(validarFormatoMonto('-100.50')).toBe(E.OK);
  });
  it('hasta 12 enteros + 2 decimales → 0', () => {
    expect(validarFormatoMonto('123456789012.34')).toBe(E.OK);
  });
  it('13 enteros → 202', () => {
    expect(validarFormatoMonto('1234567890123.45')).toBe(E.LONGITUD_INCORRECTA);
  });
  it('3 decimales → 202', () => {
    expect(validarFormatoMonto('100.456')).toBe(E.LONGITUD_INCORRECTA);
  });
  it('texto → 203', () => {
    expect(validarFormatoMonto('abc')).toBe(E.REGEX_FALLA);
  });
});

// ============================================================================
// Validadores de importes (todos siguen patrón estándar)
// ============================================================================

describe('validarMontoEstandar — patrón usado por 7 validators', () => {
  describe('factura (01) — solo positivos', () => {
    it('positivo válido → 0', () => {
      expect(validaValorMtoExonerado('100.50', '01')).toBe(E.OK);
    });
    it('negativo → 220 (debe ser positivo)', () => {
      expect(validaValorMtoExonerado('-100.00', '01')).toBe(E.VALOR_DEBE_SER_POSITIVO);
    });
    it('vacío → 201', () => {
      expect(validaValorMtoExonerado('', '01')).toBe(E.VACIO);
    });
    it('13 enteros → 202', () => {
      expect(validaValorMtoExonerado('1234567890123.00', '01')).toBe(E.LONGITUD_INCORRECTA);
    });
  });

  describe('nota de crédito (07) — admite negativos', () => {
    it('negativo válido → 0', () => {
      expect(validaValorMtoExonerado('-100.00', '07')).toBe(E.OK);
    });
    it('cero válido → 0', () => {
      expect(validaValorMtoExonerado('0.00', '07')).toBe(E.OK);
    });
    it('positivo en NC → 221 (NC solo admite valor negativo o cero)', () => {
      // NC busca con validarDecimales tipo 2 (NEG_NUMBER); positivo no matchea.
      // Luego isZeroDecimal('50.00') = false → retorna 221.
      expect(validaValorMtoExonerado('50.00', '07')).toBe(E.VALOR_NO_ES_CERO_NI_VALIDO);
    });
  });

  describe('servicio público (14) — admite posneg', () => {
    it('positivo → 0', () => {
      expect(validaValorMtoExonerado('50.00', '14')).toBe(E.OK);
    });
    it('negativo → 0', () => {
      expect(validaValorMtoExonerado('-50.00', '14')).toBe(E.OK);
    });
  });
});

describe('validaValorISC', () => {
  it('factura positivo → 0', () => {
    expect(validaValorISC('5.50', '01')).toBe(E.OK);
  });
  it('NC negativo → 0', () => {
    expect(validaValorISC('-5.50', '07')).toBe(E.OK);
  });
});

describe('validaValorBIGravIVAP / validaValorIVAP / validaValorICBPER / validaValorMtoInafecto', () => {
  it('todas siguen el patrón estándar', () => {
    expect(validaValorBIGravIVAP('100', '01')).toBe(E.OK);
    expect(validaValorIVAP('4', '01')).toBe(E.OK);
    expect(validaValorICBPER('0.50', '01')).toBe(E.OK);
    expect(validaValorMtoInafecto('80', '01')).toBe(E.OK);
  });
});

describe('validaValorOtrosTributos — variante', () => {
  it('factura positivo → 0', () => {
    expect(validaValorOtrosTributos('15.00', '01')).toBe(E.OK);
  });
  it('factura posneg (acepta tipo 5) → 0', () => {
    expect(validaValorOtrosTributos('-15.00', '01')).toBe(E.OK);
  });
  it('NC (07) admite negativos', () => {
    expect(validaValorOtrosTributos('-15.00', '07')).toBe(E.OK);
  });
  it('NC especial 87 NO está en NC_BASICA, va al rama posneg', () => {
    expect(validaValorOtrosTributos('-15.00', '87')).toBe(E.OK);
  });
});

describe('validaValorTotalCP / validaValorFacturadoExportacion', () => {
  it('factura total → 0', () => {
    expect(validaValorTotalCP('118.00', '01')).toBe(E.OK);
  });
  it('factura facturado exportación → 0', () => {
    expect(validaValorFacturadoExportacion('1000.00', '01')).toBe(E.OK);
  });
});

describe('validaValorBIGravada — variante con fechaEmisionMod', () => {
  it('factura: positivo válido → 0', () => {
    expect(validaValorBIGravada('100.00', '01', [], '202501')).toBe(E.OK);
  });
  it('factura: negativo → 220', () => {
    expect(validaValorBIGravada('-100.00', '01', [], '202501')).toBe(E.VALOR_DEBE_SER_POSITIVO);
  });
  it('NC sin fecha emisión mod → 230', () => {
    expect(validaValorBIGravada('-50.00', '07', [], '202501')).toBe(E.NC_SIN_FECHA_EMISION_MOD_BI);
  });
  it('NC con fecha emisión mod dentro del período → 0', () => {
    expect(validaValorBIGravada('-50.00', '07', ['15/01/2025'], '202501')).toBe(E.OK);
  });
  it('NC con fecha emisión mod fuera del período → 230', () => {
    expect(validaValorBIGravada('-50.00', '07', ['15/02/2025'], '202501')).toBe(E.NC_SIN_FECHA_EMISION_MOD_BI);
  });
  it('NC con valor cero → 0 (sin fecha requerida)', () => {
    expect(validaValorBIGravada('0.00', '07', [], '202501')).toBe(E.OK);
  });
});

describe('validaValorIGVIPM — variante con fechaEmisionMod', () => {
  it('factura: positivo → 0', () => {
    expect(validaValorIGVIPM('18.00', '01', [], '202501')).toBe(E.OK);
  });
  it('NC sin fecha → 231', () => {
    expect(validaValorIGVIPM('-9.00', '07', [], '202501')).toBe(E.NC_SIN_FECHA_EMISION_MOD_IGV);
  });
  it('NC con fecha dentro período → 0', () => {
    expect(validaValorIGVIPM('-9.00', '07', ['10/01/2025'], '202501')).toBe(E.OK);
  });
});

describe('validaValorDsctoBI / validaValorDsctoIGVIPM (alias de BI/IGV)', () => {
  it('Descuento BI factura positivo → 0', () => {
    expect(validaValorDsctoBI('10.00', '01', [], '202501')).toBe(E.OK);
  });
  it('Descuento IGV NC con fecha → 0', () => {
    expect(validaValorDsctoIGVIPM('-1.80', '07', ['10/01/2025'], '202501')).toBe(E.OK);
  });
});

// ============================================================================
// Campos de libre uso e identificadores
// ============================================================================

describe('validaCLU', () => {
  it('vacío → 0 (opcional)', () => {
    expect(validaCLU('')).toBe(E.OK);
  });
  it('texto corto → 0', () => {
    expect(validaCLU('nota interna del proveedor')).toBe(E.OK);
  });
  it('hasta 200 chars → 0', () => {
    expect(validaCLU('a'.repeat(200))).toBe(E.OK);
  });
  it('> 200 chars → 202', () => {
    expect(validaCLU('a'.repeat(201))).toBe(E.LONGITUD_INCORRECTA);
  });
  it('contiene "/" → 203', () => {
    expect(validaCLU('con/slash')).toBe(E.REGEX_FALLA);
  });
  it('contiene "|" → 203', () => {
    expect(validaCLU('con|pipe')).toBe(E.REGEX_FALLA);
  });
});

describe('validaIdProyecto', () => {
  it('vacío → 0 (opcional)', () => {
    expect(validaIdProyecto('')).toBe(E.OK);
  });
  it('formato válido "1-XXXXX" → 0', () => {
    expect(validaIdProyecto('1-PROY123')).toBe(E.OK);
  });
  it('formato válido "2-XXXXX" → 0', () => {
    expect(validaIdProyecto('2-OP00001')).toBe(E.OK);
  });
  it('no inicia con 1 o 2 → 203', () => {
    expect(validaIdProyecto('3-NOPROYECT')).toBe(E.REGEX_FALLA);
  });
  it('falta guión → 203', () => {
    expect(validaIdProyecto('1PROY')).toBe(E.REGEX_FALLA);
  });
});

// ============================================================================
// Validadores de documento modificado (Notas de Crédito / Débito)
// ============================================================================

describe('validaFechaEmisionModUni', () => {
  it('formato y período válidos → 0', () => {
    expect(validaFechaEmisionModUni('05/01/2025', '15/01/2025', '202501')).toBe(E.OK);
  });
  it('longitud != 10 → 202', () => {
    expect(validaFechaEmisionModUni('5/1/2025', '15/01/2025', '202501')).toBe(E.LONGITUD_INCORRECTA);
  });
  it('fecha inválida calendario → 206', () => {
    expect(validaFechaEmisionModUni('32/01/2025', '15/01/2025', '202501')).toBe(E.FECHA_INVALIDA);
  });
  it('modif posterior a emisión → 234', () => {
    expect(validaFechaEmisionModUni('20/01/2025', '15/01/2025', '202501')).toBe(234);
  });
  it('modif posterior al período (sin fecha emisión) → 208', () => {
    // Sin fecha emisión válida no se chequea 234; pasa a 208
    expect(validaFechaEmisionModUni('15/02/2025', '', '202501')).toBe(E.FECHA_MAYOR_PERIODO);
  });
});

describe('validaFechaEmisionMod (lista)', () => {
  it('NC sin fecha → 201', () => {
    expect(validaFechaEmisionMod('', '15/01/2025', '07', '202501')).toBe(E.VACIO);
  });
  it('NC con fecha individual → 0', () => {
    expect(validaFechaEmisionMod('05/01/2025', '15/01/2025', '07', '202501')).toBe(E.OK);
  });
  it('NC con múltiples fechas → 0', () => {
    expect(validaFechaEmisionMod('05/01/2025,10/01/2025', '15/01/2025', '07', '202501')).toBe(E.OK);
  });
  it('factura con fechaEmisionMod no vacía → 224', () => {
    expect(validaFechaEmisionMod('05/01/2025', '15/01/2025', '01', '202501')).toBe(224);
  });
  it('factura vacío → 0', () => {
    expect(validaFechaEmisionMod('', '15/01/2025', '01', '202501')).toBe(E.OK);
  });
});

describe('validaTipoCpModUni', () => {
  it('tipo válido (01 factura) → 0', () => {
    expect(validaTipoCpModUni('01')).toBe(E.OK);
  });
  it('tipo 02 (recibo honorarios) no puede ser modif → 228', () => {
    expect(validaTipoCpModUni('02')).toBe(228);
  });
  it('tipo 07 (NC) no puede ser modif → 228', () => {
    expect(validaTipoCpModUni('07')).toBe(228);
  });
  it('tipo no en LISTA_PARA_INCLUIDO → 211', () => {
    expect(validaTipoCpModUni('64')).toBe(E.TIPO_CP_NO_EN_LISTA);
  });
});

describe('validaTipoCpMod (lista)', () => {
  it('NC con tipo modif válido → 0', () => {
    expect(validaTipoCpMod('01', '07', '05/01/2025')).toBe(E.OK);
  });
  it('NC con listas paralelas válidas → 0', () => {
    expect(validaTipoCpMod('01,03', '07', '05/01/2025,10/01/2025')).toBe(E.OK);
  });
  it('NC con longitudes distintas → 202', () => {
    expect(validaTipoCpMod('01,03', '07', '05/01/2025')).toBe(E.LONGITUD_INCORRECTA);
  });
  it('factura con tipoMod no vacío → 224', () => {
    expect(validaTipoCpMod('01', '01', '05/01/2025')).toBe(224);
  });
});

describe('validaNumSerieModUni', () => {
  it('serie válida factura E001 → 0', () => {
    expect(validaNumSerieModUni('E001', '01', false)).toBe(E.OK);
  });
  it('serie larga → 202', () => {
    expect(validaNumSerieModUni('F00099', '01', false)).toBe(E.LONGITUD_INCORRECTA);
  });
});

describe('validaNumSerieMod (lista)', () => {
  it('NC con serie válida → 0', () => {
    expect(validaNumSerieMod('E001', '07', '01', false)).toBe(E.OK);
  });
  it('NC con longitudes distintas → 202', () => {
    expect(validaNumSerieMod('E001,F002', '07', '01', false)).toBe(E.LONGITUD_INCORRECTA);
  });
  it('factura con serie modif no vacía → 224', () => {
    expect(validaNumSerieMod('F001', '01', '', false)).toBe(224);
  });
});

describe('validaNumCPModUni', () => {
  it('numCP válido factura → 0', () => {
    expect(validaNumCPModUni('00000001', '01', 'F001')).toBe(E.OK);
  });
  it('numCP excede longitud → 202', () => {
    expect(validaNumCPModUni('123456789', '01', 'F001')).toBe(E.LONGITUD_INCORRECTA);
  });
});

describe('validaNumCPMod (lista)', () => {
  it('NC con numCP válido → 0', () => {
    expect(validaNumCPMod('00000001', '07', '01', 'F001')).toBe(E.OK);
  });
  it('NC con listas no sincronizadas → 202', () => {
    expect(validaNumCPMod('00000001,00000002', '07', '01', 'F001')).toBe(E.LONGITUD_INCORRECTA);
  });
  it('factura con numCPMod no vacío → 224', () => {
    expect(validaNumCPMod('00000001', '01', '', '')).toBe(224);
  });
});

// ============================================================================
// Validadores RCE específicos (compras)
// ============================================================================

describe('validaCAR (RCE)', () => {
  it('vacío → 0 (correcto en reemplazo)', () => {
    expect(validaCAR('')).toBe(E.OK);
  });
  it('con valor → 410', () => {
    expect(validaCAR('M0001')).toBe(ERCE.CAR_DEBE_IR_VACIO);
  });
});

describe('validaTipoComprobanteRCE', () => {
  it('factura (01) → 0', () => {
    expect(validaTipoComprobanteRCE('01')).toBe(E.OK);
  });
  it('vacío → 401', () => {
    expect(validaTipoComprobanteRCE('')).toBe(ERCE.VACIO_RCE);
  });
  it('longitud != 2 → 402', () => {
    expect(validaTipoComprobanteRCE('1')).toBe(ERCE.LONGITUD_RCE);
  });
  it('no alfanumérico → 403', () => {
    expect(validaTipoComprobanteRCE('A!')).toBe(ERCE.REGEX_RCE);
  });
  it('código 91 prohibido en RCE → 418', () => {
    expect(validaTipoComprobanteRCE('91')).toBe(ERCE.TIPO_CP_PROHIBIDO_RCE);
  });
  it('código 99 no en lista → 418', () => {
    expect(validaTipoComprobanteRCE('99')).toBe(ERCE.TIPO_CP_PROHIBIDO_RCE);
  });
});

describe('validaCodDam (RCE)', () => {
  it('factura sin DAM → 0 (opcional)', () => {
    expect(validaCodDam('', '01')).toBe(E.OK);
  });
  it('DAM (50) sin código → 401', () => {
    expect(validaCodDam('', '50')).toBe(ERCE.VACIO_RCE);
  });
  it('código aduana válido (118) → 0', () => {
    expect(validaCodDam('118', '50')).toBe(E.OK);
  });
  it('código no en lista → 433', () => {
    expect(validaCodDam('999', '50')).toBe(ERCE.COD_DAM_NO_EN_LISTA);
  });
  it('longitud != 3 → 402', () => {
    expect(validaCodDam('11', '50')).toBe(ERCE.LONGITUD_RCE);
  });
});

describe('validaClasifBssSss', () => {
  it('vacío sin codBbSS → 0', () => {
    expect(validaClasifBssSss('', '0')).toBe(E.OK);
  });
  it('vacío con codBbSS=1 → 807 (requerido)', () => {
    expect(validaClasifBssSss('', '1')).toBe(ERCE.CLASIF_REQUERIDO);
  });
  it.each(['1', '2', '3', '4', '5'])('clasif %s → 0', (v) => {
    expect(validaClasifBssSss(v, '0')).toBe(E.OK);
  });
  it('clasif 9 fuera de rango → 446', () => {
    expect(validaClasifBssSss('9', '0')).toBe(ERCE.CLASIF_NO_EN_LISTA);
  });
  it('longitud != 1 → 402', () => {
    expect(validaClasifBssSss('11', '0')).toBe(ERCE.LONGITUD_RCE);
  });
});

describe('validaPorcPart', () => {
  it('vacío + sin proyecto → 0', () => {
    expect(validaPorcPart('', '', '01')).toBe(E.OK);
  });
  it('vacío + idProyecto inicia con "1" + tipoCP != 25 → 439', () => {
    expect(validaPorcPart('', '1-PROY', '01')).toBe(ERCE.PORC_PART_REQUERIDO);
  });
  it('valor positivo válido → 0', () => {
    expect(validaPorcPart('50.00', '1-PROY', '01')).toBe(E.OK);
  });
  it('3 decimales → 403', () => {
    expect(validaPorcPart('50.000', '1-PROY', '01')).toBe(ERCE.REGEX_RCE);
  });
  it('idProyecto inicia con "2" no requiere → 0', () => {
    expect(validaPorcPart('', '2-PROY', '01')).toBe(E.OK);
  });
});

describe('validaIMB', () => {
  it('vacío → 0', () => {
    expect(validaIMB('', '01')).toBe(E.OK);
  });
  it('factura positivo → 0', () => {
    expect(validaIMB('100.00', '01')).toBe(E.OK);
  });
  it('NC negativo → 0', () => {
    expect(validaIMB('-100.00', '07')).toBe(E.OK);
  });
  it('factura negativo distinto de cero → 425', () => {
    expect(validaIMB('-50.00', '01')).toBe(ERCE.IMB_VALOR_INVALIDO);
  });
  it('NC positivo distinto de cero → 425', () => {
    expect(validaIMB('50.00', '07')).toBe(ERCE.IMB_VALOR_INVALIDO);
  });
});

describe('Campos que deben ir VACÍOS en reemplazo (CAR Orig, Detracción, Tipo Nota, Estado CDP)', () => {
  it('validaCAROrig vacío → 0', () => {
    expect(validaCAROrig('')).toBe(E.OK);
  });
  it('validaCAROrig con valor → 404', () => {
    expect(validaCAROrig('M0001')).toBe(ERCE.DEBE_IR_VACIO);
  });
  it('validaDetraccion vacío → 0', () => {
    expect(validaDetraccion('')).toBe(E.OK);
  });
  it('validaDetraccion con valor → 404', () => {
    expect(validaDetraccion('X')).toBe(ERCE.DEBE_IR_VACIO);
  });
  it('validaCodTipoNota vacío → 0', () => {
    expect(validaCodTipoNota('')).toBe(E.OK);
  });
  it('validaCodTipoNota con valor → 404', () => {
    expect(validaCodTipoNota('1')).toBe(ERCE.DEBE_IR_VACIO);
  });
  it('validaCodEstCDP vacío → 0', () => {
    expect(validaCodEstCDP('')).toBe(E.OK);
  });
  it('validaCodEstCDP con valor → 404', () => {
    expect(validaCodEstCDP('1')).toBe(ERCE.DEBE_IR_VACIO);
  });
});

// ============================================================================
// Validadores RCE basados en JSON oficial (validacionesRCE.json)
// ============================================================================

describe('validaAnioEmisionRCE', () => {
  it('factura sin año → 0 (no requerido)', () => {
    expect(validaAnioEmisionRCE('', '01', '202501')).toBe(E.OK);
  });
  it('DAM (50) sin año → 401', () => {
    expect(validaAnioEmisionRCE('', '50', '202501')).toBe(ERCE.VACIO_RCE);
  });
  it('DAM con año válido (2024) → 0', () => {
    expect(validaAnioEmisionRCE('2024', '50', '202501')).toBe(E.OK);
  });
  it('Año <= 1981 → 420', () => {
    expect(validaAnioEmisionRCE('1980', '50', '202501')).toBe(420);
  });
  it('Año > período → 420', () => {
    expect(validaAnioEmisionRCE('2026', '50', '202501')).toBe(420);
  });
  it('Longitud != 4 → 402', () => {
    expect(validaAnioEmisionRCE('24', '50', '202501')).toBe(ERCE.LONGITUD_RCE);
  });
});

describe('validaNumSerieRCE (basado en JSON oficial)', () => {
  it('factura electrónica F001 → 0', () => {
    expect(validaNumSerieRCE('F001', '01')).toBe(E.OK);
  });
  it('factura electrónica E001 → 0', () => {
    expect(validaNumSerieRCE('E001', '01')).toBe(E.OK);
  });
  it('factura física 0001 → 0', () => {
    expect(validaNumSerieRCE('0001', '01')).toBe(E.OK);
  });
  it('factura B001 (boleta) → 403', () => {
    expect(validaNumSerieRCE('B001', '01')).toBe(ERCE.REGEX_RCE);
  });
  it('boleta EB01 → 0', () => {
    expect(validaNumSerieRCE('EB01', '03')).toBe(E.OK);
  });
  it('DAM (50) con código de aduana 118 → 0', () => {
    expect(validaNumSerieRCE('118', '50')).toBe(E.OK);
  });
  it('DAM con código no de aduana → 419', () => {
    expect(validaNumSerieRCE('XYZ', '50')).toBe(419);
  });
  it('serie obligatoria vacía → 401', () => {
    expect(validaNumSerieRCE('', '01')).toBe(ERCE.VACIO_RCE);
  });
  it('tipo CP no en lista → 0 (skip)', () => {
    expect(validaNumSerieRCE('F001', '99')).toBe(E.OK);
  });
});

describe('validaNumCPRCE (basado en JSON oficial)', () => {
  it('factura numCP positivo → 0', () => {
    expect(validaNumCPRCE('00000001', '01', 'F001')).toBe(E.OK);
  });
  it('factura todo ceros → 403', () => {
    expect(validaNumCPRCE('00000000', '01', 'F001')).toBe(ERCE.REGEX_RCE);
  });
  it('factura sin numCP → 401', () => {
    expect(validaNumCPRCE('', '01', 'F001')).toBe(ERCE.VACIO_RCE);
  });
  it('liquidación compras serie E acepta hasta 8 dígitos', () => {
    expect(validaNumCPRCE('12345678', '04', 'E001')).toBe(E.OK);
  });
  it('liquidación compras serie L también acepta hasta 8 (RCE no diferencia)', () => {
    // En RCE el JSON usa el mismo regex independiente de la serie
    expect(validaNumCPRCE('12345678', '04', 'L001')).toBe(E.OK);
  });
  it('tipo 00 (otros) → 0 sin validar regex', () => {
    expect(validaNumCPRCE('ABCDEFGH', '00', '')).toBe(E.OK);
  });
  it('factura con longitud excedida → 402', () => {
    expect(validaNumCPRCE('000000001', '01', 'F001')).toBe(ERCE.LONGITUD_RCE);
  });
});

// ============================================================================
// Validadores de importes RCE (BI DG, IGV DG, BI DGNG, etc.)
// ============================================================================

describe('Importes RCE (validarMontoRCE pattern)', () => {
  describe('factura (01) — solo positivos', () => {
    it('positivo válido → 0', () => {
      expect(validaValorBIGravadaRCE('100.00', '01', '', '')).toBe(E.OK);
    });
    it('negativo → 425', () => {
      expect(validaValorBIGravadaRCE('-100.00', '01', '', '')).toBe(425);
    });
    it('vacío → 401', () => {
      expect(validaValorBIGravadaRCE('', '01', '', '')).toBe(ERCE.VACIO_RCE);
    });
    it('cero → 0', () => {
      expect(validaValorBIGravadaRCE('0.00', '01', '', '')).toBe(E.OK);
    });
    it('3 decimales → 403', () => {
      expect(validaValorBIGravadaRCE('100.123', '01', '', '')).toBe(ERCE.REGEX_RCE);
    });
    it('13 enteros → 402', () => {
      expect(validaValorBIGravadaRCE('1234567890123.00', '01', '', '')).toBe(ERCE.LONGITUD_RCE);
    });
  });

  describe('NC (07) — solo negativo o cero', () => {
    it('negativo válido → 0', () => {
      expect(validaValorBIGravadaRCE('-100.00', '07', '', '')).toBe(E.OK);
    });
    it('positivo → 425', () => {
      expect(validaValorBIGravadaRCE('100.00', '07', '', '')).toBe(425);
    });
    it('cero → 0', () => {
      expect(validaValorBIGravadaRCE('0.00', '07', '', '')).toBe(E.OK);
    });
  });

  describe('Tipo 25 (MYPE) con idProyecto inicia con "1" → requiere negativo', () => {
    it('positivo → 425', () => {
      expect(validaValorBIGravadaRCE('100.00', '25', '1-PROY', '')).toBe(425);
    });
    it('negativo → 0', () => {
      expect(validaValorBIGravadaRCE('-100.00', '25', '1-PROY', '')).toBe(E.OK);
    });
  });

  describe('Servicio público (14) — acepta posneg', () => {
    it('positivo → 0', () => {
      expect(validaValorBIGravadaRCE('100.00', '14', '', '')).toBe(E.OK);
    });
    it('negativo → 0', () => {
      expect(validaValorBIGravadaRCE('-100.00', '14', '', '')).toBe(E.OK);
    });
  });

  describe('nroFinal restricción', () => {
    it('factura con nroFinal y valor != 0 → 424', () => {
      expect(validaValorBIGravadaRCE('100.00', '01', '', 'F001')).toBe(424);
    });
    it('factura con nroFinal y valor 0.00 → 0', () => {
      expect(validaValorBIGravadaRCE('0.00', '01', '', 'F001')).toBe(E.OK);
    });
  });
});

describe('Validadores RCE de importes específicos', () => {
  it('validaValorIGVIPMDG funciona igual que BI Gravada', () => {
    expect(validaValorIGVIPMDG('18.00', '01', '', '')).toBe(E.OK);
    expect(validaValorIGVIPMDG('-18.00', '01', '', '')).toBe(425);
  });
  it('validaValorIGVIPMDG: BI negativo + IGV positivo → 425 (incoherencia)', () => {
    expect(validaValorIGVIPMDG('18.00', '01', '', '', '-100.00')).toBe(425);
  });
  it('validaValorIGVIPMDG: BI positivo + IGV positivo → 0', () => {
    expect(validaValorIGVIPMDG('18.00', '01', '', '', '100.00')).toBe(E.OK);
  });
  it('validaValorBIGravadaDGNG patrón estándar', () => {
    expect(validaValorBIGravadaDGNG('50.00', '01', '', '')).toBe(E.OK);
  });
  it('validaValorIGVIPMDGNG patrón estándar', () => {
    expect(validaValorIGVIPMDGNG('9.00', '01', '', '')).toBe(E.OK);
  });
  it('validaValorIGVIPMDGNG: BI- + IGV+ → 425 (incoherencia)', () => {
    expect(validaValorIGVIPMDGNG('9.00', '01', '', '', '-50.00')).toBe(425);
  });
  it('validaValorBIGravadaDNG patrón estándar', () => {
    expect(validaValorBIGravadaDNG('30.00', '01', '', '')).toBe(E.OK);
  });
  it('validaValorIGVIPMDNG patrón estándar', () => {
    expect(validaValorIGVIPMDNG('5.40', '01', '', '')).toBe(E.OK);
  });
  it('validaValorIGVIPMDNG: BI- + IGV+ → 425 (incoherencia)', () => {
    expect(validaValorIGVIPMDNG('5.40', '01', '', '', '-30.00')).toBe(425);
  });
  it('validaValorAdqNG patrón estándar', () => {
    expect(validaValorAdqNG('20.00', '01', '')).toBe(E.OK);
  });
  it('validaValorISCRCE patrón estándar', () => {
    expect(validaValorISCRCE('5.00', '01', '')).toBe(E.OK);
  });
  it('validaValorICBPERRCE patrón estándar', () => {
    expect(validaValorICBPERRCE('0.50', '01')).toBe(E.OK);
  });
  it('validaValorOtrosTribRCE patrón estándar', () => {
    expect(validaValorOtrosTribRCE('1.00', '01', '')).toBe(E.OK);
  });
  it('validaValorTotalCPRCE patrón estándar', () => {
    expect(validaValorTotalCPRCE('118.00', '01', '')).toBe(E.OK);
  });
});

describe('validaPeriodoRCE', () => {
  it('válido coincide → 0', () => {
    expect(validaPeriodoRCE('202501', '202501', '15/01/2025', '01')).toBe(E.OK);
  });
  it('vacío → 401', () => {
    expect(validaPeriodoRCE('', '202501', '', '01')).toBe(ERCE.VACIO_RCE);
  });
  it('longitud != 6 → 402', () => {
    expect(validaPeriodoRCE('20250', '202501', '', '01')).toBe(ERCE.LONGITUD_RCE);
  });
  it('no numérico → 409', () => {
    expect(validaPeriodoRCE('2025AB', '2025AB', '', '01')).toBe(409);
  });
  it('mes 13 → 407', () => {
    expect(validaPeriodoRCE('202513', '202513', '', '01')).toBe(407);
  });
  it('no coincide → 408', () => {
    expect(validaPeriodoRCE('202501', '202502', '', '01')).toBe(408);
  });
  it('NC 87 con fecha en otro mes → 814', () => {
    expect(validaPeriodoRCE('202501', '202501', '15/02/2025', '87')).toBe(814);
  });
  it('NC 87 con fecha en mismo mes → 0', () => {
    expect(validaPeriodoRCE('202501', '202501', '15/01/2025', '87')).toBe(E.OK);
  });
});

describe('validaFechaEmisionRCE', () => {
  it('reemplazo (origen=3) con fecha dentro del período → 0', () => {
    // En reemplazo de propuesta la regla especial NO aplica
    expect(validaFechaEmisionRCE('15/01/2025', '01', 'F001', '202501', '3')).toBe(E.OK);
  });
  it('vacía → 401', () => {
    expect(validaFechaEmisionRCE('', '01', 'F001', '202501', '1')).toBe(ERCE.VACIO_RCE);
  });
  it('longitud != 10 → 402', () => {
    expect(validaFechaEmisionRCE('1/1/25', '01', 'F001', '202501', '1')).toBe(ERCE.LONGITUD_RCE);
  });
  it('fecha calendario inválida → 411', () => {
    expect(validaFechaEmisionRCE('32/01/2025', '01', 'F001', '202501', '3')).toBe(411);
  });
  it('mes posterior al período → 412', () => {
    expect(validaFechaEmisionRCE('15/02/2025', '01', 'F001', '202501', '3')).toBe(412);
  });
  it('importación (origen != 3) con factura electrónica en período → 412', () => {
    // Regla especial: importar comprobante electrónico que ya está en el período actual
    expect(validaFechaEmisionRCE('15/01/2025', '01', 'F001', '202501', '1')).toBe(412);
  });
  it('importación (origen != 3) con factura física en período → 0', () => {
    // Las facturas físicas (serie numérica) no aplican la regla electrónica
    expect(validaFechaEmisionRCE('15/01/2025', '01', '0001', '202501', '1')).toBe(E.OK);
  });
});

describe('validaInconsistencia', () => {
  it('vacío → 0 (debe ir vacío en reemplazo)', () => {
    expect(validaInconsistencia('')).toBe(E.OK);
  });
  it('con valor → 404', () => {
    expect(validaInconsistencia('1')).toBe(ERCE.DEBE_IR_VACIO);
  });
});

// ============================================================================
// Validadores RCE comunes (RUC, Razón Social, Moneda, Tipo Cambio)
// ============================================================================

describe('validaRucDeclaranteRCE', () => {
  it('válido y coincide → 0', () => {
    expect(validaRucDeclaranteRCE('20131312955', '20131312955')).toBe(E.OK);
  });
  it('vacío → 401', () => {
    expect(validaRucDeclaranteRCE('', '20131312955')).toBe(ERCE.VACIO_RCE);
  });
  it('longitud != 11 → 402', () => {
    expect(validaRucDeclaranteRCE('123', '20131312955')).toBe(ERCE.LONGITUD_RCE);
  });
  it('no numérico → 403', () => {
    expect(validaRucDeclaranteRCE('2013131295A', '20131312955')).toBe(ERCE.REGEX_RCE);
  });
  it('no coincide → 405', () => {
    expect(validaRucDeclaranteRCE('20131312955', '10719887304')).toBe(405);
  });
});

describe('validaIdRazonSocialRCE', () => {
  it('válido → 0', () => {
    expect(validaIdRazonSocialRCE('EMPRESA EJEMPLO SAC')).toBe(E.OK);
  });
  it('vacío → 401', () => {
    expect(validaIdRazonSocialRCE('')).toBe(ERCE.VACIO_RCE);
  });
  it('> 1500 → 402', () => {
    expect(validaIdRazonSocialRCE('X'.repeat(1501))).toBe(ERCE.LONGITUD_RCE);
  });
});

describe('validaMonedaRCE', () => {
  it('PEN válido → 0', () => {
    expect(validaMonedaRCE('PEN')).toBe(E.OK);
  });
  it('USD válido → 0', () => {
    expect(validaMonedaRCE('USD')).toBe(E.OK);
  });
  it('vacío → 401', () => {
    expect(validaMonedaRCE('')).toBe(ERCE.VACIO_RCE);
  });
  it('longitud != 3 → 402', () => {
    expect(validaMonedaRCE('PE')).toBe(ERCE.LONGITUD_RCE);
  });
  it('no en lista oficial → 426', () => {
    expect(validaMonedaRCE('XYZ')).toBe(426);
  });
});

describe('validaTipoCambioRCE', () => {
  it('PEN contabilidad PEN sin TC → 0', () => {
    expect(validaTipoCambioRCE('', 'PEN', 'PEN')).toBe(E.OK);
  });
  it('PEN contabilidad PEN con TC → 499', () => {
    expect(validaTipoCambioRCE('1.000', 'PEN', 'PEN')).toBe(499);
  });
  it('USD con contabilidad PEN y TC válido → 0', () => {
    expect(validaTipoCambioRCE('3.800', 'USD', 'PEN')).toBe(E.OK);
  });
  it('USD con contabilidad PEN sin TC → 401', () => {
    expect(validaTipoCambioRCE('', 'USD', 'PEN')).toBe(ERCE.VACIO_RCE);
  });
  it('USD con TC = 0.000 → 427', () => {
    expect(validaTipoCambioRCE('0.000', 'USD', 'PEN')).toBe(427);
  });
  it('moneda no en lista → 0 (skip)', () => {
    expect(validaTipoCambioRCE('1.000', 'XYZ', 'PEN')).toBe(E.OK);
  });
});

describe('validaFechaVencimientoRCE', () => {
  it('factura (01) sin fecha vto → 0 (opcional)', () => {
    expect(validaFechaVencimientoRCE('', '01', '100', '18', '0', '0', '0', '0', '202501')).toBe(E.OK);
  });
  it('recibo público (14) sin fecha vto → 414', () => {
    expect(validaFechaVencimientoRCE('', '14', '0', '0', '0', '0', '0', '0', '202501')).toBe(414);
  });
  it('recibo público (14) con fecha vto dentro de período+1 → 0', () => {
    expect(validaFechaVencimientoRCE('15/02/2025', '14', '0', '0', '0', '0', '0', '0', '202501')).toBe(E.OK);
  });
  it('recibo público (14) con fecha vto > período+1 → 417', () => {
    expect(validaFechaVencimientoRCE('15/03/2025', '14', '0', '0', '0', '0', '0', '0', '202501')).toBe(417);
  });
  it('DAM (50) con fecha vto > período → 415', () => {
    expect(validaFechaVencimientoRCE('15/02/2025', '50', '100', '18', '0', '0', '0', '0', '202501')).toBe(415);
  });
});

describe('validaNroFinalRCE', () => {
  it('vacío → 0', () => {
    expect(validaNroFinalRCE('', '01', '00000001', '0', '0', '0', '0', '0', '0', '0')).toBe(E.OK);
  });
  it('"0" → 0 (caso especial)', () => {
    expect(validaNroFinalRCE('0', '01', '00000001', '0', '0', '0', '0', '0', '0', '0')).toBe(E.OK);
  });
  it('boleta con nroFinal y sum=0 → permitido', () => {
    expect(validaNroFinalRCE('00000010', '03', '00000001', '0', '0', '0', '0', '0', '0', '0')).toBe(E.OK);
  });
  it('factura (01) tipo no en lista_1 → 421', () => {
    expect(validaNroFinalRCE('00000010', '01', '00000001', '0', '0', '0', '0', '0', '0', '0')).toBe(421);
  });
  it('tipo permitido pero sum != 0 → 421', () => {
    expect(validaNroFinalRCE('00000010', '03', '00000001', '100', '18', '0', '0', '0', '0', '0')).toBe(421);
  });
  it('longitud > 20 → 402', () => {
    expect(validaNroFinalRCE('1'.repeat(21), '03', '1', '0', '0', '0', '0', '0', '0', '0')).toBe(ERCE.LONGITUD_RCE);
  });
});

describe('validaTipoDocIdentidadRCE', () => {
  it('factura (01) con RUC (6) → 0', () => {
    expect(validaTipoDocIdentidadRCE('6', '01', '')).toBe(E.OK);
  });
  it('factura sin doc identidad → 422', () => {
    expect(validaTipoDocIdentidadRCE('', '01', '')).toBe(422);
  });
  it('tipo 00 (otros) vacío permitido', () => {
    expect(validaTipoDocIdentidadRCE('', '00', '')).toBe(E.OK);
  });
  it('doc identidad inválido → 423', () => {
    expect(validaTipoDocIdentidadRCE('Z', '01', '')).toBe(423);
  });
});

describe('validaNumDocIdentidadRCE', () => {
  it('RUC válido (módulo 11) → 0', () => {
    expect(validaNumDocIdentidadRCE('20131312955', '01', '', '6')).toBe(E.OK);
  });
  it('RUC sin módulo 11 → 423', () => {
    expect(validaNumDocIdentidadRCE('20000000000', '01', '', '6')).toBe(423);
  });
  it('DNI 8 dígitos → 0', () => {
    expect(validaNumDocIdentidadRCE('12345678', '01', '', '1')).toBe(E.OK);
  });
  it('DNI longitud incorrecta → 402', () => {
    expect(validaNumDocIdentidadRCE('1234567', '01', '', '1')).toBe(ERCE.LONGITUD_RCE);
  });
  it('factura sin doc → 422', () => {
    expect(validaNumDocIdentidadRCE('', '01', '', '')).toBe(422);
  });
});

describe('validaRazonSocialClienteRCE', () => {
  it('razón social válida → 0', () => {
    expect(validaRazonSocialClienteRCE('EMPRESA SAC', '6', '', '01')).toBe(E.OK);
  });
  it('vacía sin tipoDoc ni nroFinal → 422', () => {
    expect(validaRazonSocialClienteRCE('', '', '', '01')).toBe(422);
  });
  it('> 1500 → 402', () => {
    expect(validaRazonSocialClienteRCE('X'.repeat(1501), '6', '', '01')).toBe(ERCE.LONGITUD_RCE);
  });
});

// ============================================================================
// Validadores RCE Doc Modificado (NC/ND)
// ============================================================================

describe('validaFechaEmisionModRCE', () => {
  it('NC (07) con fecha dentro de período → 0', () => {
    expect(validaFechaEmisionModRCE('15/12/2024', '07', '202501')).toBe(E.OK);
  });
  it('NC sin fecha → 428', () => {
    expect(validaFechaEmisionModRCE('', '07', '202501')).toBe(EMOD.MOD_VACIO_OBLIGATORIO);
  });
  it('NC con fecha posterior → 431', () => {
    expect(validaFechaEmisionModRCE('15/02/2025', '07', '202501')).toBe(EMOD.MOD_FECHA_POSTERIOR_PERIODO);
  });
  it('NC con fecha calendario inválida → 430', () => {
    expect(validaFechaEmisionModRCE('32/01/2025', '07', '202501')).toBe(EMOD.MOD_FECHA_INVALIDA);
  });
  it('factura con fechaEmisionMod presente → 429', () => {
    expect(validaFechaEmisionModRCE('15/12/2024', '01', '202501')).toBe(EMOD.MOD_NO_DEBE_TENER_VALOR);
  });
  it('factura sin fechaEmisionMod → 0', () => {
    expect(validaFechaEmisionModRCE('', '01', '202501')).toBe(E.OK);
  });
});

describe('validaTipoCPModRCE', () => {
  it('NC referencia factura (01) → 0', () => {
    expect(validaTipoCPModRCE('01', '07')).toBe(E.OK);
  });
  it('NC sin tipoCPMod → 428', () => {
    expect(validaTipoCPModRCE('', '07')).toBe(EMOD.MOD_VACIO_OBLIGATORIO);
  });
  it('NC con tipoCPMod = 02 (recibo honorarios) → 432', () => {
    expect(validaTipoCPModRCE('02', '07')).toBe(EMOD.MOD_TIPO_CP_PROHIBIDO);
  });
  it('NC con tipoCPMod = 03 (boleta) → 432', () => {
    expect(validaTipoCPModRCE('03', '07')).toBe(EMOD.MOD_TIPO_CP_PROHIBIDO);
  });
  it('factura con tipoCPMod presente → 429', () => {
    expect(validaTipoCPModRCE('01', '01')).toBe(EMOD.MOD_NO_DEBE_TENER_VALOR);
  });
  it('factura sin tipoCPMod → 0', () => {
    expect(validaTipoCPModRCE('', '01')).toBe(E.OK);
  });
});

describe('validaNumSerieCPModRCE', () => {
  it('NC con serie válida (F001) → 0', () => {
    expect(validaNumSerieCPModRCE('F001', '07', '01')).toBe(E.OK);
  });
  it('NC sin serie → 428', () => {
    expect(validaNumSerieCPModRCE('', '07', '01')).toBe(EMOD.MOD_VACIO_OBLIGATORIO);
  });
  it('factura con serie mod presente → 429', () => {
    expect(validaNumSerieCPModRCE('F001', '01', '')).toBe(EMOD.MOD_NO_DEBE_TENER_VALOR);
  });
});

describe('validaNumCPModRCE', () => {
  it('NC con numCP válido → 0', () => {
    expect(validaNumCPModRCE('00000001', '07')).toBe(E.OK);
  });
  it('NC sin numCP → 428', () => {
    expect(validaNumCPModRCE('', '07')).toBe(EMOD.MOD_VACIO_OBLIGATORIO);
  });
  it('factura con numCPMod presente → 429', () => {
    expect(validaNumCPModRCE('00000001', '01')).toBe(EMOD.MOD_NO_DEBE_TENER_VALOR);
  });
});
