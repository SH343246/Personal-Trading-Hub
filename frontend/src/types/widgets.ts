export type WidgetType = 'stock' | 'crypto' | 'portfolio' | 'sparkline' | 'watchlist'

export type WidgetInstance = {
  id: number
  type: WidgetType
  config: Record<string, unknown>
  x: number
  y: number
  w: number
  h: number
}
