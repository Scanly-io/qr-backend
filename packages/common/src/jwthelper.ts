import jwt, { Jwt, SignOptions } from "jsonwebtoken"; 

export const JWT_SECRET = process.env.JWT_SECRET;  
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";

export interface JwtPayload {
    sub: string;
    email: string;
}

export interface JwtToken extends Jwt {
  payload: JwtPayload;
}   

export function generateJwtToken(payload: JwtPayload): string {
    if (!JWT_SECRET) throw new Error("JWT_SECRET not set");
    const opts: SignOptions = { expiresIn: JWT_EXPIRES_IN } as SignOptions;
    return jwt.sign(payload as any, JWT_SECRET, opts);
}

export function verifyJwtToken(token: string): JwtPayload {
    if (!JWT_SECRET) throw new Error("JWT_SECRET not set");
    try {
        return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
        throw new Error("Invalid or expired token");
    }
}
