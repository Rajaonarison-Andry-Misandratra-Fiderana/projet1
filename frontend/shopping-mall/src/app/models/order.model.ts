export interface Order {
  id?: string;
  _id?: string;
  orderNumber: string;
  buyer: string | Buyer;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: ShippingAddress;
  deliveryContact?: DeliveryContact;
  paymentMethod: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer';
  paymentStatus: 'pending' | 'completed' | 'failed';
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderItem {
  product: string | OrderProduct;
  quantity: number;
  price: number;
  shop?: string | OrderShop;
}

export interface OrderProduct {
  id?: string;
  _id?: string;
  name: string;
  price: number;
  image?: string;
}

export interface OrderShop {
  id?: string;
  _id?: string;
  name: string;
  email: string;
}

export interface Buyer {
  id?: string;
  _id?: string;
  name: string;
  email: string;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface DeliveryContact {
  fullName: string;
  email: string;
  phone: string;
}

export interface CreateOrderRequest {
  clientRequestId?: string;
  items: {
    product: string;
    quantity: number;
    price?: number;
    shop?: string;
  }[];
  shippingAddress: ShippingAddress;
  deliveryContact?: DeliveryContact;
  paymentMethod: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer';
}

export interface UpdateOrderStatusRequest {
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
}

export interface UpdatePaymentStatusRequest {
  paymentStatus: 'pending' | 'completed' | 'failed';
}
