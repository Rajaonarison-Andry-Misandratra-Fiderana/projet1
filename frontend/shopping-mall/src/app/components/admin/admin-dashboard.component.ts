import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PRODUCTS, USERS, VISITS } from '../../mock/seed';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <h1>Admin Dashboard</h1>
      <div class="admin-actions">
        <button (click)="seedBackend()" [disabled]="seeding">Seed backend</button>
        <span *ngIf="seedStatus">{{ seedStatus }}</span>
      </div>

      <div class="stats">
        <div class="stat">Visits total: {{ visits.total }}</div>
        <div class="stat">Visitors today: {{ visits.today }}</div>
        <div class="stat">Buyers: {{ buyersCount }}</div>
        <div class="stat">Sellers: {{ sellersCount }}</div>
        <div class="stat">Products: {{ products.length }}</div>
      </div>

      <h2>Products</h2>
      <ul>
        <li *ngFor="let p of products">
          {{ p.name }} — {{ p.price | number: '1.0-0' }} MGA
          <button (click)="deleteProduct(p.id)">Supprimer</button>
        </li>
      </ul>

      <h2>Vendeurs</h2>
      <ul>
        <li *ngFor="let u of sellers">
          {{ u.name }} ({{ u.email }})
          <button (click)="deleteSeller(u.id)">Supprimer vendeur</button>
        </li>
      </ul>
    </div>
  `,
  styles: [
    '.container { padding: 2rem } .stats{display:flex;gap:1rem;margin-bottom:1rem} .stat{background:#f4f4f4;padding:0.5rem;border-radius:4px}',
  ],
})
export class AdminDashboardComponent implements OnInit {
  products = [...PRODUCTS];
  users = [...USERS];
  visits = VISITS;

  sellers = this.users.filter((u) => u.role === 'boutique');
  buyersCount = this.users.filter((u) => u.role === 'acheteur').length;
  sellersCount = this.sellers.length;

  seeding = false;
  seedStatus = '';

  constructor(
    private productService: ProductService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {}

  deleteProduct(id?: string): void {
    if (!id) return;
    if (!confirm('Delete product ' + id + '?')) return;
    // attempt backend delete, but also remove locally
    this.productService.deleteProduct(id).subscribe({
      next: () => {
        this.products = this.products.filter((p) => p.id !== id);
      },
      error: () => {
        // backend may not be available during dev; still remove locally
        this.products = this.products.filter((p) => p.id !== id);
        alert('Product removed locally (backend delete failed).');
      },
    });
  }

  deleteSeller(id?: string): void {
    if (!id) return;
    if (!confirm('Delete seller ' + id + ' and their products?')) return;
    // remove seller locally
    this.users = this.users.filter((u) => u.id !== id);
    this.sellers = this.users.filter((u) => u.role === 'boutique');
    this.products = this.products.filter((p) => (p.shop as any)?.id !== id);
    this.sellersCount = this.sellers.length;
    this.buyersCount = this.users.filter((u) => u.role === 'acheteur').length;
    alert('Seller removed locally. Backend removal not implemented in frontend.');
  }

  seedBackend(): void {
    if (
      !confirm(
        'Seed backend with demo users and products? This will attempt to create users and products on the backend.',
      )
    )
      return;
    this.seeding = true;
    this.seedStatus = 'Seeding users...';
    const password = 'Password123!';

    // create users sequentially to better handle tokens
    const tryCreateUser = (index: number) => {
      if (index >= USERS.length) {
        this.seedStatus = 'Users created. Seeding products for seller...';
        // find seller and create products
        const seller = USERS.find((u) => u.role === 'boutique');
        if (seller) {
          // attempt login as seller to get token
          this.authService.login({ email: seller.email, password }).subscribe({
            next: () => this.createProductsForSeller(seller),
            error: () => {
              // if login fails, try signup for seller specifically
              this.authService
                .signup({ name: seller.name, email: seller.email, password, role: 'boutique' })
                .subscribe({
                  next: () => this.createProductsForSeller(seller),
                  error: () => {
                    this.seedStatus = 'Failed to obtain seller credentials.';
                    this.seeding = false;
                  },
                });
            },
          });
        } else {
          this.seedStatus = 'No seller in seed data.';
          this.seeding = false;
        }
        return;
      }

      const u = USERS[index];
      this.authService
        .signup({ name: u.name, email: u.email, password, role: u.role as any })
        .subscribe({
          next: () => {
            this.seedStatus = `Created user ${u.email}`;
            tryCreateUser(index + 1);
          },
          error: () => {
            // possibly already exists — try login and continue
            this.authService.login({ email: u.email, password }).subscribe({
              next: () => {
                tryCreateUser(index + 1);
              },
              error: () => {
                this.seedStatus = `Failed for user ${u.email}`;
                tryCreateUser(index + 1);
              },
            });
          },
        });
    };

    tryCreateUser(0);
  }

  createProductsForSeller(seller: any): void {
    const prods = PRODUCTS.filter((p) => (p.shop as any)?.id === seller.id);
    if (!prods.length) {
      this.seedStatus = 'No products to seed';
      this.seeding = false;
      return;
    }
    this.seedStatus = 'Seeding products...';
    let completed = 0;
    prods.forEach((p) => {
      const payload: any = {
        name: p.name,
        price: p.price,
        stock: p.stock,
        description: p.description,
        category: p.category,
      };
      // include image if present
      if (p.image) payload.image = p.image;
      this.productService.createProduct(payload).subscribe({
        next: (created) => {
          this.products.push(created);
          completed++;
          if (completed === prods.length) {
            this.seedStatus = 'Seeding complete';
            this.seeding = false;
          }
        },
        error: () => {
          this.products.push(p as any);
          completed++;
          if (completed === prods.length) {
            this.seedStatus = 'Seeding complete (with local fallbacks)';
            this.seeding = false;
          }
        },
      });
    });
  }
}
