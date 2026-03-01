export interface Product {
  id?: string;
  _id?: string;
  name: string;
  price: number;
  stock: number;
  location?: string;
  description?: string;
  image?: string;
  category?: string;
  rating?: number;
  reviews?: Review[];
  shop?: string | Shop;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Shop {
  id?: string;
  _id?: string;
  name: string;
  email: string;
}

export interface Review {
  id?: string;
  _id?: string;
  user: string | User;
  comment: string;
  rating: number;
  date?: Date;
}

export interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
}

export interface CreateProductRequest {
  name: string;
  price: number;
  stock: number;
  location?: string;
  description?: string;
  image?: string;
  category?: string;
}

export interface UpdateProductRequest {
  name?: string;
  price?: number;
  stock?: number;
  location?: string;
  description?: string;
  image?: string;
  category?: string;
  isActive?: boolean;
}
