import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, forkJoin, merge, timer } from 'rxjs';
import { distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { ProductService } from '../../services/product.service';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../models/product.model';
import { Order } from '../../models/order.model';
import { getEntityId } from '../../utils/id.util';
import { getProductClicks } from '../../utils/product-clicks.util';
import { CommerceSyncService } from '../../services/commerce-sync.service';

type ProductDashboardRow = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  clicks: number;
  unitsSold: number;
  salesAmount: number;
  orderCount: number;
};

@Component({
  selector: 'app-boutique-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './boutique-dashboard.component.html',
  styleUrl: './boutique-dashboard.component.css',
})
export class BoutiqueDashboardComponent implements OnInit, OnDestroy {
  productsCount = 0;
  ordersCount = 0;
  totalSales = 0;
  totalClicks = 0;
  unitsSoldTotal = 0;
  transferredAmount = 0;
  loading = true;
  error: string | null = null;

  productRows: ProductDashboardRow[] = [];
  private currentShopId = '';

  private destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private orderService: OrderService,
    private authService: AuthService,
    private commerceSyncService: CommerceSyncService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(
        map((user) => getEntityId(user)),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe((shopId) => {
        if (!shopId) {
          this.error = 'Shop information not available.';
          this.loading = false;
          this.currentShopId = '';
          this.cdr.detectChanges();
          return;
        }
        this.currentShopId = shopId;
        this.loadDashboard(this.currentShopId);
      });

    merge(
      this.productService.refresh$,
      this.orderService.refresh$,
      this.commerceSyncService.refresh$,
      timer(12000, 12000),
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.currentShopId) this.loadDashboard(this.currentShopId);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboard(shopId: string): void {
    this.loading = true;
    this.error = null;
    this.transferredAmount = this.commerceSyncService.getTransferredAmountForShop(shopId);

    forkJoin({
      products: this.productService.getProductsByShop(shopId),
      orders: this.orderService.getShopOrders(),
    }).subscribe({
      next: ({ products, orders }) => {
        this.computeDashboard(products, orders);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        if (err?.status === 401) {
          this.error = 'Session expirée. Veuillez vous reconnecter.';
        } else {
          this.error = 'Impossible de charger les données boutique.';
        }
        this.cdr.detectChanges();
      },
    });
  }

  private computeDashboard(products: Product[], orders: Order[]): void {
    const rows = products.map((product) => {
      const productId = getEntityId(product);
      const clicks = getProductClicks(productId);

      let unitsSold = 0;
      let salesAmount = 0;
      let orderCount = 0;

      for (const order of orders) {
        const matchedItems = order.items.filter((item) => {
          if (typeof item.product === 'string') return item.product === productId;
          return getEntityId(item.product) === productId;
        });

        if (matchedItems.length > 0) {
          orderCount += 1;
          for (const item of matchedItems) {
            unitsSold += item.quantity || 0;
            salesAmount += (item.price || product.price || 0) * (item.quantity || 0);
          }
        }
      }

      return {
        id: productId,
        name: product.name,
        category: product.category || 'Sans catégorie',
        price: product.price,
        stock: product.stock,
        clicks,
        unitsSold,
        salesAmount,
        orderCount,
      } as ProductDashboardRow;
    });

    this.productRows = rows.sort((a, b) => b.salesAmount - a.salesAmount);
    this.productsCount = rows.length;
    this.ordersCount = orders.length;
    this.totalSales = rows.reduce((sum, row) => sum + row.salesAmount, 0);
    this.totalClicks = rows.reduce((sum, row) => sum + row.clicks, 0);
    this.unitsSoldTotal = rows.reduce((sum, row) => sum + row.unitsSold, 0);
  }
}
