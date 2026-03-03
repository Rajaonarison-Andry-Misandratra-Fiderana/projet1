import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  readonly demoAccounts = [
    { label: 'Acheteur', email: 'acheteur@gmail.com', password: 'acheteur' },
    { label: 'Vendeur', email: 'vendeur@gmail.com', password: 'vendeur123' },
    { label: 'Admin', email: 'admin@gmail.com', password: 'administrateur' },
  ];

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    document.body.classList.add('auth-no-scroll');
    this.loginForm = this.formBuilder.group({
      email: [this.demoAccounts[0].email, [Validators.required, Validators.email]],
      password: [this.demoAccounts[0].password, [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnDestroy(): void {
    document.body.classList.remove('auth-no-scroll');
  }

  get f() { return this.loginForm.controls; }

  useDemoAccount(email: string, password: string): void {
    this.loginForm.patchValue({ email, password });
    this.error = '';
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';

    if (this.loginForm.invalid) {
      return;
    }

    const email = String(this.loginForm.value.email || '')
      .trim()
      .toLowerCase();
    const password = String(this.loginForm.value.password || '').trim();
    if (!email || !password) {
      this.error = 'Email et mot de passe requis.';
      return;
    }

    this.loading = true;
    this.authService.login({ email, password }).subscribe({
      next: (response) => {
        this.router.navigate(['/']);
      },
      error: (error) => {
        if (error?.status === 400) {
          this.error = "Identifiants invalides (email/mot de passe) ou compte inexistant sur cette base.";
        } else if (error?.status === 0) {
          this.error = "API inaccessible. Vérifie que le backend est démarré et l'URL API correcte.";
        } else {
          this.error = error.error?.message || 'Échec de connexion';
        }
        this.loading = false;
      }
    });
  }
}
