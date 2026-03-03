import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { forkJoin, Observable, of } from 'rxjs';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
})
export class SettingsComponent {
  passwordForm: FormGroup;
  currentUser: User | null = null;
  submitting = false;
  error = '';
  success = '';
  privacyError = '';
  adminVisibilityEnabled = false;
  initialAdminVisibility = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
  ) {
    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', [Validators.minLength(6)]],
        newPassword: ['', [Validators.minLength(6)]],
        confirmPassword: ['', [Validators.minLength(6)]],
      },
      { validators: this.passwordMatchValidator },
    );

    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.adminVisibilityEnabled = !!user?.adminCanViewCommerce;
      this.initialAdminVisibility = !!user?.adminCanViewCommerce;
    });
  }

  get f() {
    return this.passwordForm.controls;
  }

  submit(): void {
    this.error = '';
    this.privacyError = '';
    this.success = '';
    if (this.submitting) return;

    const currentPassword = String(this.f['currentPassword'].value || '').trim();
    const newPassword = String(this.f['newPassword'].value || '').trim();
    const confirmPassword = String(this.f['confirmPassword'].value || '').trim();
    const hasPasswordInput = !!currentPassword || !!newPassword || !!confirmPassword;
    const privacyChanged =
      this.currentUser?.role === 'boutique' &&
      this.adminVisibilityEnabled !== this.initialAdminVisibility;

    if (!hasPasswordInput && !privacyChanged) {
      this.success = 'Aucune modification à enregistrer.';
      return;
    }

    let passwordRequest$: Observable<{ message: string }> = of({ message: '' });
    if (hasPasswordInput) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        this.error = 'Pour changer le mot de passe, remplissez tous les champs.';
        return;
      }
      this.passwordForm.markAllAsTouched();
      if (this.passwordForm.invalid) return;

      if (currentPassword === newPassword) {
        this.error = 'Le nouveau mot de passe doit être différent de l’actuel.';
        return;
      }

      passwordRequest$ = this.authService.changePassword({ currentPassword, newPassword });
    }

    let privacyRequest$: Observable<{ user: User }> = of({ user: this.currentUser as User });
    if (privacyChanged && this.currentUser?.role === 'boutique') {
      privacyRequest$ = this.authService.updateSellerAdminVisibility(this.adminVisibilityEnabled);
    }

    this.submitting = true;
    forkJoin({ passwordRes: passwordRequest$, privacyRes: privacyRequest$ }).subscribe({
      next: ({ passwordRes, privacyRes }) => {
        this.submitting = false;
        if (hasPasswordInput) {
          this.passwordForm.reset();
        }
        if (privacyChanged) {
          this.initialAdminVisibility = !!privacyRes?.user?.adminCanViewCommerce;
        }
        this.success = hasPasswordInput
          ? passwordRes?.message || 'Mise à jour enregistrée avec succès.'
          : 'Paramètre enregistré avec succès.';
      },
      error: (err) => {
        this.submitting = false;
        const message = err?.error?.message || 'Impossible d’enregistrer les modifications.';
        if (privacyChanged && !hasPasswordInput) {
          this.privacyError = message;
          return;
        }
        this.error = message;
      },
    });
  }

  private passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const newPassword = String(group.get('newPassword')?.value || '');
    const confirmPassword = String(group.get('confirmPassword')?.value || '');
    if (!newPassword || !confirmPassword) return null;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }
}
