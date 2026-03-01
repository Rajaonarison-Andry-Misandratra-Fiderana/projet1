import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.model';
import { getEntityId } from '../../utils/id.util';
import { PRODUCT_CATEGORIES } from '../../constants/categories';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
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
  maxPrice = 10000;
  private destroy$ = new Subject<void>();

  categories = PRODUCT_CATEGORIES;
  constructor(
    private productService: ProductService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
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
        this.error = error?.error?.message || 'Failed to load products from API.';
        this.products = [];
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  getProductId(product: Product): string {
    return getEntityId(product);
  }

  applyFilters(): void {
    this.filteredProducts = this.products.filter((product) => {
      const matchesSearch =
        !this.searchQuery ||
        product.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesCategory = !this.selectedCategory || product.category === this.selectedCategory;
      const matchesPrice = product.price >= this.minPrice && product.price <= this.maxPrice;

      return matchesSearch && matchesCategory && matchesPrice;
    });
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
}
