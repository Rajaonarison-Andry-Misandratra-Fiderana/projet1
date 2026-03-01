import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { Product } from '../../models/product.model';
import { PRODUCT_CATEGORIES } from '../../constants/categories';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.css'],
})
export class ProductsListComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  loading = false;
  error = '';
  searchQuery = '';
  selectedCategory = '';
  minPrice = 0;
  maxPrice = 10000000;
  readonly maxPriceLimit = 10000000;
  private destroy$ = new Subject<void>();
  selectedProduct: Product | null = null;
  isBuyer = false;

  categories = PRODUCT_CATEGORIES;
  constructor(
    private productService: ProductService,
    private authService: AuthService,
    private router: Router,
    private cartService: CartService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.isBuyer = this.authService.hasRole(['acheteur']);
    this.loadProducts();

    // Reload when products change (create/update/delete elsewhere)
    this.productService.refresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadProducts());

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        filter((event) => event.urlAfterRedirects.startsWith('/products')),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.loadProducts());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProducts(): void {
    this.loading = true;
    this.error = '';
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.error = error?.error?.message || "Impossible de charger les produits depuis l'API.";
        this.products = [];
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  getSellerName(product: Product): string {
    if (!product.shop) return 'Boutique inconnue';
    if (typeof product.shop === 'string') return 'Boutique';
    return product.shop.name || 'Boutique';
  }

  openProductPopup(product: Product): void {
    this.selectedProduct = product;
  }

  closeProductPopup(): void {
    this.selectedProduct = null;
  }

  buySelectedProduct(): void {
    if (!this.selectedProduct) return;
    if (!this.authService.isAuthenticated() || !this.authService.hasRole(['acheteur'])) {
      alert('Vous devez être connecté en tant qu’acheteur.');
      this.router.navigate(['/login']);
      return;
    }
    this.cartService.addProduct(this.selectedProduct, 1);
    this.closeProductPopup();
  }

  applyFilters(): void {
    const min = Math.min(this.minPrice, this.maxPrice);
    const max = Math.max(this.minPrice, this.maxPrice);
    const normalizedSearch = this.normalizeText(this.searchQuery);

    this.filteredProducts = this.products.filter((product) => {
      const haystack = this.normalizeText(
        [
          product.name,
          product.description || '',
          product.category || '',
          product.location || '',
          this.getSellerName(product),
        ].join(' '),
      );
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);

      const matchesCategory = !this.selectedCategory || product.category === this.selectedCategory;
      const matchesPrice = product.price >= min && product.price <= max;

      return matchesSearch && matchesCategory && matchesPrice;
    });
  }

  private normalizeText(value: string): string {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onCategoryChange(): void {
    this.applyFilters();
  }

  onPriceChange(): void {
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.minPrice = 0;
    this.maxPrice = this.maxPriceLimit;
    this.applyFilters();
  }
}
