import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { EMPTY, Subject, forkJoin, fromEvent, merge, of, timer } from 'rxjs';
import { catchError, filter, takeUntil } from 'rxjs/operators';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { Product } from '../../models/product.model';
import { User } from '../../models/user.model';
import { Order } from '../../models/order.model';
import { getEntityId } from '../../utils/id.util';

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
type PaymentStatus = 'pending' | 'completed' | 'failed';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="admin-page">
      <header class="page-head">
        <div>
          <h1>Tableau de bord Admin</h1>
          <p>Vue globale utilisateurs, produits, commandes et opérations.</p>
        </div>
        <button type="button" class="btn-refresh" (click)="loadDashboard()" [disabled]="loading">
          Actualiser
        </button>
      </header>

      <div *ngIf="error" class="alert alert-error">{{ error }}</div>

      <div class="stats-grid" *ngIf="!loading">
        <article class="stat-card">
          <p class="label">Chiffre d'affaire</p>
          <p class="value">{{ paidRevenue | number: '1.0-0' }} MGA</p>
          <p class="meta">Paiements complétés</p>
        </article>

        <article class="stat-card">
          <p class="label">Nombre de vendeurs</p>
          <p class="value">{{ boutiquesCount }}</p>
          <p class="meta">Comptes rôle boutique</p>
        </article>

        <article class="stat-card">
          <p class="label">Nombre de places encore libres</p>
          <p class="value">{{ freeSellerSlots }}</p>
          <p class="meta">Capacité vendeurs: {{ sellerCapacity }}</p>
        </article>

        <article class="stat-card success">
          <p class="label">Nombre d'acheteurs</p>
          <p class="value">{{ buyersCount }}</p>
          <p class="meta">Comptes rôle acheteur</p>
        </article>
      </div>

      <div *ngIf="loading" class="panel">Chargement des données admin...</div>

      <section *ngIf="!loading" class="grid-2">
        <article class="panel">
          <div class="panel-head">
            <h2>Dernières commandes</h2>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Acheteur</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Paiement</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let order of recentOrders">
                  <td>{{ order.orderNumber || getEntityId(order) }}</td>
                  <td>{{ getBuyerLabel(order) }}</td>
                  <td>{{ order.totalAmount | number: '1.0-0' }} MGA</td>
                  <td>
                    <select
                      [(ngModel)]="order.status"
                      [disabled]="savingOrders.has(getEntityId(order))"
                    >
                      <option value="pending">pending</option>
                      <option value="confirmed">confirmed</option>
                      <option value="shipped">shipped</option>
                      <option value="delivered">delivered</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </td>
                  <td>
                    <select
                      [(ngModel)]="order.paymentStatus"
                      [disabled]="savingOrders.has(getEntityId(order))"
                    >
                      <option value="pending">pending</option>
                      <option value="completed">completed</option>
                      <option value="failed">failed</option>
                    </select>
                  </td>
                  <td>{{ order.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td>
                    <button
                      type="button"
                      class="btn-inline"
                      (click)="saveOrder(order)"
                      [disabled]="!getEntityId(order) || savingOrders.has(getEntityId(order))"
                    >
                      Enregistrer
                    </button>
                  </td>
                </tr>

                <tr *ngIf="recentOrders.length === 0">
                  <td colspan="7" class="empty">Aucune commande.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2>Utilisateurs récents</h2>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Inscription</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let user of recentUsers">
                  <td>{{ user.name || '-' }}</td>
                  <td>{{ user.email }}</td>
                  <td>{{ user.role }}</td>
                  <td>{{ getUserCreatedAt(user) | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td>
                    <button
                      type="button"
                      class="btn-delete"
                      (click)="deleteUser(user)"
                      [disabled]="isCurrentAdmin(user) || savingUsers.has(getEntityId(user))"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
                <tr *ngIf="recentUsers.length === 0">
                  <td colspan="5" class="empty">Aucun utilisateur.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section *ngIf="!loading" class="panel">
        <div class="panel-head">
          <h2>Produits récents</h2>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produit</th>
                <th>Boutique</th>
                <th>Catégorie</th>
                <th>Prix</th>
                <th>Stock</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of recentProducts">
                <td>{{ p.name }}</td>
                <td>{{ getShopLabel(p) }}</td>
                <td>{{ p.category || '-' }}</td>
                <td>{{ p.price | number: '1.0-0' }} MGA</td>
                <td>{{ p.stock }}</td>
                <td>
                  <button
                    type="button"
                    class="btn-delete"
                    (click)="deleteProduct(p)"
                    [disabled]="savingProducts.has(getEntityId(p))"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
              <tr *ngIf="recentProducts.length === 0">
                <td colspan="6" class="empty">Aucun produit.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  `,
  styles: [
    `
      .admin-page {
        max-width: 1240px;
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
      .alert {
        margin-top: 0.9rem;
        border-radius: 12px;
        padding: 0.8rem 1rem;
      }
      .alert-error {
        color: #8f2525;
        border: 1px solid #f2c8c8;
        background: #fdeaea;
      }
      .stats-grid {
        margin-top: 0.9rem;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.7rem;
      }
      .stat-card {
        border: 1px solid #d8e5f0;
        border-radius: 12px;
        background: #fff;
        padding: 0.85rem 0.9rem;
      }
      .stat-card.success {
        border-color: #c7e8da;
        background: #eefcf6;
      }
      .label {
        margin: 0;
        color: #58718a;
        font-size: 0.82rem;
        font-weight: 700;
      }
      .value {
        margin: 0.2rem 0 0;
        color: #112940;
        font-size: 1.3rem;
        font-weight: 800;
      }
      .meta {
        margin: 0.22rem 0 0;
        color: #59728a;
        font-size: 0.8rem;
      }
      .panel {
        margin-top: 0.9rem;
        border: 1px solid #d8e5f0;
        border-radius: 14px;
        background: #fff;
        box-shadow: 0 10px 24px rgba(11, 42, 70, 0.06);
        padding: 0.9rem;
      }
      .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.8rem;
      }
      .panel-head h2 {
        margin: 0 0 0.7rem;
        color: #10243a;
        font-size: 1.05rem;
      }
      .table-wrap {
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 760px;
      }
      thead th {
        text-align: left;
        font-size: 0.76rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #5b748d;
        border-bottom: 1px solid #dce8f2;
        padding: 0.65rem 0.45rem;
      }
      tbody td {
        padding: 0.62rem 0.45rem;
        border-bottom: 1px solid #ebf2f8;
        color: #12304c;
        font-weight: 600;
      }
      select {
        border: 1px solid #c9dced;
        border-radius: 8px;
        padding: 0.28rem 0.42rem;
        font: inherit;
      }
      .btn-inline,
      .btn-delete {
        border: 0;
        border-radius: 8px;
        padding: 0.4rem 0.52rem;
        font-weight: 700;
        cursor: pointer;
      }
      .btn-inline {
        background: #e8f5ff;
        color: #0d4f84;
      }
      .btn-delete {
        background: #fdecec;
        color: #992f2f;
      }
      .empty {
        text-align: center;
        color: #5d768f;
        padding: 1rem;
      }
      @media (max-width: 1020px) {
        .stats-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .grid-2 {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 600px) {
        .stats-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  users: User[] = [];
  products: Product[] = [];
  orders: Order[] = [];

  loading = true;
  error = '';
  apiBaseUrl = '';
  sellerCapacity = this.resolveSellerCapacity();

  savingOrders = new Set<string>();
  savingUsers = new Set<string>();
  savingProducts = new Set<string>();

  private currentAdminId = '';
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private productService: ProductService,
    private orderService: OrderService,
    private router: Router,
  ) {}

  readonly getEntityId = getEntityId;

  ngOnInit(): void {
    this.apiBaseUrl = this.authService.apiBaseUrl;
    this.currentAdminId = getEntityId(this.authService.currentUserValue);
    this.loadDashboard(true);
    const focus$ =
      typeof window !== 'undefined' ? fromEvent(window, 'focus') : EMPTY;
    const visibility$ =
      typeof document !== 'undefined'
        ? fromEvent(document, 'visibilitychange').pipe(filter(() => !document.hidden))
        : EMPTY;

    merge(
      this.authService.usersRefresh$,
      this.productService.refresh$,
      this.orderService.refresh$,
      timer(0, 5000),
      focus$,
      visibility$,
      this.router.events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        filter((event) => event.urlAfterRedirects.startsWith('/admin/dashboard')),
      ),
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadDashboard(false));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get adminsCount(): number {
    return this.users.filter((u) => u.role === 'admin').length;
  }

  get boutiquesCount(): number {
    return this.users.filter((u) => u.role === 'boutique').length;
  }

  get buyersCount(): number {
    return this.users.filter((u) => u.role === 'acheteur').length;
  }

  get freeSellerSlots(): number {
    return Math.max(0, this.sellerCapacity - this.boutiquesCount);
  }

  get totalStock(): number {
    return this.products.reduce((sum, p) => sum + (p.stock || 0), 0);
  }

  get pendingOrdersCount(): number {
    return this.orders.filter((o) => o.status === 'pending').length;
  }

  get paidRevenue(): number {
    return this.orders
      .filter((o) => o.paymentStatus === 'completed')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }

  get recentOrders(): Order[] {
    return [...this.orders]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 12);
  }

  get recentUsers(): User[] {
    return [...this.users]
      .sort((a, b) => this.getUserCreatedAt(b).getTime() - this.getUserCreatedAt(a).getTime())
      .slice(0, 10);
  }

  get recentProducts(): Product[] {
    return [...this.products]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 12);
  }

  loadDashboard(showLoader = true): void {
    if (showLoader) this.loading = true;
    this.error = '';

    forkJoin({
      users: this.authService.getAllUsers().pipe(catchError((err) => of({ __error: err } as const))),
      products: this.productService.getProducts().pipe(catchError((err) => of({ __error: err } as const))),
      orders: this.orderService.getAllOrders().pipe(catchError((err) => of({ __error: err } as const))),
    }).subscribe({
      next: ({ users, products, orders }) => {
        const userError = this.extractError(users);
        const productError = this.extractError(products);
        const orderError = this.extractError(orders);

        this.users = userError ? [] : this.normalizeUsersResponse(users as unknown);
        this.products = productError ? [] : this.normalizeProductsResponse(products as unknown);
        this.orders = orderError ? [] : this.normalizeOrdersResponse(orders as unknown);

        const parts: string[] = [];
        if (userError) parts.push('Utilisateurs');
        if (productError) parts.push('Produits');
        if (orderError) parts.push('Commandes');
        if (parts.length > 0) {
          this.error = `Certaines données n'ont pas pu être chargées: ${parts.join(', ')}.`;
        }

        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Impossible de charger les données admin.';
        this.loading = false;
      },
    });
  }

  saveOrder(order: Order): void {
    const id = getEntityId(order);
    if (!id) return;

    const status = order.status as OrderStatus;
    const paymentStatus = order.paymentStatus as PaymentStatus;

    this.savingOrders.add(id);

    forkJoin({
      status: this.orderService.updateOrderStatus(id, { status }),
      payment: this.orderService.updatePaymentStatus(id, { paymentStatus }),
    }).subscribe({
      next: () => {
        this.savingOrders.delete(id);
        this.loadDashboard(false);
      },
      error: (err) => {
        this.savingOrders.delete(id);
        this.error = err?.error?.message || 'Échec de mise à jour de la commande.';
      },
    });
  }

  deleteProduct(product: Product): void {
    const id = getEntityId(product);
    if (!id) return;
    if (!confirm(`Supprimer le produit ${product.name} ?`)) return;

    this.savingProducts.add(id);
    this.productService.deleteProduct(id).subscribe({
      next: () => {
        this.savingProducts.delete(id);
        this.loadDashboard(false);
      },
      error: (err) => {
        this.savingProducts.delete(id);
        this.error = err?.error?.message || 'Échec suppression produit.';
      },
    });
  }

  deleteUser(user: User): void {
    const id = getEntityId(user);
    if (!id || this.isCurrentAdmin(user)) return;
    if (!confirm(`Supprimer l'utilisateur ${user.email} ?`)) return;

    this.savingUsers.add(id);
    this.authService.deleteUser(id).subscribe({
      next: () => {
        this.savingUsers.delete(id);
        this.loadDashboard(false);
      },
      error: (err) => {
        this.savingUsers.delete(id);
        this.error = err?.error?.message || 'Échec suppression utilisateur.';
      },
    });
  }

  isCurrentAdmin(user: User): boolean {
    const id = getEntityId(user);
    return !!id && id === this.currentAdminId;
  }

  getBuyerLabel(order: Order): string {
    if (!order.buyer) return '-';
    if (typeof order.buyer === 'string') return order.buyer;
    return order.buyer.name || order.buyer.email || getEntityId(order.buyer);
  }

  getShopLabel(product: Product): string {
    if (!product.shop) return '-';
    if (typeof product.shop === 'string') return product.shop;
    return product.shop.name || product.shop.email || getEntityId(product.shop);
  }

  getUserCreatedAt(user: User): Date {
    if (user.createdAt) {
      const direct = new Date(user.createdAt);
      if (!Number.isNaN(direct.getTime())) return direct;
    }

    const id = getEntityId(user);
    if (!id || id.length < 8) return new Date(0);
    const ts = Number.parseInt(id.slice(0, 8), 16);
    if (Number.isNaN(ts)) return new Date(0);
    return new Date(ts * 1000);
  }

  private normalizeUsersResponse(value: unknown): User[] {
    if (Array.isArray(value)) return value as User[];
    const maybeObject = value as { users?: User[]; data?: User[] };
    if (Array.isArray(maybeObject?.users)) return maybeObject.users;
    if (Array.isArray(maybeObject?.data)) return maybeObject.data;
    return [];
  }

  private normalizeProductsResponse(value: unknown): Product[] {
    if (Array.isArray(value)) return value as Product[];
    const maybeObject = value as { products?: Product[]; data?: Product[] };
    if (Array.isArray(maybeObject?.products)) return maybeObject.products;
    if (Array.isArray(maybeObject?.data)) return maybeObject.data;
    return [];
  }

  private normalizeOrdersResponse(value: unknown): Order[] {
    if (Array.isArray(value)) return value as Order[];
    const maybeObject = value as { orders?: Order[]; data?: Order[] };
    if (Array.isArray(maybeObject?.orders)) return maybeObject.orders;
    if (Array.isArray(maybeObject?.data)) return maybeObject.data;
    return [];
  }

  private extractError<T>(value: T): unknown {
    if (!value || typeof value !== 'object') return null;
    const maybe = value as { __error?: unknown };
    return maybe.__error || null;
  }

  private resolveSellerCapacity(): number {
    const byWindow = (globalThis as { __SHOPPING_MALL_MAX_SELLERS__?: number }).__SHOPPING_MALL_MAX_SELLERS__;
    if (typeof byWindow === 'number' && byWindow > 0) return Math.floor(byWindow);

    const byStorage = globalThis.localStorage?.getItem('shoppingMallMaxSellers');
    const parsed = Number(byStorage);
    if (!Number.isNaN(parsed) && parsed > 0) return Math.floor(parsed);

    return 100;
  }

}
