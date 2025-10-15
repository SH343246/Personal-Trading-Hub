// src/api/widgets.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { WidgetInstance } from '../types/widgets'

const BASE = '/api' //Helpers for getting/sending json
async function getJSON<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include' })
  if (!response.ok) throw new Error('http error')
  return response.json()
}
async function sendJSON<T>(url: string, method: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' })
  if (!response.ok) throw new Error('http error')
  return response.json()
}

export function useWidgetsQuery() {
  return useQuery({ queryKey: ['widgets'], queryFn: () => getJSON<WidgetInstance[]>(`${BASE}/widgets/me`) })
}

export type Patch = { id: number; x: number; y: number; w: number; h: number }
export function usePatchLayout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patches: Patch[]) => sendJSON<void>(`${BASE}/widgets/me/layout`, 'PATCH', { patches }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['widgets'] })
  })
}
