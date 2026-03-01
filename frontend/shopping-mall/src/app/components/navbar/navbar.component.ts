import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { USERS as SEED_USERS } from '../../mock/seed';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit {
  currentUser: User | null = null;
  isMenuOpen = false;
  showQuickLogin = false;
  seedUsers: User[] = SEED_USERS;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  goToProducts(): void {
    this.router.navigate(['/products']);
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
    this.isMenuOpen = false;
  }

  quickLogin(user: User): void {
    // simple demo login: store token + user then reload to re-evaluate app state
    localStorage.setItem('token', 'demo-token-' + user.id);
    localStorage.setItem('user', JSON.stringify(user));
    // notify via auth service subjects if possible by reloading
    window.location.reload();
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  isBoutique(): boolean {
    return this.currentUser?.role === 'boutique';
  }

  isAcheteur(): boolean {
    return this.currentUser?.role === 'acheteur';
  }
}
