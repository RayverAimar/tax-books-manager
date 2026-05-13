import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  DATA_EVENTS,
  emitDataImported,
  emitDataDeleted,
  emitDataUpdated,
  useDataChangeListener,
  useDataImportListener
} from '../data-events';

describe('emit helpers', () => {
  it('emitDataImported dispatches CustomEvent with detail', () => {
    const handler = vi.fn();
    window.addEventListener(DATA_EVENTS.DATA_IMPORTED, handler);
    emitDataImported('sales', '202401', 5, 'single-file');
    expect(handler).toHaveBeenCalled();
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toMatchObject({
      type: 'sales',
      period: '202401',
      recordCount: 5,
      source: 'single-file'
    });
    window.removeEventListener(DATA_EVENTS.DATA_IMPORTED, handler);
  });

  it('emitDataDeleted dispatches with detail', () => {
    const handler = vi.fn();
    window.addEventListener(DATA_EVENTS.DATA_DELETED, handler);
    emitDataDeleted('purchases', '202402', 2);
    expect((handler.mock.calls[0][0] as CustomEvent).detail.recordCount).toBe(2);
    window.removeEventListener(DATA_EVENTS.DATA_DELETED, handler);
  });

  it('emitDataUpdated dispatches with detail', () => {
    const handler = vi.fn();
    window.addEventListener(DATA_EVENTS.DATA_UPDATED, handler);
    emitDataUpdated('sales', '202403', 9);
    expect((handler.mock.calls[0][0] as CustomEvent).detail.recordCount).toBe(9);
    window.removeEventListener(DATA_EVENTS.DATA_UPDATED, handler);
  });
});

describe('useDataChangeListener', () => {
  it('fires callback for all three event types', () => {
    const cb = vi.fn();
    const { unmount } = renderHook(() => useDataChangeListener(cb));

    emitDataImported('sales', '202401', 1, 'single-file');
    emitDataDeleted('sales', '202401', 1);
    emitDataUpdated('sales', '202401', 1);
    expect(cb).toHaveBeenCalledTimes(3);

    unmount();
    emitDataImported('sales', '202401', 1, 'single-file');
    expect(cb).toHaveBeenCalledTimes(3); // unmount cleaned up
  });
});

describe('useDataImportListener', () => {
  it('only fires for import events', () => {
    const cb = vi.fn();
    const { unmount } = renderHook(() => useDataImportListener(cb));
    emitDataImported('sales', '202401', 1, 'bulk-zip');
    emitDataDeleted('sales', '202401', 1);
    expect(cb).toHaveBeenCalledTimes(1);
    unmount();
  });
});
