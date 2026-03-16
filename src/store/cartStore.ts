import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  quantity: number;
  variant?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (
    product: Omit<CartItem, "quantity">,
    variant?: string
  ) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem(product, variant) {
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === product.productId && i.variant === (variant ?? undefined)
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === product.productId && i.variant === existing.variant
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { ...product, quantity: 1, variant: variant ?? undefined },
            ],
          };
        });
      },

      removeItem(productId) {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));
      },

      updateQuantity(productId, quantity) {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        }));
      },

      clearCart() {
        set({ items: [] });
      },

      getTotalPrice() {
        return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      },

      getTotalItems() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },
    }),
    { name: "furnish-cart" }
  )
);
