import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Product, CreateProductRequest, UpdateProductRequest } from '../models/product.model';
import { API_BASE_URL } from '../config/api.config';
import { getEntityId } from '../utils/id.util';
import { CommerceSyncService } from './commerce-sync.service';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private apiUrl = `${API_BASE_URL}/products`;
  private refreshSubject = new Subject<void>();
  public refresh$ = this.refreshSubject.asObservable();

  constructor(
    private http: HttpClient,
    private commerceSyncService: CommerceSyncService,
  ) {}

  getProducts(filters?: {
    category?: string;
    shop?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Observable<Product[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.category) params = params.set('category', filters.category);
      if (filters.shop) params = params.set('shop', filters.shop);
      if (filters.search) params = params.set('search', filters.search);
      if (filters.minPrice) params = params.set('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params = params.set('maxPrice', filters.maxPrice.toString());
    }
    return this.http
      .get<Product[]>(this.apiUrl, { params })
      .pipe(map((products) => products.map((product) => this.withSyncedStock(product))));
  }

  getProductById(id: string): Observable<Product> {
    return this.http
      .get<Product>(`${this.apiUrl}/${id}`)
      .pipe(map((product) => this.withSyncedStock(product)));
  }

  getProductsByShop(shopId: string): Observable<Product[]> {
    return this.http
      .get<Product[]>(`${this.apiUrl}/shop/${shopId}`)
      .pipe(map((products) => products.map((product) => this.withSyncedStock(product))));
  }

  getAdminVisibleProducts(): Observable<Product[]> {
    return this.http
      .get<Product[]>(`${this.apiUrl}/admin/visible`)
      .pipe(map((products) => products.map((product) => this.withSyncedStock(product))));
  }

  createProduct(request: CreateProductRequest): Observable<Product> {
    return this.http
      .post<Product>(this.apiUrl, request)
      .pipe(tap(() => this.refreshSubject.next()));
  }

  updateProduct(id: string, request: UpdateProductRequest): Observable<Product> {
    return this.http
      .put<Product>(`${this.apiUrl}/${id}`, request)
      .pipe(tap(() => this.refreshSubject.next()));
  }

  deleteProduct(id: string): Observable<any> {
    return this.http
      .delete<any>(`${this.apiUrl}/${id}`)
      .pipe(tap(() => this.refreshSubject.next()));
  }

  addReview(productId: string, review: { comment: string; rating: number }): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/${productId}/reviews`, review);
  }

  private withSyncedStock(product: Product): Product {
    const productId = getEntityId(product);
    if (!productId) return product;
    return {
      ...product,
      stock: this.commerceSyncService.applyStockOffset(product.stock || 0, productId),
    };
  }
}
