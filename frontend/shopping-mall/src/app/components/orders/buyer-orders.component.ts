import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-buyer-orders',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="container"><h1>Mes commandes</h1></div>`,
  styles: ['.container { padding: 2rem; }'],
})
export class BuyerOrdersComponent {}
