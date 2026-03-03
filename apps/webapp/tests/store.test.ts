// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { useStore } from '@/lib/store';
import { renderHook, act } from '@testing-library/react';

describe('useStore', () => {
    it('should toggle sidebar', () => {
        const { result } = renderHook(() => useStore());

        expect(result.current.sidebarOpen).toBe(true);

        act(() => {
            result.current.toggleSidebar();
        });

        expect(result.current.sidebarOpen).toBe(false);
    });

    it('should toggle theme', () => {
        const { result } = renderHook(() => useStore());

        act(() => {
            result.current.setTheme('light');
        });

        expect(result.current.theme).toBe('light');

        act(() => {
            result.current.toggleTheme();
        });

        expect(result.current.theme).toBe('dark');
    });

    it('should select tokens', () => {
        const { result } = renderHook(() => useStore());

        act(() => {
            result.current.selectToken('t1');
        });

        expect(result.current.selectedTokenId).toBe('t1');

        act(() => {
            result.current.clearSelection();
        });

        expect(result.current.selectedTokenId).toBeNull();
    });
});
