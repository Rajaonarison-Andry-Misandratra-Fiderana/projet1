import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../models/product.model';
import { getEntityId } from '../../utils/id.util';
import { PRODUCT_CATEGORIES, toFrenchCategory } from '../../constants/categories';

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
  createError: string | null = null;
  publishAccessMessage: string | null = null;
  isSeller = false;
  boutiqueStatus: 'pending' | 'approved' | 'rejected' | '' = '';
  assignedBox = '';
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
  showEditModal = false;
  isPublishing = false;
  imageLoading = false;
  selectedFile: File | null = null;
  previewImage: string | null = null;
  categories = PRODUCT_CATEGORIES;
  editingProductId: string | null = null;
  editProduct: { name: string; description: string; price: number; stock: number } = {
    name: '',
    description: '',
    price: 0,
    stock: 0,
  };

  constructor(
    private productService: ProductService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.isSeller = this.authService.hasRole(['boutique']);
    const currentUser = this.authService.currentUserValue;
    this.boutiqueStatus = currentUser?.boutiqueStatus || '';
    this.assignedBox = currentUser?.assignedBox || '';

    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      this.boutiqueStatus = user?.boutiqueStatus || '';
      this.assignedBox = user?.assignedBox || '';
      this.publishAccessMessage = this.getPublishAccessMessage();
    });

    this.authService.getProfile().subscribe({
      next: () => {
        this.publishAccessMessage = this.getPublishAccessMessage();
        this.cdr.detectChanges();
      },
      error: () => {
        this.publishAccessMessage = this.getPublishAccessMessage();
      },
    });

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
    if (!this.canPublishNow()) {
      this.publishAccessMessage = this.getPublishAccessMessage();
      this.cdr.detectChanges();
      return;
    }
    this.createError = null;
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.isPublishing = false;
    this.createError = null;
    this.selectedFile = null;
    this.imageLoading = false;
    this.previewImage = null;
    this.newProduct = {
      name: '',
      price: 0,
      stock: 0,
      description: '',
      category: '',
      image: '',
    };
  }

  openEditModal(product: Product): void {
    const id = getEntityId(product);
    if (!id) return;
    this.editingProductId = id;
    this.editProduct = {
      name: String(product.name || ''),
      description: String(product.description || ''),
      price: Number(product.price || 0),
      stock: Number(product.stock || 0),
    };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingProductId = null;
    this.editProduct = { name: '', description: '', price: 0, stock: 0 };
  }

  canSaveEdit(): boolean {
    const name = this.editProduct.name.trim();
    const description = this.editProduct.description.trim();
    const price = Number(this.editProduct.price || 0);
    const stock = Number(this.editProduct.stock || 0);
    return (
      !!name &&
      !!description &&
      Number.isFinite(price) &&
      price > 0 &&
      Number.isFinite(stock) &&
      stock >= 0
    );
  }

  saveEdit(e: Event): void {
    e.preventDefault();
    if (!this.editingProductId) return;
    if (!this.canSaveEdit()) {
      alert('Veuillez remplir correctement tous les champs de modification.');
      return;
    }

    const payload = {
      name: this.editProduct.name.trim(),
      description: this.editProduct.description.trim(),
      price: Number(this.editProduct.price),
      stock: Number(this.editProduct.stock),
    };

    this.productService.updateProduct(this.editingProductId, payload).subscribe({
      next: () => {
        this.closeEditModal();
        const shopId = getEntityId(this.authService.currentUserValue);
        if (shopId) this.loadProducts(shopId);
        this.cdr.detectChanges();
      },
      error: () => {
        alert('Impossible de modifier le produit.');
        this.cdr.detectChanges();
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.selectedFile = input.files[0];
    this.previewImage = null;
    this.imageLoading = true;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewImage = e.target?.result as string;
      this.imageLoading = false;
      this.cdr.detectChanges();
    };
    reader.onerror = () => {
      this.imageLoading = false;
      this.createError = "Impossible de charger l'image sélectionnée.";
      this.cdr.detectChanges();
    };
    reader.onabort = () => {
      this.imageLoading = false;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(this.selectedFile);
  }

  createProduct(e: Event): void {
    e.preventDefault();
    if (this.isPublishing || this.imageLoading) return;
    this.createError = null;
    if (!this.isSeller) {
      this.createError = 'Seuls les vendeurs peuvent publier un produit.';
      return;
    }
    if (!this.canPublishNow()) {
      this.createError =
        "Votre boutique est en attente de validation admin ou aucun box n'est attribué.";
      return;
    }

    const shopId = getEntityId(this.authService.currentUserValue);
    if (!shopId) {
      this.createError = "Votre compte vendeur n'est pas identifié. Veuillez vous reconnecter.";
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
      this.createError =
        'Tous les champs sont obligatoires: nom, description, prix (> 0), stock (>= 0), catégorie et image.';
      return;
    }

    // Send to backend and rely on server for persistence. On error, show helpful message.
    this.isPublishing = true;
    this.productService.createProduct(requestPayload).subscribe({
      next: (prod) => {
        this.products = [prod, ...this.products];
        this.closeCreateModal();
        this.loadProducts(shopId);
        this.isPublishing = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        let msg = 'Impossible de créer le produit sur le serveur.';
        if (err?.status === 401) msg += ' Erreur 401 — non autorisé. Vérifiez la connexion.';
        if (err?.status === 403)
          msg += ' Erreur 403 — accès refusé. Votre compte doit être rôle boutique/admin.';
        if (err?.status === 400) {
          const backendReason = err?.error?.message ? ` Détail: ${err.error.message}` : '';
          msg += ` Erreur 400 — requête invalide. Vérifiez les champs.${backendReason}`;
        }
        if (err?.status === 500)
          msg += ' Erreur 500 — erreur côté serveur. Consultez les logs backend.';
        if (err?.status === 413)
          msg +=
            " Erreur 413 — image trop volumineuse. Réduisez la taille de l'image puis réessayez.";
        this.createError = msg;
        this.isPublishing = false;
        this.cdr.detectChanges();
      },
    });
  }

  delete(id?: string): void {
    if (!id) return;
    if (!confirm('Supprimer ce produit ?')) return;
    this.productService.deleteProduct(id).subscribe({
      next: () => {
        // productService.refresh$ will trigger reload; no optimistic local filtering
        this.cdr.detectChanges();
      },
      error: () => alert('Impossible de supprimer le produit.'),
    });
  }

  canPublishNow(): boolean {
    return this.isSeller && !!this.assignedBox;
  }

  private getPublishAccessMessage(): string | null {
    if (!this.isSeller) return null;
    if (!this.assignedBox) {
      return "Aucun box n'est attribué à votre boutique. Contactez un administrateur.";
    }
    return null;
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

  getCategoryLabel(category: string | undefined): string {
    const translated = toFrenchCategory(category);
    return translated || 'Sans catégorie';
  }
}
