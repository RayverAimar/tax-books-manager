/**
 * Robust Data Type Validators
 *
 * Provides strict validation for INTEGER, FLOAT, DATE, and STRING data types
 * to ensure data integrity in the invoice management system.
 *
 * Key Features:
 * - INTEGER: Only whole numbers, no decimals allowed
 * - FLOAT: Decimal numbers with configurable precision
 * - DATE: Valid dates in DD/MM/YYYY format
 * - STRING: Text with optional length constraints
 */

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
  sanitizedValue?: unknown;
}

/**
 * Validate INTEGER values
 * - Must be a whole number (no decimals)
 * - No scientific notation
 * - Optional min/max range
 */
export function validateInteger(
  value: unknown,
  options?: { min?: number; max?: number; allowNull?: boolean }
): ValidationResult {
  const { min, max, allowNull = true } = options || {};

  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    return allowNull
      ? { isValid: true, sanitizedValue: null }
      : { isValid: false, errorMessage: 'El valor no puede estar vacío' };
  }

  // Convert to string for validation
  const strValue = String(value).trim();

  // Check if contains decimal point or comma
  if (strValue.includes('.') || strValue.includes(',')) {
    return {
      isValid: false,
      errorMessage: 'Este campo solo acepta números enteros, sin decimales'
    };
  }

  // Check if it's a valid integer
  const numValue = Number(strValue);

  if (isNaN(numValue)) {
    return {
      isValid: false,
      errorMessage: 'Debe ser un número válido'
    };
  }

  if (!Number.isInteger(numValue)) {
    return {
      isValid: false,
      errorMessage: 'Este campo solo acepta números enteros'
    };
  }

  // Check range
  if (min !== undefined && numValue < min) {
    return {
      isValid: false,
      errorMessage: `El valor debe ser mayor o igual a ${min}`
    };
  }

  if (max !== undefined && numValue > max) {
    return {
      isValid: false,
      errorMessage: `El valor debe ser menor o igual a ${max}`
    };
  }

  return {
    isValid: true,
    sanitizedValue: numValue
  };
}

/**
 * Validate FLOAT values
 * - Allows decimal numbers
 * - Configurable decimal precision (default: 2)
 * - Optional min/max range
 */
export function validateFloat(
  value: unknown,
  options?: {
    min?: number;
    max?: number;
    decimals?: number;
    allowNull?: boolean;
  }
): ValidationResult {
  const { min, max, decimals = 2, allowNull = true } = options || {};

  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    return allowNull
      ? { isValid: true, sanitizedValue: null }
      : { isValid: false, errorMessage: 'El valor no puede estar vacío' };
  }

  // Convert to string, replace comma with dot for parsing
  const strValue = String(value).trim().replace(',', '.');

  // Check if it's a valid number
  const numValue = Number(strValue);

  if (isNaN(numValue)) {
    return {
      isValid: false,
      errorMessage: 'Debe ser un número válido'
    };
  }

  // Check range
  if (min !== undefined && numValue < min) {
    return {
      isValid: false,
      errorMessage: `El valor debe ser mayor o igual a ${min}`
    };
  }

  if (max !== undefined && numValue > max) {
    return {
      isValid: false,
      errorMessage: `El valor debe ser menor o igual a ${max}`
    };
  }

  // Round to specified decimal places
  const multiplier = Math.pow(10, decimals);
  const roundedValue = Math.round(numValue * multiplier) / multiplier;

  return {
    isValid: true,
    sanitizedValue: roundedValue
  };
}

/**
 * Validate DATE values
 * - Format: DD/MM/YYYY
 * - Validates actual calendar dates (no Feb 30, etc.)
 * - Optional min/max date range
 */
export function validateDate(
  value: unknown,
  options?: {
    minDate?: Date;
    maxDate?: Date;
    allowNull?: boolean;
  }
): ValidationResult {
  const { minDate, maxDate, allowNull = true } = options || {};

  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    return allowNull
      ? { isValid: true, sanitizedValue: null }
      : { isValid: false, errorMessage: 'La fecha no puede estar vacía' };
  }

  let dateValue: Date;

  if (value instanceof Date) {
    dateValue = value;
  } else {
    const strValue = String(value).trim();

    // Accept flexible formats: D/M/YYYY, DD/M/YYYY, D/MM/YYYY, DD/MM/YYYY
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = strValue.match(dateRegex);

    if (!match) {
      return {
        isValid: false,
        errorMessage: 'Formato de fecha inválido. Use DD/MM/YYYY o D/M/YYYY'
      };
    }

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    // Validate day and month ranges
    if (day < 1 || day > 31) {
      return {
        isValid: false,
        errorMessage: 'Día inválido. Debe estar entre 1 y 31'
      };
    }

    if (month < 1 || month > 12) {
      return {
        isValid: false,
        errorMessage: 'Mes inválido. Debe estar entre 1 y 12'
      };
    }

    // Create date (month is 0-indexed in JS)
    dateValue = new Date(year, month - 1, day);

    // Validate it's a real date (handles Feb 30, Apr 31, etc.)
    if (
      dateValue.getFullYear() !== year ||
      dateValue.getMonth() !== month - 1 ||
      dateValue.getDate() !== day
    ) {
      return {
        isValid: false,
        errorMessage: 'Fecha inválida. Verifique día, mes y año'
      };
    }
  }

  // Check range
  if (minDate && dateValue < minDate) {
    return {
      isValid: false,
      errorMessage: `La fecha debe ser posterior a ${formatDateDDMMYYYY(minDate)}`
    };
  }

  if (maxDate && dateValue > maxDate) {
    return {
      isValid: false,
      errorMessage: `La fecha debe ser anterior a ${formatDateDDMMYYYY(maxDate)}`
    };
  }

  return {
    isValid: true,
    sanitizedValue: dateValue
  };
}

/**
 * Validate STRING values
 * - Optional length constraints
 * - Optional regex pattern
 */
export function validateString(
  value: unknown,
  options?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    patternDescription?: string;
    allowNull?: boolean;
  }
): ValidationResult {
  const {
    minLength,
    maxLength,
    pattern,
    patternDescription,
    allowNull = true
  } = options || {};

  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    return allowNull
      ? { isValid: true, sanitizedValue: null }
      : { isValid: false, errorMessage: 'El valor no puede estar vacío' };
  }

  const strValue = String(value).trim();

  // Check length
  if (minLength !== undefined && strValue.length < minLength) {
    return {
      isValid: false,
      errorMessage: `Debe tener al menos ${minLength} caracteres`
    };
  }

  if (maxLength !== undefined && strValue.length > maxLength) {
    return {
      isValid: false,
      errorMessage: `No puede exceder ${maxLength} caracteres`
    };
  }

  // Check pattern
  if (pattern && !pattern.test(strValue)) {
    return {
      isValid: false,
      errorMessage: patternDescription || 'Formato inválido'
    };
  }

  return {
    isValid: true,
    sanitizedValue: strValue
  };
}

/**
 * Generic validator that routes to specific type validator
 */
export function validateByDataType(
  value: unknown,
  dataType: 'string' | 'integer' | 'float' | 'date',
  options?: Record<string, unknown>
): ValidationResult {
  switch (dataType) {
    case 'integer':
      return validateInteger(value, options);
    case 'float':
      return validateFloat(value, options);
    case 'date':
      return validateDate(value, options);
    case 'string':
      return validateString(value, options);
    default:
      return {
        isValid: false,
        errorMessage: `Tipo de dato desconocido: ${dataType}`
      };
  }
}

/**
 * Helper: Format date as DD/MM/YYYY
 */
function formatDateDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Parse user input and sanitize for database storage
 * This function ensures that user inputs are converted to the correct type
 * before being stored in the database.
 */
export function parseAndSanitizeValue(
  value: unknown,
  dataType: 'string' | 'integer' | 'float' | 'date'
): unknown {
  const result = validateByDataType(value, dataType);

  if (!result.isValid) {
    throw new Error(result.errorMessage);
  }

  return result.sanitizedValue;
}
