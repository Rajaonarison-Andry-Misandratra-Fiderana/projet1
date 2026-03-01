import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CartItem } from '../models/cart.model';
import { Product } from '../models/product.model';
import { getEntityId } from '../utils/id.util';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly storageKey = 'shoppingMallCart';
  private readonly itemsSubject = new BehaviorSubject<CartItem[]>(this.readFromStorage());
  readonly items$ = this.itemsSubject.asObservable();

  getItems(): CartItem[] {
    return this.itemsSubject.value;
  }

  getTotalQuantity(): number {
    return this.itemsSubject.value.reduce((total, item) => total + item.quantity, 0);
  }

  getTotalAmount(): number {
    return this.itemsSubject.value.reduce(
      (total, item) => total + item.quantity * item.product.price,
      0,
    );
  }

  addProduct(product: Product, quantity = 1): void {
    const productId = getEntityId(product);
    if (!productId || quantity <= 0) return;
    const maxStock = Math.max(product.stock || 0, 0);
    if (maxStock <= 0) return;

    const current = [...this.itemsSubject.value];
    const index = current.findIndex((item) => getEntityId(item.product) === productId);

    if (index >= 0) {
      const existing = current[index];
      const existingMaxStock = Math.max(existing.product.stock || 0, 0);
      const nextQuantity = Math.min(
        existing.quantity + quantity,
        existingMaxStock || existing.quantity + quantity,
      );
      current[index] = { ...existing, product, quantity: nextQuantity };
    } else {
      const safeQuantity = Math.min(Math.max(1, quantity), maxStock);
      current.push({ product, quantity: safeQuantity });
    }

    this.persist(current);
  }

  removeProduct(productId: string): void {
    if (!productId) return;
    const next = this.itemsSubject.value.filter((item) => getEntityId(item.product) !== productId);
    this.persist(next);
  }

  updateQuantity(productId: string, quantity: number): void {
    if (!productId) return;

    if (quantity <= 0) {
      this.removeProduct(productId);
      return;
    }

    const next = this.itemsSubject.value.map((item) => {
      if (getEntityId(item.product) !== productId) return item;
      const maxStock = Math.max(item.product.stock || 0, 0);
      const safeQuantity = Math.min(quantity, maxStock || quantity);
      return { ...item, quantity: safeQuantity };
    });

    this.persist(next);
  }

  clear(): void {
    this.persist([]);
  }

  private persist(items: CartItem[]): void {
    this.itemsSubject.next(items);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(items));
    }
  }

  private readFromStorage(): CartItem[] {
    if (typeof localStorage === 'undefined') return [];

    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as CartItem[];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item) => !!item && !!item.product && item.quantity > 0);
    } catch {
      return [];
    }
  }
}
