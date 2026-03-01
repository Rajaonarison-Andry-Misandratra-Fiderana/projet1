import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.model';
import { PRODUCTS as FALLBACK_PRODUCTS } from '../../mock/seed';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.css'],
})
export class ProductsListComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  loading = false;
  error = '';
  searchQuery = '';
  selectedCategory = '';
  minPrice = 0;
  maxPrice = 10000;

  categories = ['Fashion', 'Electronics', 'Home & Garden', 'Books', 'Sports', 'Beauty'];

  isSeller = false;

  constructor(
    private productService: ProductService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.isSeller = this.authService.hasRole(['boutique']);
  }

  loadProducts(): void {
    this.loading = true;
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load products from API — using local fallback.';
        // fallback to seeded products so the UI remains usable during dev
        this.products = FALLBACK_PRODUCTS;
        this.applyFilters();
        this.loading = false;
      },
    });
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
