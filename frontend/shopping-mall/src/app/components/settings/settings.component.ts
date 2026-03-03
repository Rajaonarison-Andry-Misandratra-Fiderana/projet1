import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

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
  savingPrivacy = false;
  error = '';
  success = '';
  privacyError = '';
  privacySuccess = '';
  adminVisibilityEnabled = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
  ) {
    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', [Validators.required, Validators.minLength(6)]],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required, Validators.minLength(6)]],
      },
      { validators: this.passwordMatchValidator },
    );

    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.adminVisibilityEnabled = !!user?.adminCanViewCommerce;
    });
  }

  get f() {
    return this.passwordForm.controls;
  }

  submit(): void {
    this.error = '';
    this.success = '';
    this.passwordForm.markAllAsTouched();

    if (this.passwordForm.invalid || this.submitting) {
      return;
    }

    const currentPassword = String(this.f['currentPassword'].value || '').trim();
    const newPassword = String(this.f['newPassword'].value || '').trim();

    if (currentPassword === newPassword) {
      this.error = 'Le nouveau mot de passe doit être différent de l’actuel.';
      return;
    }

    this.submitting = true;
    this.authService.changePassword({ currentPassword, newPassword }).subscribe({
      next: (res) => {
        this.submitting = false;
        this.success = res?.message || 'Mot de passe changé avec succès.';
        this.passwordForm.reset();
      },
      error: (err) => {
        this.submitting = false;
        this.error = err?.error?.message || 'Impossible de changer le mot de passe.';
      },
    });
  }

  savePrivacySettings(): void {
    this.privacyError = '';
    this.privacySuccess = '';

    if (this.currentUser?.role !== 'boutique' || this.savingPrivacy) {
      return;
    }

    this.savingPrivacy = true;
    this.authService.updateSellerAdminVisibility(this.adminVisibilityEnabled).subscribe({
      next: () => {
        this.savingPrivacy = false;
        this.privacySuccess = 'Préférence de visibilité enregistrée.';
      },
      error: (err) => {
        this.savingPrivacy = false;
        this.privacyError = err?.error?.message || 'Impossible d’enregistrer ce paramètre.';
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
