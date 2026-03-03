import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import {
  User,
  AuthResponse,
  LoginRequest,
  SignupRequest,
  AdminCreateSellerRequest,
  ChangePasswordRequest,
} from '../models/user.model';
import { API_BASE_URL } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${API_BASE_URL}/users`;
  private usersRefreshSubject = new Subject<void>();
  public usersRefresh$ = this.usersRefreshSubject.asObservable();
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;
  private tokenSubject: BehaviorSubject<string | null>;
  public token$: Observable<string | null>;

  constructor(private http: HttpClient) {
    const storedUserRaw = localStorage.getItem('user');
    const storedTokenRaw = localStorage.getItem('token');
    const storedToken = this.isLikelyJwt(storedTokenRaw) ? storedTokenRaw : null;
    let storedUser: User | null = null;
    try {
      storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
    } catch {
      storedUser = null;
    }

    if (!storedToken) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      storedUser = null;
    }

    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser);
    this.currentUser$ = this.currentUserSubject.asObservable();
    this.tokenSubject = new BehaviorSubject<string | null>(storedToken);
    this.token$ = this.tokenSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get tokenValue(): string | null {
    return this.tokenSubject.value;
  }

  public get apiBaseUrl(): string {
    return API_BASE_URL;
  }

  signup(request: SignupRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/signup`, request).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        this.setCurrentUser(response.user);
        this.tokenSubject.next(response.token);
      })
    );
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        this.setCurrentUser(response.user);
        this.tokenSubject.next(response.token);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/profile`).pipe(
      map((user) => this.normalizeUser(user)),
      tap((user) => this.setCurrentUser(user)),
    );
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<unknown>(this.apiUrl).pipe(
      map((response) => {
        const users = this.extractUsers(response);
        return users.map((u) => this.normalizeUser(u));
      }),
    );
  }

  updateUser(
    id: string,
    payload: Partial<Pick<User, 'name' | 'email' | 'role' | 'boutiqueStatus' | 'assignedBox'>>,
  ): Observable<User> {
    return this.http
      .put<User>(`${this.apiUrl}/${id}`, payload)
      .pipe(tap(() => this.usersRefreshSubject.next()));
  }

  deleteUser(id: string): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.apiUrl}/${id}`)
      .pipe(tap(() => this.usersRefreshSubject.next()));
  }

  createSellerByAdmin(payload: AdminCreateSellerRequest): Observable<{ user: User }> {
    return this.http
      .post<{ user: User }>(`${this.apiUrl}/admin-create-seller`, payload)
      .pipe(tap(() => this.usersRefreshSubject.next()));
  }

  changePassword(payload: ChangePasswordRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/change-password`, payload);
  }

  updateSellerAdminVisibility(adminCanViewCommerce: boolean): Observable<{ user: User }> {
    return this.http
      .put<{ user: User }>(`${this.apiUrl}/settings/admin-visibility`, { adminCanViewCommerce })
      .pipe(
        tap((response) => {
          if (response?.user) {
            this.setCurrentUser(response.user);
          }
        }),
      );
  }

  isAuthenticated(): boolean {
    return this.tokenValue !== null;
  }

  hasRole(roles: string[]): boolean {
    const currentUser = this.currentUserValue;
    return currentUser ? roles.includes(currentUser.role) : false;
  }

  private isLikelyJwt(token: string | null): token is string {
    if (!token) return false;
    return token.split('.').length === 3;
  }

  private extractUsers(response: unknown): User[] {
    if (Array.isArray(response)) return response as User[];
    const asObject = response as { users?: User[]; data?: User[]; result?: User[] };
    if (Array.isArray(asObject?.users)) return asObject.users;
    if (Array.isArray(asObject?.data)) return asObject.data;
    if (Array.isArray(asObject?.result)) return asObject.result;
    return [];
  }

  private normalizeUser(user: Partial<User>): User {
    return {
      id: user.id || user._id,
      _id: user._id || user.id,
      name: user.name || '',
      email: user.email || '',
      role: (user.role || 'acheteur') as User['role'],
      boutiqueStatus: (user.boutiqueStatus || 'approved') as User['boutiqueStatus'],
      assignedBox: user.assignedBox || '',
      adminCanViewCommerce: !!user.adminCanViewCommerce,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private setCurrentUser(user: Partial<User>): void {
    const normalized = this.normalizeUser(user);
    localStorage.setItem('user', JSON.stringify(normalized));
    this.currentUserSubject.next(normalized);
  }
}
