import { Jwt } from "jsonwebtoken"; 

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
    const token = require("jsonwebtoken").sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return token;
}

export function verifyJwtToken(token: string): JwtPayload {
    try {
        const decoded = require("jsonwebtoken").verify(token, JWT_SECRET) as JwtPayload;
        return decoded;
    } catch (err) {
        throw new Error("Invalid or expired token");
    }
}

