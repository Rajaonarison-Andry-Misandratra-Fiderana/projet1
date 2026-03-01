import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/order.model';
import { getEntityId } from '../../utils/id.util';

@Component({
  selector: 'app-buyer-orders',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="orders-page">
      <h1>Mes commandes</h1>

      <div *ngIf="loading" class="panel">Chargement des commandes...</div>
      <div *ngIf="error" class="panel error">{{ error }}</div>

      <div *ngIf="!loading && orders.length === 0" class="panel">
        Aucune commande pour le moment.
      </div>

      <div class="orders-list" *ngIf="!loading && orders.length > 0">
        <article class="order-card" *ngFor="let order of orders">
          <div class="order-head">
            <p class="number">{{ order.orderNumber }}</p>
            <p class="status" [ngClass]="'status-' + order.status">{{ order.status }}</p>
          </div>
          <p class="amount">{{ order.totalAmount | number: '1.0-0' }} MGA</p>
          <p class="meta">Paiement: {{ order.paymentStatus }}</p>
          <p class="meta">Date: {{ order.createdAt | date: 'dd/MM/yyyy HH:mm' }}</p>

          <div class="items">
            <div class="item" *ngFor="let item of order.items">
              <span>{{ getItemName(item.product) }}</span>
              <span>x{{ item.quantity }}</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  `,
  styles: [
    `
      .orders-page {
        max-width: 980px;
        margin: 1.5rem auto;
        padding: 0 1rem;
      }
      .orders-page h1 {
        margin: 0 0 1rem;
      }
      .panel {
        border: 1px solid #d5e4f1;
        border-radius: 12px;
        background: #fff;
        padding: 0.9rem 1rem;
      }
      .panel.error {
        color: #912f2f;
        background: #fdecec;
        border-color: #efcaca;
      }
      .orders-list {
        display: grid;
        gap: 0.9rem;
      }
      .order-card {
        border: 1px solid #d5e4f1;
        border-radius: 12px;
        background: #fff;
        padding: 0.9rem 1rem;
      }
      .order-head {
        display: flex;
        justify-content: space-between;
        gap: 0.6rem;
        align-items: center;
      }
      .number {
        margin: 0;
        font-weight: 800;
        color: #17324f;
      }
      .status {
        margin: 0;
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
      }
      .status-pending {
        color: #ab6a00;
      }
      .status-confirmed,
      .status-shipped,
      .status-delivered {
        color: #0d6d46;
      }
      .status-cancelled {
        color: #9c2a2a;
      }
      .amount {
        margin: 0.35rem 0;
        font-weight: 800;
        color: #0f3a68;
      }
      .meta {
        margin: 0.2rem 0;
        color: #59728a;
      }
      .items {
        margin-top: 0.6rem;
      }
      .item {
        display: flex;
        justify-content: space-between;
        padding: 0.3rem 0;
        border-bottom: 1px dashed #e2ecf5;
      }
    `,
  ],
})
export class BuyerOrdersComponent implements OnInit {
  orders: Order[] = [];
  loading = true;
  error = '';

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.orderService.getMyOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Impossible de charger vos commandes.';
        this.loading = false;
      },
    });
  }

  getItemName(product: unknown): string {
    if (!product) return 'Produit';
    if (typeof product === 'string') return `Produit ${product.slice(0, 6)}`;
    const maybeProduct = product as { name?: string; id?: string; _id?: string };
    return maybeProduct.name || `Produit ${getEntityId(maybeProduct)}`;
  }
}
