export interface User {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  permmissions: string[] | null;
}

export interface JwtPayload extends User {
    iat?: number; // Issued at
    exp?: number; // Expiration time
  }