import { create } from 'zustand'
import type { WidgetInstance } from '../types/widgets'

type DashboardState = {
  items: WidgetInstance[]
  editing: boolean
  dirty: Set<number>
  setEditing: (v: boolean) => void
  setItems: (items: WidgetInstance[]) => void
  addTemp: (item: WidgetInstance) => void
  replaceId: (tempId: number, realId: number) => void
  updateItemLayout: (id: number, patch: Pick<WidgetInstance, 'x' | 'y' | 'w' | 'h'>) => void
  updateItemConfig: (id: number, config: Record<string, unknown>) => void
  remove: (id: number) => void
  markDirty: (id: number) => void
  clearDirty: (ids?: number[]) => void
  reset: () => void
  seed: () => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  items: [],
  editing: false,
  dirty: new Set<number>(),
  setEditing: (v) => set({ editing: v }),
  setItems: (items) => set({ items }),
  addTemp: (item) => set((s) => ({ items: [...s.items, item] })),
  replaceId: (tempId, realId) =>
    set((s) => {
      const items = s.items.map((i) => (i.id === tempId ? { ...i, id: realId } : i))
      const dirty = new Set(s.dirty)
      dirty.delete(tempId)
      return { items, dirty }
    }),
  updateItemLayout: (id, patch) =>
    set((s) => {
      const items = s.items.map((i) => (i.id === id ? { ...i, ...patch } : i))
      const dirty = new Set(s.dirty)
      dirty.add(id)
      return { items, dirty }
    }),
  updateItemConfig: (id, config) =>
    set((s) => {
      const items = s.items.map((i) => (i.id === id ? { ...i, config: { ...i.config, ...config } } : i))
      const dirty = new Set(s.dirty)
      dirty.add(id)
      return { items, dirty }
    }),
  remove: (id) =>
    set((s) => {
      const items = s.items.filter((i) => i.id !== id)
      const dirty = new Set(s.dirty)
      dirty.delete(id)
      return { items, dirty }
    }),
  markDirty: (id) =>
    set((s) => {
      const dirty = new Set(s.dirty)
      dirty.add(id)
      return { dirty }
    }),
  clearDirty: (ids) =>
    set((s) => {
      if (!ids || ids.length === 0) return { dirty: new Set<number>() }
      const dirty = new Set(s.dirty)
      ids.forEach((id) => dirty.delete(id))
      return { dirty }
    }),
  reset: () => set({ items: [], editing: false, dirty: new Set<number>() }),
  seed: () =>
    set(() => ({
      items: [
        { id: 1, type: 'stock', config: { symbol: 'AAPL', interval: '1m' }, x: 0, y: 0, w: 4, h: 8 },
        { id: 2, type: 'crypto', config: { symbol: 'BTC-USD', interval: '1m' }, x: 4, y: 0, w: 4, h: 8 },
        { id: 3, type: 'portfolio', config: {}, x: 8, y: 0, w: 4, h: 12 }
      ]
    }))
}))

export const useEditing = () => useDashboardStore((s) => s.editing)
export const useItems = () => useDashboardStore((s) => s.items)
export const useDirty = () => useDashboardStore((s) => s.dirty)
