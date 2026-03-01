import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CartItem } from '../../models/cart.model';
import { CartService } from '../../services/cart.service';
import { getEntityId } from '../../utils/id.util';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="cart-page">
      <header class="cart-header">
        <h1>Mon panier</h1>
        <button
          *ngIf="items.length > 0"
          type="button"
          class="btn-clear"
          (click)="clearCart()"
        >
          Vider le panier
        </button>
      </header>

      <div *ngIf="items.length === 0" class="panel empty">
        <p>Aucun produit sélectionné pour le moment.</p>
        <a routerLink="/products" class="btn-back">Parcourir les produits</a>
      </div>

      <div *ngIf="items.length > 0" class="cart-layout">
        <article class="cart-items panel">
          <div class="item" *ngFor="let item of items">
            <img [src]="item.product.image || '/assets/placeholder.png'" [alt]="item.product.name" />

            <div class="item-main">
              <p class="name">{{ item.product.name }}</p>
              <p class="meta">Prix: {{ item.product.price | number: '1.0-0' }} MGA</p>
              <p class="meta">Stock dispo: {{ item.product.stock }}</p>
            </div>

            <div class="qty-actions">
              <button type="button" (click)="decreaseQty(item)">−</button>
              <span>{{ item.quantity }}</span>
              <button type="button" (click)="increaseQty(item)">+</button>
            </div>

            <div class="item-total">
              {{ item.product.price * item.quantity | number: '1.0-0' }} MGA
            </div>

            <button type="button" class="btn-remove" (click)="removeItem(item)">
              Supprimer
            </button>
          </div>
        </article>

        <aside class="panel summary">
          <h2>Résumé</h2>
          <p>Articles: {{ totalQuantity }}</p>
          <p>Total: <strong>{{ totalAmount | number: '1.0-0' }} MGA</strong></p>

          <button class="btn-validate" type="button" (click)="proceedToCheckout()">
            Valider
          </button>
        </aside>
      </div>
    </section>
  `,
  styles: [
    `
      .cart-page {
        max-width: 1120px;
        margin: 1.4rem auto;
        padding: 0 1rem;
      }
      .cart-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.8rem;
        margin-bottom: 0.9rem;
      }
      h1 {
        margin: 0;
        color: #16324c;
      }
      .panel {
        border: 1px solid #d4e5f4;
        border-radius: 14px;
        background: #fff;
        padding: 1rem;
      }
      .empty {
        text-align: center;
      }
      .btn-back {
        display: inline-block;
        margin-top: 0.8rem;
        text-decoration: none;
        font-weight: 700;
        color: #0f5e9c;
      }
      .cart-layout {
        display: grid;
        grid-template-columns: 1fr 290px;
        gap: 1rem;
      }
      .cart-items {
        display: grid;
        gap: 0.75rem;
      }
      .item {
        display: grid;
        grid-template-columns: 92px 1fr auto auto auto;
        gap: 0.7rem;
        align-items: center;
        border: 1px solid #e2edf7;
        border-radius: 12px;
        padding: 0.7rem;
      }
      .item img {
        width: 92px;
        height: 70px;
        object-fit: cover;
        border-radius: 8px;
        background: #eff5fb;
      }
      .name {
        margin: 0 0 0.2rem;
        font-weight: 800;
      }
      .meta {
        margin: 0.1rem 0;
        color: #53718e;
      }
      .qty-actions {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
      }
      .qty-actions button {
        border: 1px solid #c9ddf0;
        background: #fff;
        border-radius: 8px;
        width: 30px;
        height: 30px;
        cursor: pointer;
      }
      .item-total {
        font-weight: 800;
        color: #0f3a68;
      }
      .btn-remove {
        border: 1px solid #f1c7c7;
        color: #a23030;
        background: #fdecec;
        border-radius: 8px;
        padding: 0.45rem 0.6rem;
        cursor: pointer;
      }
      .summary h2 {
        margin: 0 0 0.9rem;
      }
      .summary p {
        margin: 0.4rem 0;
      }
      .btn-validate,
      .btn-clear {
        border: 0;
        border-radius: 10px;
        padding: 0.62rem 0.9rem;
        font-weight: 700;
        cursor: pointer;
      }
      .btn-validate {
        width: 100%;
        margin-top: 0.9rem;
        background: linear-gradient(120deg, #0f5e9c, #0d86b8);
        color: #fff;
      }
      .btn-clear {
        background: #f2f7fd;
        color: #1f4c74;
      }
      @media (max-width: 920px) {
        .cart-layout {
          grid-template-columns: 1fr;
        }
        .item {
          grid-template-columns: 1fr;
          justify-items: start;
        }
      }
    `,
  ],
})
export class CartComponent implements OnInit, OnDestroy {
  items: CartItem[] = [];
  totalQuantity = 0;
  totalAmount = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private cartService: CartService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.cartService.items$
      .pipe(takeUntil(this.destroy$))
      .subscribe((items) => {
        this.items = items;
        this.totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
        this.totalAmount = items.reduce((total, item) => total + item.quantity * item.product.price, 0);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  increaseQty(item: CartItem): void {
    const productId = getEntityId(item.product);
    if (!productId) return;
    this.cartService.updateQuantity(productId, item.quantity + 1);
  }

  decreaseQty(item: CartItem): void {
    const productId = getEntityId(item.product);
    if (!productId) return;
    this.cartService.updateQuantity(productId, item.quantity - 1);
  }

  removeItem(item: CartItem): void {
    const productId = getEntityId(item.product);
    if (!productId) return;
    this.cartService.removeProduct(productId);
  }

  clearCart(): void {
    this.cartService.clear();
  }

  proceedToCheckout(): void {
    this.router.navigate(['/checkout']);
  }
}
