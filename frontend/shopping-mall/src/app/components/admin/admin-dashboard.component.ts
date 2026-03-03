import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { EMPTY, Subject, forkJoin, fromEvent, merge, of, timer } from 'rxjs';
import { catchError, filter, takeUntil } from 'rxjs/operators';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { Product } from '../../models/product.model';
import { Order } from '../../models/order.model';
import { getEntityId } from '../../utils/id.util';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
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

      <section *ngIf="!loading" class="panel">
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
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let order of recentOrders">
                  <td>{{ order.orderNumber || getEntityId(order) }}</td>
                  <td>{{ getBuyerLabel(order) }}</td>
                  <td>{{ order.totalAmount | number: '1.0-0' }} MGA</td>
                  <td>{{ order.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
                </tr>

                <tr *ngIf="recentOrders.length === 0">
                  <td colspan="4" class="empty">Aucune commande.</td>
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
                    [disabled]="!canDeleteProduct(p) || savingProducts.has(getEntityId(p))"
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
        max-width: 1280px;
        margin: 1rem auto 1.5rem;
        padding: 0 1rem 1rem;
        box-sizing: border-box;
        background:
          radial-gradient(circle at 8% -8%, #eaf5ff 0%, transparent 26%),
          radial-gradient(circle at 90% 0%, #edfff6 0%, transparent 24%);
      }
      .admin-page * {
        box-sizing: border-box;
      }
      .page-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        border: 1px solid #d8e6f3;
        border-radius: 14px;
        background: #fff;
        box-shadow: 0 10px 22px rgba(8, 39, 67, 0.08);
        padding: 0.95rem 1rem;
      }
      .page-head h1 {
        margin: 0;
        color: #10243a;
        font-size: clamp(1.15rem, 2.3vw, 1.85rem);
      }
      .page-head p {
        margin: 0.25rem 0 0;
        color: #4f6b84;
        font-size: 0.92rem;
      }
      .btn-refresh {
        border: 0;
        border-radius: 11px;
        padding: 0.62rem 1rem;
        background: linear-gradient(120deg, #0f5e9c, #0d86b8);
        color: #fff;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
      }
      .btn-refresh:disabled {
        opacity: 0.6;
        cursor: not-allowed;
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
        margin-top: 1rem;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.85rem;
      }
      .stat-card {
        border: 1px solid #d3e3f1;
        border-radius: 14px;
        background: #fff;
        box-shadow: 0 8px 20px rgba(8, 39, 67, 0.07);
        padding: 0.9rem 0.95rem;
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
        margin: 0.18rem 0 0;
        color: #112940;
        font-size: clamp(1.15rem, 2.5vw, 1.45rem);
        font-weight: 800;
      }
      .meta {
        margin: 0.22rem 0 0;
        color: #59728a;
        font-size: 0.8rem;
      }
      .panel {
        margin-top: 1rem;
        border: 1px solid #d3e3f1;
        border-radius: 14px;
        background: #fff;
        box-shadow: 0 10px 24px rgba(8, 39, 67, 0.06);
        padding: 0.95rem;
        overflow: hidden;
        min-width: 0;
      }
      .panel-head h2 {
        margin: 0 0 0.7rem;
        color: #10243a;
        font-size: 1.05rem;
      }
      .table-wrap {
        overflow-x: auto;
        border: 1px solid #e3edf6;
        border-radius: 12px;
        background: #fff;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 620px;
        table-layout: fixed;
      }
      thead th {
        text-align: left;
        font-size: 0.76rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #5b748d;
        border-bottom: 1px solid #deebf5;
        padding: 0.62rem 0.5rem;
        background: #f5faff;
        position: sticky;
        top: 0;
        z-index: 1;
      }
      tbody td {
        padding: 0.62rem 0.5rem;
        border-bottom: 1px solid #ebf2f8;
        color: #12304c;
        font-weight: 600;
        vertical-align: middle;
        word-break: break-word;
      }
      tbody tr:hover {
        background: #f8fcff;
      }
      .btn-delete {
        border: 0;
        border-radius: 8px;
        padding: 0.4rem 0.52rem;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
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
        .admin-page {
          padding: 0 0.75rem 1rem;
        }
        .stats-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        table {
          min-width: 560px;
        }
      }
      @media (max-width: 600px) {
        .admin-page {
          margin-top: 0.7rem;
          padding: 0 0.55rem 0.8rem;
        }
        .page-head {
          flex-direction: column;
          align-items: stretch;
          padding: 0.85rem;
        }
        .page-head p {
          font-size: 0.86rem;
        }
        .btn-refresh {
          width: 100%;
        }
        .stats-grid {
          grid-template-columns: 1fr;
          gap: 0.7rem;
        }
        .panel {
          padding: 0.72rem;
          border-radius: 12px;
        }
        .panel-head h2 {
          font-size: 0.96rem;
        }
        table {
          min-width: 500px;
        }
        thead th,
        tbody td {
          padding: 0.54rem 0.44rem;
          font-size: 0.82rem;
        }
        .btn-delete {
          width: 100%;
          font-size: 0.8rem;
        }
      }
      @media (max-width: 390px) {
        .admin-page {
          padding: 0 0.45rem 0.7rem;
        }
        .panel {
          padding: 0.62rem;
        }
        table {
          min-width: 440px;
        }
      }
    `,
  ],
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  users: { role?: string }[] = [];
  products: Product[] = [];
  orders: Order[] = [];

  loading = true;
  error = '';
  apiBaseUrl = '';
  sellerCapacity = this.resolveSellerCapacity();

  savingProducts = new Set<string>();

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private productService: ProductService,
    private orderService: OrderService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  readonly getEntityId = getEntityId;

  ngOnInit(): void {
    this.apiBaseUrl = this.authService.apiBaseUrl;
    this.loadDashboard(true);
    const focus$ = typeof window !== 'undefined' ? fromEvent(window, 'focus') : EMPTY;
    const visibility$ =
      typeof document !== 'undefined'
        ? fromEvent(document, 'visibilitychange').pipe(filter(() => !document.hidden))
        : EMPTY;

    merge(
      this.authService.usersRefresh$,
      this.productService.refresh$,
      this.orderService.refresh$,
      timer(5000, 5000),
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

  get recentProducts(): Product[] {
    return [...this.products, ...this.getHistoricalSoldProducts()]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 12);
  }

  loadDashboard(showLoader = true): void {
    if (showLoader) this.loading = true;
    this.error = '';

    forkJoin({
      users: this.authService
        .getAllUsers()
        .pipe(catchError((err) => of({ __error: err } as const))),
      products: this.productService
        .getProducts()
        .pipe(catchError((err) => of({ __error: err } as const))),
      orders: this.orderService
        .getAllOrders()
        .pipe(catchError((err) => of({ __error: err } as const))),
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
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Impossible de charger les données admin.';
        this.loading = false;
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

  canDeleteProduct(product: Product): boolean {
    const id = getEntityId(product);
    if (!id) return false;
    return this.products.some((p) => getEntityId(p) === id);
  }

  private normalizeUsersResponse(value: unknown): { role?: string }[] {
    if (Array.isArray(value)) return value as { role?: string }[];
    const maybeObject = value as { users?: { role?: string }[]; data?: { role?: string }[] };
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
    const byWindow = (globalThis as { __SHOPPING_MALL_MAX_SELLERS__?: number })
      .__SHOPPING_MALL_MAX_SELLERS__;
    if (typeof byWindow === 'number' && byWindow > 0) return Math.floor(byWindow);

    const byStorage = globalThis.localStorage?.getItem('shoppingMallMaxSellers');
    const parsed = Number(byStorage);
    if (!Number.isNaN(parsed) && parsed > 0) return Math.floor(parsed);

    return 100;
  }

  private getHistoricalSoldProducts(): Product[] {
    const activeIds = new Set(this.products.map((p) => getEntityId(p)).filter(Boolean));
    const history = new Map<string, Product>();

    for (const order of this.orders) {
      const orderDate = order.createdAt;
      for (const item of order.items || []) {
        const itemProductId =
          typeof item.product === 'string' ? item.product : getEntityId(item.product);
        if (itemProductId && activeIds.has(itemProductId)) continue;

        const itemName =
          typeof item.product === 'object' && item.product?.name
            ? item.product.name
            : 'Produit supprimé';
        const key =
          itemProductId ||
          `deleted-${itemName.replace(/\s+/g, '-').toLowerCase()}-${Math.round(item.price || 0)}`;

        if (!history.has(key)) {
          history.set(key, {
            _id: key,
            name: itemName,
            category: 'Historique (supprimé)',
            price: Number(item.price || 0),
            stock: 0,
            shop: item.shop as Product['shop'],
            createdAt: orderDate,
          });
        }
      }
    }

    return Array.from(history.values());
  }
}
