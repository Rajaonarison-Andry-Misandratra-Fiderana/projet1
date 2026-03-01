import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { CartItem } from '../models/cart.model';
import { getEntityId } from '../utils/id.util';

type TransferMap = Record<string, number>;
type SoldMap = Record<string, number>;

@Injectable({
  providedIn: 'root',
})
export class CommerceSyncService {
  private readonly transferKey = 'shoppingMallSellerTransfers';
  private readonly soldKey = 'shoppingMallSoldOffsets';
  private readonly refreshSubject = new Subject<void>();
  readonly refresh$ = this.refreshSubject.asObservable();

  recordValidatedPayment(items: CartItem[]): void {
    if (!items.length) return;

    const transfers = this.readTransfers();
    const sold = this.readSoldOffsets();

    for (const item of items) {
      const productId = getEntityId(item.product);
      const shopId =
        typeof item.product.shop === 'string' ? item.product.shop : getEntityId(item.product.shop);

      if (!productId || !shopId || item.quantity <= 0) continue;

      const amount = (item.product.price || 0) * item.quantity;
      transfers[shopId] = (transfers[shopId] || 0) + amount;
      sold[productId] = (sold[productId] || 0) + item.quantity;
    }

    this.writeTransfers(transfers);
    this.writeSoldOffsets(sold);
    this.refreshSubject.next();
  }

  getTransferredAmountForShop(shopId: string): number {
    if (!shopId) return 0;
    const transfers = this.readTransfers();
    return transfers[shopId] || 0;
  }

  applyStockOffset(stock: number, productId: string): number {
    if (!productId) return stock;
    const sold = this.readSoldOffsets();
    const offset = sold[productId] || 0;
    return Math.max(0, (stock || 0) - offset);
  }

  private readTransfers(): TransferMap {
    const raw = this.safeGet(this.transferKey);
    if (!raw) return {};

    try {
      const parsed = JSON.parse(raw) as TransferMap;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private writeTransfers(value: TransferMap): void {
    this.safeSet(this.transferKey, JSON.stringify(value));
  }

  private readSoldOffsets(): SoldMap {
    const raw = this.safeGet(this.soldKey);
    if (!raw) return {};

    try {
      const parsed = JSON.parse(raw) as SoldMap;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private writeSoldOffsets(value: SoldMap): void {
    this.safeSet(this.soldKey, JSON.stringify(value));
  }

  private safeGet(key: string): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  }

  private safeSet(key: string, value: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  }
}
