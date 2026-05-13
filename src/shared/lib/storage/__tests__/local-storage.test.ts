import { describe, it, expect, beforeEach } from 'vitest';
import {
  StorageKeys,
  getStorageValue,
  setStorageValue,
  removeStorageValue,
  getCurrentPeriod,
  getActiveCompanyId,
  setActiveCompanyId,
  getSelectedPeriod,
  setSelectedPeriod,
  clearAppStorage
} from '../local-storage';

describe('local-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips a string value', () => {
    setStorageValue(StorageKeys.ACTIVE_COMPANY_ID, '42');
    expect(getStorageValue(StorageKeys.ACTIVE_COMPANY_ID)).toBe('42');
  });

  it('returns null for missing key', () => {
    expect(getStorageValue(StorageKeys.SELECTED_PERIOD)).toBeNull();
  });

  it('removes value', () => {
    setStorageValue(StorageKeys.ACTIVE_COMPANY_ID, '7');
    removeStorageValue(StorageKeys.ACTIVE_COMPANY_ID);
    expect(getStorageValue(StorageKeys.ACTIVE_COMPANY_ID)).toBeNull();
  });

  it('getActiveCompanyId parses int', () => {
    setActiveCompanyId(99);
    expect(getActiveCompanyId()).toBe(99);
  });

  it('getActiveCompanyId returns null when missing', () => {
    expect(getActiveCompanyId()).toBeNull();
  });

  it('getSelectedPeriod falls back to current period', () => {
    const result = getSelectedPeriod();
    expect(result).toMatch(/^\d{6}$/);
  });

  it('getSelectedPeriod returns stored value when present', () => {
    setSelectedPeriod('202412');
    expect(getSelectedPeriod()).toBe('202412');
  });

  it('clearAppStorage removes both keys', () => {
    setActiveCompanyId(1);
    setSelectedPeriod('202401');
    clearAppStorage();
    expect(localStorage.getItem(StorageKeys.ACTIVE_COMPANY_ID)).toBeNull();
    expect(localStorage.getItem(StorageKeys.SELECTED_PERIOD)).toBeNull();
  });

  it('getCurrentPeriod returns 6-digit YYYYMM', () => {
    expect(getCurrentPeriod()).toMatch(/^\d{6}$/);
  });

  it('getCurrentPeriod uses previous month', () => {
    const period = getCurrentPeriod();
    const year = parseInt(period.substring(0, 4));
    const month = parseInt(period.substring(4, 6));
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
    expect(year).toBeGreaterThanOrEqual(2024);
  });
});
