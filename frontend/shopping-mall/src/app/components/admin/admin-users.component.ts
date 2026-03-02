import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { EMPTY, Subject, forkJoin, fromEvent, merge, of, timer } from 'rxjs';
import { catchError, filter, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { SellerModerationService } from '../../services/seller-moderation.service';
import { OrderService } from '../../services/order.service';
import { ProductService } from '../../services/product.service';
import { User } from '../../models/user.model';
import { getEntityId } from '../../utils/id.util';

type UserRow = {
  user: User;
  id: string;
  banned: boolean;
};

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="users-page">
      <header class="page-head">
        <div>
          <h1>Gestion des utilisateurs</h1>
          <p>Données récupérées depuis meanapp: name, email, role.</p>
        </div>
        <button type="button" class="btn-refresh" (click)="refreshNow()" [disabled]="loading">
          Actualiser
        </button>
      </header>

      <div class="toolbar">
        <input
          class="search-input"
          type="text"
          placeholder="Recherche (name, email, role)..."
          [(ngModel)]="searchQuery"
          (ngModelChange)="applyFilters()"
        />
      </div>

      <div *ngIf="loading" class="panel">Chargement des utilisateurs...</div>
      <div *ngIf="error" class="panel error">{{ error }}</div>

      <div class="table-wrap" *ngIf="!loading && !error">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of filteredRows">
              <td>{{ row.user.name || '-' }}</td>
              <td>{{ row.user.email || '-' }}</td>
              <td>{{ row.user.role || '-' }}</td>
              <td>
                <span
                  class="badge"
                  [class.badge-danger]="row.banned"
                  [class.badge-ok]="!row.banned"
                >
                  {{ row.banned ? 'Banni' : 'Actif' }}
                </span>
              </td>
              <td>
                <button
                  *ngIf="!row.banned"
                  type="button"
                  class="btn-ban"
                  (click)="banUser(row)"
                  [disabled]="isCurrentAdmin(row)"
                >
                  Ban
                </button>
                <button *ngIf="row.banned" type="button" class="btn-unban" (click)="unbanUser(row)">
                  Déban
                </button>
                <button type="button" class="btn-history" (click)="openHistoryModal(row)">
                  Historique
                </button>
                <button
                  type="button"
                  class="btn-delete"
                  (click)="deleteUser(row)"
                  [disabled]="isCurrentAdmin(row)"
                >
                  Supprimer
                </button>
              </td>
            </tr>
            <tr *ngIf="filteredRows.length === 0">
              <td colspan="5" class="empty">Aucun utilisateur trouvé.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- History Modal -->
      <div class="modal-overlay" *ngIf="showHistoryModal && selectedUserHistory">
        <div class="modal">
          <div class="modal-header">
            <h2>Historique de {{ selectedUserHistory.user.name }}</h2>
            <button type="button" class="btn-close" (click)="closeHistoryModal()">×</button>
          </div>
          <div class="modal-body">
            <div *ngIf="historyLoading" class="empty-msg">Chargement de l'historique...</div>
            <div *ngIf="historyError" class="panel error">{{ historyError }}</div>

            <ng-container *ngIf="!historyLoading && !historyError">
              <!-- User Info -->
              <div class="info-section">
                <h3>Informations</h3>
                <p><strong>Nom:</strong> {{ selectedUserHistory.user.name }}</p>
                <p><strong>Email:</strong> {{ selectedUserHistory.user.email }}</p>
                <p><strong>Rôle:</strong> {{ selectedUserHistory.user.role }}</p>
                <p>
                  <strong>Inscrit:</strong>
                  {{ selectedUserHistory.user.createdAt | date: 'dd/MM/yyyy HH:mm' }}
                </p>
              </div>

              <!-- Orders -->
              <div class="info-section">
                <h3>Commandes ({{ selectedUserHistory.orders.length }})</h3>
                <div *ngIf="selectedUserHistory.orders.length === 0" class="empty-msg">
                  Aucune commande
                </div>
                <ul class="list-items" *ngIf="selectedUserHistory.orders.length > 0">
                  <li *ngFor="let order of selectedUserHistory.orders" class="list-item">
                    <strong>{{ order.id }}</strong> — {{ order.quantity }} produit(s) •
                    {{ order.totalPrice | number: '1.0-0' }} MGA
                    <span class="status" [class]="'status-' + order.orderStatus">{{
                      order.orderStatus
                    }}</span>
                  </li>
                </ul>
              </div>

              <!-- Products -->
              <div class="info-section">
                <h3>Produits créés ({{ selectedUserHistory.products.length }})</h3>
                <div *ngIf="selectedUserHistory.products.length === 0" class="empty-msg">
                  Aucun produit
                </div>
                <ul class="list-items" *ngIf="selectedUserHistory.products.length > 0">
                  <li *ngFor="let prod of selectedUserHistory.products" class="list-item">
                    <strong>{{ prod.name }}</strong> — {{ prod.price | number: '1.0-0' }} MGA •
                    Stock:
                    {{ prod.stock }}
                  </li>
                </ul>
              </div>
            </ng-container>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" (click)="closeHistoryModal()">
              Fermer
            </button>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .users-page {
        max-width: 1100px;
        margin: 1.4rem auto;
        padding: 0 1rem;
      }
      .page-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.8rem;
      }
      .page-head h1 {
        margin: 0;
        color: #10243a;
      }
      .page-head p {
        margin: 0.25rem 0 0;
        color: #4f6b84;
      }
      .btn-refresh {
        border: 0;
        border-radius: 10px;
        padding: 0.6rem 0.9rem;
        background: linear-gradient(120deg, #0f5e9c, #0d86b8);
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }
      .toolbar {
        margin-top: 0.9rem;
      }
      .search-input {
        width: 100%;
        border: 1px solid #c9dced;
        border-radius: 10px;
        padding: 0.6rem 0.7rem;
        font: inherit;
      }
      .panel {
        margin-top: 0.9rem;
        border: 1px solid #d5e4f1;
        border-radius: 12px;
        background: #fff;
        padding: 0.85rem 0.95rem;
      }
      .panel.error {
        border-color: #efc9c9;
        background: #fdecec;
        color: #932d2d;
      }
      .table-wrap {
        margin-top: 0.9rem;
        border: 1px solid #d5e4f1;
        border-radius: 14px;
        background: #fff;
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 680px;
      }
      th,
      td {
        text-align: left;
        padding: 0.72rem 0.58rem;
        border-bottom: 1px solid #e8f1f8;
      }
      th {
        color: #59728a;
        font-size: 0.78rem;
        text-transform: uppercase;
      }
      .badge {
        border-radius: 999px;
        padding: 0.2rem 0.55rem;
        font-size: 0.75rem;
        font-weight: 700;
      }
      .badge-ok {
        background: #e9f8f0;
        color: #1d7d53;
      }
      .badge-danger {
        background: #fdecec;
        color: #9d2d2d;
      }
      .btn-ban,
      .btn-unban {
        border: 0;
        border-radius: 8px;
        padding: 0.4rem 0.6rem;
        font-weight: 700;
        cursor: pointer;
      }
      .btn-ban {
        background: #fdecec;
        color: #992f2f;
      }
      .btn-unban {
        background: #e9f8f0;
        color: #1d7d53;
      }
      .empty {
        text-align: center;
        color: #5d768f;
      }
      .btn-history,
      .btn-delete {
        border: 0;
        border-radius: 8px;
        padding: 0.4rem 0.6rem;
        font-weight: 700;
        cursor: pointer;
        margin-left: 0.3rem;
        font-size: 1rem;
      }
      .btn-history {
        background: #e8f4fd;
        color: #0f5e9c;
      }
      .btn-history:hover {
        background: #d0e8fa;
      }
      .btn-delete {
        background: #fdecec;
        color: #992f2f;
      }
      .btn-delete:hover {
        background: #fbd8d8;
      }
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
      }
      .modal {
        background: white;
        border-radius: 12px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid #e8f1f8;
      }
      .modal-header h2 {
        margin: 0;
        color: #10243a;
        font-size: 1.3rem;
      }
      .btn-close {
        border: 0;
        background: transparent;
        font-size: 1.8rem;
        cursor: pointer;
        color: #7a8fa3;
      }
      .modal-body {
        padding: 1.5rem;
      }
      .info-section {
        margin-bottom: 1.5rem;
      }
      .info-section h3 {
        margin: 0 0 0.8rem;
        color: #10243a;
        font-size: 1rem;
      }
      .info-section p {
        margin: 0.4rem 0;
        color: #4f6b84;
        font-size: 0.9rem;
      }
      .empty-msg {
        color: #7a8fa3;
        font-style: italic;
        padding: 0.5rem;
      }
      .list-items {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .list-item {
        padding: 0.6rem 0.8rem;
        margin-bottom: 0.5rem;
        background: #f8f9fa;
        border-radius: 6px;
        color: #4f6b84;
        font-size: 0.85rem;
      }
      .status {
        display: inline-block;
        margin-left: 0.5rem;
        padding: 0.2rem 0.4rem;
        border-radius: 4px;
        font-weight: 700;
        font-size: 0.7rem;
        text-transform: uppercase;
      }
      .status-completed {
        background: #e9f8f0;
        color: #1d7d53;
      }
      .status-pending {
        background: #fef3e5;
        color: #8b5a00;
      }
      .modal-footer {
        padding: 1.5rem;
        border-top: 1px solid #e8f1f8;
        display: flex;
        justify-content: flex-end;
        gap: 0.6rem;
      }
      .btn-secondary {
        border: 1px solid #c9dced;
        border-radius: 8px;
        padding: 0.5rem 1rem;
        background: white;
        color: #4f6b84;
        cursor: pointer;
        font-weight: 700;
      }
      .btn-secondary:hover {
        background: #f8f9fa;
      }
    `,
  ],
})
export class AdminUsersComponent implements OnInit, OnDestroy {
  rows: UserRow[] = [];
  filteredRows: UserRow[] = [];
  loading = true;
  error = '';
  searchQuery = '';
  apiBaseUrl = '';
  showHistoryModal = false;
  selectedUserHistory: any = null;
  historyLoading = false;
  historyError = '';

  private currentAdminId = '';
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private moderationService: SellerModerationService,
    private orderService: OrderService,
    private productService: ProductService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.apiBaseUrl = this.authService.apiBaseUrl;
    this.currentAdminId = getEntityId(this.authService.currentUserValue);
    this.loadUsers(true);
    const focus$ = typeof window !== 'undefined' ? fromEvent(window, 'focus') : EMPTY;
    const visibility$ =
      typeof document !== 'undefined'
        ? fromEvent(document, 'visibilitychange').pipe(filter(() => !document.hidden))
        : EMPTY;

    merge(
      this.authService.usersRefresh$,
      this.moderationService.refresh$,
      this.productService.refresh$,
      this.orderService.refresh$,
      timer(5000, 5000),
      focus$,
      visibility$,
      this.router.events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        filter((event) => event.urlAfterRedirects.startsWith('/admin/users')),
      ),
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadUsers(false));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers(showLoader = true): void {
    if (showLoader) this.loading = true;
    this.error = '';

    this.authService.getAllUsers().subscribe({
      next: (users) => {
        const bannedIds = new Set(this.moderationService.getBannedUserIds());
        this.rows = users.map((user) => {
          const id = getEntityId(user);
          return {
            user,
            id,
            banned: !!id && bannedIds.has(id),
          } as UserRow;
        });
        this.applyFilters();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (err?.status === 401 || err?.status === 403) {
          this.error = `Accès refusé (${err?.status}) sur ${this.apiBaseUrl}/users. Connectez-vous avec un compte admin.`;
        } else if (err?.status === 0) {
          this.error = `API meanapp inaccessible: ${this.apiBaseUrl}`;
        } else {
          this.error = err?.error?.message || 'Impossible de charger les utilisateurs.';
        }
        this.loading = false;
      },
    });
  }

  refreshNow(): void {
    this.loadUsers(true);
  }

  applyFilters(): void {
    const q = this.normalize(this.searchQuery);
    this.filteredRows = this.rows.filter((row) => {
      if (!q) return true;
      const haystack = this.normalize(
        `${row.user.name || ''} ${row.user.email || ''} ${row.user.role || ''}`,
      );
      return haystack.includes(q);
    });
  }

  banUser(row: UserRow): void {
    if (!row.id || this.isCurrentAdmin(row)) return;
    this.moderationService.banUser(row.id);
    this.loadUsers(false);
  }

  unbanUser(row: UserRow): void {
    if (!row.id) return;
    this.moderationService.unbanUser(row.id);
    this.loadUsers(false);
  }

  isCurrentAdmin(row: UserRow): boolean {
    return !!row.id && row.id === this.currentAdminId;
  }

  private normalize(value: string): string {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  openHistoryModal(row: UserRow): void {
    this.historyLoading = true;
    this.historyError = '';
    this.selectedUserHistory = { user: row.user, orders: [], products: [] };
    this.showHistoryModal = true;

    const userId = getEntityId(row.user);
    const orders$ = this.orderService.getAllOrders().pipe(catchError(() => of([] as any[])));
    const products$ =
      row.user.role === 'boutique'
        ? this.productService.getProductsByShop(userId).pipe(catchError(() => of([] as any[])))
        : of([] as any[]);

    forkJoin({ allOrders: orders$, products: products$ }).subscribe({
      next: ({ allOrders, products }) => {
        const userId = getEntityId(row.user);
        this.selectedUserHistory.orders = allOrders
          .filter((o: any) => getEntityId(o.buyer) === userId)
          .map((o: any) => ({
            id: o.orderNumber || getEntityId(o),
            quantity: Array.isArray(o.items)
              ? o.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
              : 0,
            totalPrice: o.totalAmount || 0,
            orderStatus: o.status || 'pending',
          }));
        this.selectedUserHistory.products = products || [];
        this.historyLoading = false;
      },
      error: () => {
        this.historyLoading = false;
        this.historyError = 'Impossible de charger l’historique.';
      },
    });
  }

  closeHistoryModal(): void {
    this.showHistoryModal = false;
    this.selectedUserHistory = null;
    this.historyLoading = false;
    this.historyError = '';
  }

  deleteUser(row: UserRow): void {
    if (!row.id || this.isCurrentAdmin(row)) return;
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${row.user.name} (${row.user.email}) ?`))
      return;

    this.authService.deleteUser(row.id).subscribe({
      next: () => {
        this.rows = this.rows.filter((r) => r.id !== row.id);
        this.applyFilters();
      },
      error: (err) => {
        alert(`Erreur: ${err?.error?.message || "Impossible de supprimer l'utilisateur"}`);
      },
    });
  }
}
