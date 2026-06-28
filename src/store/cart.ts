'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  variantId?: string
  variantName?: string
  name: string
  sku: string
  price: number
  image: string
  quantity: number
  stock: number
}

// Unique key per product+variant combination
function itemKey(productId: string, variantId?: string) {
  return variantId ? `${productId}:${variantId}` : productId
}

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string, variantId?: string) => void
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void
  clearCart: () => void
  total: () => number
  itemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem) => {
        const key = itemKey(newItem.productId, newItem.variantId)
        set((state) => {
          const existing = state.items.find(i => itemKey(i.productId, i.variantId) === key)
          if (existing) {
            return {
              items: state.items.map(i =>
                itemKey(i.productId, i.variantId) === key
                  ? { ...i, quantity: Math.min(i.quantity + newItem.quantity, i.stock) }
                  : i
              )
            }
          }
          return { items: [...state.items, newItem] }
        })
      },

      removeItem: (productId, variantId) => {
        const key = itemKey(productId, variantId)
        set((state) => ({
          items: state.items.filter(i => itemKey(i.productId, i.variantId) !== key)
        }))
      },

      updateQuantity: (productId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId)
          return
        }
        const key = itemKey(productId, variantId)
        set((state) => ({
          items: state.items.map(i =>
            itemKey(i.productId, i.variantId) === key ? { ...i, quantity } : i
          )
        }))
      },

      clearCart: () => set({ items: [] }),

      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'reptiplus-cart' }
  )
)
