export interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'boutique' | 'acheteur';
  boutiqueStatus?: 'pending' | 'approved' | 'rejected';
  assignedBox?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  role?: 'acheteur';
}

export interface AdminCreateSellerRequest {
  name: string;
  email: string;
  password: string;
  boxNumber: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
