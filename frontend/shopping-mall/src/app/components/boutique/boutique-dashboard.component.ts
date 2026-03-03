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
import { CommerceSyncService } from '../../services/commerce-sync.service';
import { toFrenchCategory } from '../../constants/categories';

type ProductDashboardRow = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  unitsSold: number;
  salesAmount: number;
  orderCount: number;
};

type PurchaseHistoryRow = {
  orderId: string;
  orderDate: Date | string | undefined;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  shippingAddress: string;
  products: string;
  quantity: number;
  totalAmount: number;
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
  unitsSoldTotal = 0;
  transferredAmount = 0;
  loading = true;
  error: string | null = null;

  productRows: ProductDashboardRow[] = [];
  purchaseHistoryRows: PurchaseHistoryRow[] = [];
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
    const rowsMap = new Map<string, ProductDashboardRow>();
    const rowOrderKeys = new Map<string, Set<string>>();

    for (const product of products) {
      const productId = getEntityId(product);
      if (!productId) continue;
      rowsMap.set(productId, {
        id: productId,
        name: product.name,
        category: toFrenchCategory(product.category) || 'Sans catégorie',
        price: product.price,
        stock: product.stock,
        unitsSold: 0,
        salesAmount: 0,
        orderCount: 0,
      });
    }

    for (const order of orders) {
      const orderKey = getEntityId(order) || order.orderNumber || `order-${Date.now()}`;
      for (const item of order.items || []) {
        const productId =
          typeof item.product === 'string' ? item.product : getEntityId(item.product);
        const fallbackName =
          typeof item.product === 'object' && item.product?.name
            ? item.product.name
            : 'Produit supprimé';
        const rowId =
          productId ||
          `deleted-${orderKey}-${fallbackName.replace(/\s+/g, '-').toLowerCase()}`;

        let row = rowsMap.get(rowId);
        if (!row) {
          row = {
            id: rowId,
            name: fallbackName,
            category: 'Produit supprimé',
            price: Number(item.price || 0),
            stock: 0,
            unitsSold: 0,
            salesAmount: 0,
            orderCount: 0,
          };
          rowsMap.set(rowId, row);
        }

        row.unitsSold += item.quantity || 0;
        row.salesAmount += Number(item.price || row.price || 0) * (item.quantity || 0);
        if (!rowOrderKeys.has(rowId)) rowOrderKeys.set(rowId, new Set<string>());
        rowOrderKeys.get(rowId)?.add(orderKey);
      }
    }

    for (const [rowId, row] of rowsMap.entries()) {
      row.orderCount = rowOrderKeys.get(rowId)?.size || 0;
    }

    const rows = Array.from(rowsMap.values());
    this.productRows = rows.sort((a, b) => b.salesAmount - a.salesAmount);
    this.productsCount = products.length;
    this.ordersCount = orders.length;
    this.totalSales = rows.reduce((sum, row) => sum + row.salesAmount, 0);
    this.unitsSoldTotal = rows.reduce((sum, row) => sum + row.unitsSold, 0);

    this.purchaseHistoryRows = this.buildPurchaseHistory(orders);
  }

  private buildPurchaseHistory(orders: Order[]): PurchaseHistoryRow[] {
    const history: PurchaseHistoryRow[] = [];

    for (const order of orders) {
      const ownItems = (order.items || []).filter((item) => {
        const itemShopId = typeof item.shop === 'string' ? item.shop : getEntityId(item.shop);
        return !!itemShopId && itemShopId === this.currentShopId;
      });
      if (ownItems.length === 0) continue;

      const buyerName =
        order.deliveryContact?.fullName ||
        (typeof order.buyer === 'object' ? order.buyer?.name : '') ||
        'Client';
      const buyerEmail =
        order.deliveryContact?.email ||
        (typeof order.buyer === 'object' ? order.buyer?.email : '') ||
        '-';
      const buyerPhone = order.deliveryContact?.phone || '-';
      const shippingAddress = [
        order.shippingAddress?.street || '',
        order.shippingAddress?.city || '',
        order.shippingAddress?.state || '',
        order.shippingAddress?.zipCode || '',
        order.shippingAddress?.country || '',
      ]
        .filter((part) => !!part)
        .join(', ');

      const quantity = ownItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      const totalAmount = ownItems.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
        0,
      );
      const products = ownItems
        .map((item) =>
          typeof item.product === 'object' && item.product?.name ? item.product.name : 'Produit',
        )
        .join(', ');

      history.push({
        orderId: order.orderNumber || getEntityId(order) || '-',
        orderDate: order.createdAt,
        buyerName,
        buyerEmail,
        buyerPhone,
        shippingAddress: shippingAddress || '-',
        products,
        quantity,
        totalAmount,
      });
    }

    return history.sort(
      (a, b) =>
        new Date(b.orderDate || 0).getTime() - new Date(a.orderDate || 0).getTime(),
    );
  }
}
