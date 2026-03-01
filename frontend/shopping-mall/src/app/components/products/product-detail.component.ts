import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { Product } from '../../models/product.model';
import { getEntityId } from '../../utils/id.util';
import { incrementProductClick } from '../../utils/product-clicks.util';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container" *ngIf="product">
      <h1>{{ product.name }}</h1>
      <img
        [src]="product.image || '/assets/placeholder.png'"
        alt="{{ product.name }}"
        class="product-img"
      />
      <p class="price">Price: \${{ product.price }}</p>
      <p class="desc">{{ product.description }}</p>

      <div class="actions">
        <button (click)="back()">Back to Products</button>

        <button *ngIf="canBuy" (click)="buy()" [disabled]="product.stock <= 0">Buy</button>

        <span *ngIf="!canBuy" class="info">Only buyers can purchase products.</span>
      </div>
    </div>

    <div *ngIf="!product" class="container">
      <p>Loading product...</p>
    </div>
  `,
  styles: [
    `
      .container {
        padding: 2rem;
        text-align: center;
      }
      .product-img {
        max-width: 300px;
        display: block;
        margin: 1rem auto;
      }
      .price {
        font-weight: bold;
      }
      .actions {
        margin-top: 1rem;
      }
      .info {
        color: #c0392b;
        margin-left: 1rem;
      }
    `,
  ],
})
export class ProductDetailComponent implements OnInit {
  productId: string | null = null;
  product: Product | null = null;
  canBuy = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private authService: AuthService,
    private orderService: OrderService,
  ) {}

  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get('id');
    if (this.productId) {
      this.productService.getProductById(this.productId).subscribe({
        next: (p) => {
          this.product = p;
          const id = getEntityId(p);
          if (id) incrementProductClick(id);
        },
        error: () => (this.product = null),
      });
    }

    // Only users with role 'acheteur' can buy
    this.canBuy = this.authService.hasRole(['acheteur']);
  }

  back(): void {
    this.router.navigate(['/products']);
  }

  buy(): void {
    if (!this.product) return;
    if (!this.authService.isAuthenticated() || !this.authService.hasRole(['acheteur'])) {
      alert('You must be logged in as a buyer to purchase.');
      return;
    }

    const productId = getEntityId(this.product);
    const shopId =
      typeof this.product.shop === 'string' ? this.product.shop : getEntityId(this.product.shop);
    if (!productId || !shopId) {
      alert('Impossible de créer la commande: identifiants produit/boutique invalides.');
      return;
    }

    const orderReq = {
      items: [{ product: productId, quantity: 1, price: this.product.price, shop: shopId }],
      shippingAddress: {
        street: 'Unknown',
        city: 'Unknown',
        state: 'Unknown',
        zipCode: '00000',
        country: 'Unknown',
      },
      paymentMethod: 'credit_card' as const,
    };

    this.orderService.createOrder(orderReq).subscribe({
      next: () => {
        alert('Order placed successfully.');
        this.router.navigate(['/buyer/orders']);
      },
      error: (err) => {
        console.error(err);
        alert('Failed to place order.');
      },
    });
  }
}
