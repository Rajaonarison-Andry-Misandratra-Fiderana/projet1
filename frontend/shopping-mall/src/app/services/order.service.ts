import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Order, CreateOrderRequest, UpdateOrderStatusRequest, UpdatePaymentStatusRequest } from '../models/order.model';
import { API_BASE_URL } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = `${API_BASE_URL}/orders`;
  private refreshSubject = new Subject<void>();
  public refresh$ = this.refreshSubject.asObservable();

  constructor(private http: HttpClient) { }

  createOrder(request: CreateOrderRequest): Observable<Order> {
    return this.http.post<Order>(this.apiUrl, request).pipe(tap(() => this.refreshSubject.next()));
  }

  getMyOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/my-orders`);
  }

  getShopOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/shop/orders`);
  }

  getAllOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.apiUrl);
  }

  getOrderById(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${id}`);
  }

  updateOrderStatus(id: string, request: UpdateOrderStatusRequest): Observable<Order> {
    return this.http
      .put<Order>(`${this.apiUrl}/${id}/status`, request)
      .pipe(tap(() => this.refreshSubject.next()));
  }

  updatePaymentStatus(id: string, request: UpdatePaymentStatusRequest): Observable<Order> {
    return this.http
      .put<Order>(`${this.apiUrl}/${id}/payment-status`, request)
      .pipe(tap(() => this.refreshSubject.next()));
  }

  deleteOrder(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(tap(() => this.refreshSubject.next()));
  }
}
