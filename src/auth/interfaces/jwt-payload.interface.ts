export interface JwtPayload {
  sub: number;
  name: string;
  iat?: number; // issued at
  exp?: number; // expiration time
}
