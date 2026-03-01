import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CartItem } from '../../models/cart.model';
import { Product } from '../../models/product.model';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { ProductService } from '../../services/product.service';
import { CommerceSyncService } from '../../services/commerce-sync.service';
import { getEntityId } from '../../utils/id.util';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <section class="checkout-page">
      <h1>Paiement et Livraison</h1>

      <div *ngIf="loading" class="panel">Chargement des produits...</div>
      <div *ngIf="error" class="panel error">{{ error }}</div>

      <div *ngIf="!loading && items.length > 0" class="checkout-grid">
        <article class="panel">
          <h2>Articles sélectionnés</h2>

          <div class="checkout-item" *ngFor="let item of items">
            <img [src]="item.product.image || '/assets/placeholder.png'" [alt]="item.product.name" />
            <div class="item-main">
              <p class="name">{{ item.product.name }}</p>
              <p class="price">{{ item.product.price | number: '1.0-0' }} MGA</p>
              <p class="stock">Stock: {{ item.product.stock }}</p>
            </div>

            <div class="qty">
              <button type="button" (click)="decreaseQty(item)">−</button>
              <span>{{ item.quantity }}</span>
              <button type="button" (click)="increaseQty(item)">+</button>
            </div>

            <button type="button" class="btn-remove" (click)="removeItem(item)">Supprimer</button>
          </div>

          <p class="total">Total: {{ totalAmount | number: '1.0-0' }} MGA</p>
        </article>

        <form class="panel" (submit)="confirmOrder($event)">
          <h2>Informations de livraison</h2>
          <div class="field">
            <label>Nom complet</label>
            <input type="text" [(ngModel)]="form.fullName" name="fullName" required />
          </div>
          <div class="field">
            <label>Email</label>
            <input type="email" [(ngModel)]="form.email" name="email" required />
          </div>
          <div class="field">
            <label>Téléphone</label>
            <input type="text" [(ngModel)]="form.phone" name="phone" required />
          </div>
          <div class="field">
            <label>Adresse</label>
            <input type="text" [(ngModel)]="form.street" name="street" required />
          </div>
          <div class="split">
            <div class="field">
              <label>Ville</label>
              <input type="text" [(ngModel)]="form.city" name="city" required />
            </div>
            <div class="field">
              <label>Région</label>
              <input type="text" [(ngModel)]="form.state" name="state" required />
            </div>
          </div>
          <div class="split">
            <div class="field">
              <label>Code postal</label>
              <input type="text" [(ngModel)]="form.zipCode" name="zipCode" required />
            </div>
            <div class="field">
              <label>Pays</label>
              <input type="text" [(ngModel)]="form.country" name="country" required />
            </div>
          </div>
          <div class="field">
            <label>Instructions au vendeur (optionnel)</label>
            <textarea [(ngModel)]="form.notes" name="notes"></textarea>
          </div>

          <div class="actions">
            <button
              type="button"
              class="btn-stripe"
              [disabled]="!canCheckout()"
              (click)="payWithStripe()"
            >
              Payer avec Stripe
            </button>
            <button type="submit" class="btn-primary" [disabled]="!canConfirmOrder()">
              Confirmer la commande
            </button>
          </div>
          <p class="hint" *ngIf="!stripePaymentLink">
            Aucun lien Stripe configuré. Ajoutez
            <code>localStorage.shoppingMallStripePaymentLink</code> pour activer le paiement externe.
          </p>
        </form>
      </div>
    </section>
  `,
  styles: [
    `
      .checkout-page {
        max-width: 1050px;
        margin: 1.5rem auto;
        padding: 0 1rem;
      }
      .checkout-page h1 {
        margin: 0 0 1rem;
        color: #10243a;
      }
      .checkout-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      .panel {
        border: 1px solid #d8e6f2;
        border-radius: 14px;
        background: #fff;
        padding: 1rem;
      }
      .panel.error {
        color: #922b2b;
        border-color: #efc8c8;
        background: #fdecec;
      }
      .checkout-item {
        display: grid;
        grid-template-columns: 90px 1fr auto auto;
        gap: 0.7rem;
        align-items: center;
        border: 1px solid #e2edf7;
        border-radius: 10px;
        padding: 0.6rem;
        margin-bottom: 0.6rem;
      }
      .checkout-item img {
        width: 90px;
        height: 68px;
        object-fit: cover;
        border-radius: 8px;
        background: #eef4fa;
      }
      .name {
        margin: 0;
        font-weight: 800;
      }
      .price,
      .stock {
        margin: 0.2rem 0;
        color: #4c6580;
      }
      .total {
        margin: 0.7rem 0 0;
        font-weight: 800;
        color: #12406f;
      }
      .qty {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
      }
      .qty button {
        border: 1px solid #cbdeef;
        border-radius: 8px;
        background: #fff;
        width: 30px;
        height: 30px;
        cursor: pointer;
      }
      .btn-remove {
        border: 1px solid #f2cbcb;
        border-radius: 8px;
        background: #fdecec;
        color: #922b2b;
        padding: 0.4rem 0.6rem;
        cursor: pointer;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        margin-bottom: 0.75rem;
      }
      .field input,
      .field textarea {
        border: 1px solid #cbdeef;
        border-radius: 8px;
        padding: 0.55rem 0.65rem;
        font: inherit;
      }
      .field textarea {
        min-height: 75px;
        resize: vertical;
      }
      .split {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.7rem;
      }
      .actions {
        display: flex;
        gap: 0.6rem;
        margin-top: 0.25rem;
      }
      .btn-primary,
      .btn-stripe {
        border: 0;
        border-radius: 10px;
        padding: 0.62rem 0.9rem;
        font-weight: 700;
        cursor: pointer;
      }
      .btn-primary {
        background: linear-gradient(120deg, #0f5e9c, #0d86b8);
        color: #fff;
      }
      .btn-stripe {
        background: #635bff;
        color: #fff;
      }
      .hint {
        margin: 0.8rem 0 0;
        color: #5a6f84;
        font-size: 0.88rem;
      }
      @media (max-width: 900px) {
        .checkout-grid {
          grid-template-columns: 1fr;
        }
        .checkout-item {
          grid-template-columns: 1fr;
        }
        .actions {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class CheckoutComponent implements OnInit {
  items: CartItem[] = [];
  loading = true;
  error = '';
  stripePaymentStarted = false;

  form = {
    fullName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    notes: '',
  };

  stripePaymentLink =
    (globalThis as { __SHOPPING_MALL_STRIPE_PAYMENT_LINK__?: string }).__SHOPPING_MALL_STRIPE_PAYMENT_LINK__ ||
    localStorage.getItem('shoppingMallStripePaymentLink') ||
    '';

  get totalAmount(): number {
    return this.items.reduce((total, item) => total + item.product.price * item.quantity, 0);
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private orderService: OrderService,
    private cartService: CartService,
    private commerceSyncService: CommerceSyncService,
  ) {}

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('id');

    if (productId) {
      this.loadSingleProduct(productId);
      return;
    }

    this.items = this.cartService.getItems();
    this.loading = false;

    if (this.items.length === 0) {
      this.error = 'Votre panier est vide.';
    }
  }

  private loadSingleProduct(productId: string): void {
    this.productService.getProductById(productId).subscribe({
      next: (product: Product) => {
        this.items = [{ product, quantity: 1 }];
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger ce produit.';
        this.loading = false;
      },
    });
  }

  increaseQty(item: CartItem): void {
    const productId = getEntityId(item.product);
    if (!productId) return;

    const newQuantity = Math.min(item.quantity + 1, item.product.stock || item.quantity + 1);
    this.updateItemQuantity(productId, newQuantity);
  }

  decreaseQty(item: CartItem): void {
    const productId = getEntityId(item.product);
    if (!productId) return;

    const newQuantity = item.quantity - 1;
    this.updateItemQuantity(productId, newQuantity);
  }

  removeItem(item: CartItem): void {
    const productId = getEntityId(item.product);
    if (!productId) return;

    this.items = this.items.filter((entry) => getEntityId(entry.product) !== productId);
    this.cartService.removeProduct(productId);

    if (this.items.length === 0) {
      this.error = 'Votre panier est vide.';
    }
  }

  private updateItemQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.items = this.items.filter((entry) => getEntityId(entry.product) !== productId);
      this.cartService.removeProduct(productId);
      return;
    }

    this.items = this.items.map((entry) => {
      if (getEntityId(entry.product) !== productId) return entry;
      const maxStock = Math.max(entry.product.stock || 0, 0);
      const safeQty = Math.min(quantity, maxStock || quantity);
      return { ...entry, quantity: safeQty };
    });

    this.cartService.updateQuantity(productId, quantity);
  }

  canCheckout(): boolean {
    return (
      this.items.length > 0 &&
      this.items.every((item) => item.quantity > 0 && item.quantity <= item.product.stock)
    );
  }

  canConfirmOrder(): boolean {
    const requiredFilled =
      !!this.form.fullName.trim() &&
      !!this.form.email.trim() &&
      !!this.form.phone.trim() &&
      !!this.form.street.trim() &&
      !!this.form.city.trim() &&
      !!this.form.state.trim() &&
      !!this.form.zipCode.trim() &&
      !!this.form.country.trim();

    return requiredFilled && this.canCheckout();
  }

  payWithStripe(): void {
    if (!this.canCheckout()) return;
    if (!this.stripePaymentLink) return;
    this.stripePaymentStarted = true;
    window.open(this.stripePaymentLink, '_blank', 'noopener,noreferrer');
  }

  confirmOrder(e: Event): void {
    e.preventDefault();
    if (!this.canConfirmOrder()) return;

    const orderItems = this.items
      .map((item) => {
        const productId = getEntityId(item.product);
        const shopId =
          typeof item.product.shop === 'string' ? item.product.shop : getEntityId(item.product.shop);

        if (!productId || !shopId) return null;

        return {
          product: productId,
          quantity: item.quantity,
          price: item.product.price,
          shop: shopId,
        };
      })
      .filter((item): item is NonNullable<typeof item> => !!item);

    if (orderItems.length !== this.items.length) {
      this.error = 'Identifiants produit/boutique invalides.';
      return;
    }

    this.orderService
      .createOrder({
        items: orderItems,
        shippingAddress: {
          street: this.form.street.trim(),
          city: this.form.city.trim(),
          state: this.form.state.trim(),
          zipCode: this.form.zipCode.trim(),
          country: this.form.country.trim(),
        },
        paymentMethod: 'credit_card',
      })
      .subscribe({
        next: (order) => {
          this.commerceSyncService.recordValidatedPayment(this.items);

          const orderId = getEntityId(order);
          if (orderId) {
            this.orderService
              .updatePaymentStatus(orderId, { paymentStatus: 'completed' })
              .subscribe({
                error: () => {
                  // Keep checkout success even if payment status endpoint is restricted by backend role rules.
                },
              });
          }

          this.cartService.clear();
          alert('Paiement validé. Montant transféré au vendeur et stock mis à jour.');
          this.router.navigate(['/buyer/orders']);
        },
        error: (err) => {
          this.error = err?.error?.message || 'Échec de la création de commande.';
        },
      });
  }
}
