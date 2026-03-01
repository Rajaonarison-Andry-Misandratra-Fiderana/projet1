import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../models/product.model';
import { getEntityId } from '../../utils/id.util';
import { PRODUCT_CATEGORIES } from '../../constants/categories';

@Component({
  selector: 'app-boutique-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './boutique-products.component.html',
  styleUrl: './boutique-products.component.css',
})
export class BoutiqueProductsComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  loading = true;
  error: string | null = null;
  isSeller = false;
  private destroy$ = new Subject<void>();

  newProduct: Partial<Product> = {
    name: '',
    price: 0,
    stock: 0,
    description: '',
    category: '',
    image: '',
  };

  showCreateModal = false;
  selectedFile: File | null = null;
  previewImage: string | null = null;
  categories = PRODUCT_CATEGORIES;

  constructor(
    private productService: ProductService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.isSeller = this.authService.hasRole(['boutique']);

    this.authService.currentUser$
      .pipe(
        map((user) => getEntityId(user)),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe((shopId) => {
        if (!shopId) {
          this.error = 'Shop not available.';
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }
        this.loadProducts(shopId);
      });

    // Reload when ProductService signals a change (create/update/delete)
    this.productService.refresh$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      const shopId = getEntityId(this.authService.currentUserValue);
      if (shopId) this.loadProducts(shopId);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getProductId(product: Product): string {
    return getEntityId(product);
  }

  loadProducts(shopId: string): void {
    this.loading = true;
    this.error = null;
    this.productService.getProductsByShop(shopId).subscribe({
      next: (prods) => {
        this.products = prods;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to load products.' + (err?.status ? ` (status ${err.status})` : '');
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  openCreateModal(): void {
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.selectedFile = null;
    this.previewImage = null;
    this.newProduct = { name: '', price: 0, stock: 0, description: '', category: '', image: '' };
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.selectedFile = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewImage = e.target?.result as string;
    };
    reader.readAsDataURL(this.selectedFile);
  }

  createProduct(e: Event): void {
    e.preventDefault();
    if (!this.isSeller) {
      alert('Only sellers can create products.');
      return;
    }

    const shopId = getEntityId(this.authService.currentUserValue);
    if (!shopId) {
      alert("Votre compte vendeur n'est pas identifié. Veuillez vous reconnecter.");
      return;
    }

    // Backend createProduct currently expects JSON (no multipart parser).
    const requestPayload = {
      name: String(this.newProduct.name || '').trim(),
      price: Number(this.newProduct.price || 0),
      stock: Number(this.newProduct.stock || 0),
      description: this.newProduct.description
        ? String(this.newProduct.description).trim()
        : undefined,
      category: this.newProduct.category ? String(this.newProduct.category).trim() : undefined,
      // If an image file was picked, previewImage is a base64 data URL string.
      image: this.previewImage || undefined,
    };

    if (!this.canPublishProduct()) {
      alert(
        'Veuillez remplir tous les champs (nom, description, prix, stock, catégorie, image) avant publication.',
      );
      return;
    }

    // Send to backend and rely on server for persistence. On error, show helpful message.
    this.productService.createProduct(requestPayload).subscribe({
      next: (prod) => {
        this.closeCreateModal();
        this.loadProducts(shopId);
        this.cdr.detectChanges();
      },
      error: (err) => {
        let msg = 'Impossible de créer le produit sur le serveur.';
        if (err?.status === 401) msg += ' Erreur 401 — non autorisé. Vérifiez la connexion.';
        if (err?.status === 400) {
          const backendReason = err?.error?.message ? ` Détail: ${err.error.message}` : '';
          msg += ` Erreur 400 — requête invalide. Vérifiez les champs.${backendReason}`;
        }
        if (err?.status === 500)
          msg += ' Erreur 500 — erreur côté serveur. Consultez les logs backend.';
        alert(msg + ' Voir la console pour plus de détails.');
        this.cdr.detectChanges();
      },
    });
  }

  edit(id?: string): void {
    alert('Edit not implemented yet.');
  }

  delete(id?: string): void {
    if (!id) return;
    if (!confirm('Delete this product?')) return;
    this.productService.deleteProduct(id).subscribe({
      next: () => {
        // productService.refresh$ will trigger reload; no optimistic local filtering
        this.cdr.detectChanges();
      },
      error: () => alert('Failed to delete product.'),
    });
  }

  canPublishProduct(): boolean {
    const name = String(this.newProduct.name || '').trim();
    const description = String(this.newProduct.description || '').trim();
    const category = String(this.newProduct.category || '').trim();
    const price = Number(this.newProduct.price || 0);
    const stock = Number(this.newProduct.stock || 0);
    const hasImage = !!this.previewImage;
    return (
      !!name &&
      !!description &&
      !!category &&
      Number.isFinite(price) &&
      price > 0 &&
      Number.isFinite(stock) &&
      stock >= 0 &&
      hasImage
    );
  }
}
