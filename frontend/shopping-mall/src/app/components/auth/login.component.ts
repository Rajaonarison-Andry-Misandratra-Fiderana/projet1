import { Component, OnInit } from '@angular/core';
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
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get f() { return this.loginForm.controls; }

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
