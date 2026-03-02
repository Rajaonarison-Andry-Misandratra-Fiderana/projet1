import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SellerModerationService {
  private readonly storageKey = 'shoppingMallBannedUsers';
  private readonly refreshSubject = new Subject<void>();
  readonly refresh$ = this.refreshSubject.asObservable();

  getBannedUserIds(): string[] {
    const raw = this.safeGet(this.storageKey);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string' && !!id) : [];
    } catch {
      return [];
    }
  }

  isUserBanned(userId: string): boolean {
    if (!userId) return false;
    return this.getBannedUserIds().includes(userId);
  }

  banUser(userId: string): void {
    if (!userId) return;
    const current = this.getBannedUserIds();
    if (current.includes(userId)) return;
    const next = [...current, userId];
    this.persist(next);
  }

  unbanUser(userId: string): void {
    if (!userId) return;
    const next = this.getBannedUserIds().filter((id) => id !== userId);
    this.persist(next);
  }

  // Backward compatibility
  getBannedSellerIds(): string[] {
    return this.getBannedUserIds();
  }

  isSellerBanned(sellerId: string): boolean {
    return this.isUserBanned(sellerId);
  }

  banSeller(sellerId: string): void {
    this.banUser(sellerId);
  }

  unbanSeller(sellerId: string): void {
    this.unbanUser(sellerId);
  }

  private persist(ids: string[]): void {
    this.safeSet(this.storageKey, JSON.stringify(ids));
    this.refreshSubject.next();
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
