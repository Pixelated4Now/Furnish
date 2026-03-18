import { create } from "zustand";

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
  currentUserId: string | null;
  addItem: (product: Omit<CartItem, "quantity">, variant?: string) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

function storageKey(userId: string) {
  return `cart_${userId}`;
}

function persistItems(userId: string | null, items: CartItem[]) {
  if (userId && typeof window !== "undefined") {
    localStorage.setItem(storageKey(userId), JSON.stringify(items));
  }
}

/** Load a user's cart from localStorage and set it as the active cart. */
export function initCart(userId: string) {
  const key = storageKey(userId);
  let items: CartItem[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(key);
      items = raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      items = [];
    }
  }
  useCartStore.setState({ items, currentUserId: userId });
}

/** Explicitly write the given items to localStorage under the user's key. */
export function saveCart(userId: string, items: CartItem[]) {
  persistItems(userId, items);
}

/** Clear the in-memory cart without touching localStorage (used on logout). */
export function clearLocalCart() {
  useCartStore.setState({ items: [], currentUserId: null });
}

export const useCartStore = create<CartStore>()((set, get) => ({
  items: [],
  currentUserId: null,

  addItem(product, variant) {
    set((state) => {
      const existing = state.items.find(
        (i) => i.productId === product.productId && i.variant === (variant ?? undefined)
      );
      const items: CartItem[] = existing
        ? state.items.map((i) =>
            i.productId === product.productId && i.variant === existing.variant
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        : [...state.items, { ...product, quantity: 1, variant: variant ?? undefined }];
      persistItems(state.currentUserId, items);
      return { items };
    });
  },

  removeItem(productId) {
    set((state) => {
      const items = state.items.filter((i) => i.productId !== productId);
      persistItems(state.currentUserId, items);
      return { items };
    });
  },

  updateQuantity(productId, quantity) {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set((state) => {
      const items = state.items.map((i) =>
        i.productId === productId ? { ...i, quantity } : i
      );
      persistItems(state.currentUserId, items);
      return { items };
    });
  },

  clearCart() {
    set((state) => {
      persistItems(state.currentUserId, []);
      return { items: [] };
    });
  },

  getTotalPrice() {
    return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  },

  getTotalItems() {
    return get().items.reduce((sum, i) => sum + i.quantity, 0);
  },
}));
