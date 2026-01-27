import jwt from "jsonwebtoken";

interface TokenPayload {
  userId: string;
  email: string;
}

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "30d";

/**
 * Generate Access Token (short-lived)
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY as jwt.SignOptions['expiresIn'],
    algorithm: "HS256",
  });
};

/**
 * Generate Refresh Token (long-lived)
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY as jwt.SignOptions['expiresIn'],
    algorithm: "HS256",
  });
};





/**
 * Verify Access Token
 */
export const verifyAccessToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error("Refresh token verification failed:", error);
    return null;
  }
};

/**
 * Decode Token without verification (use with caution)
 */
export const decodeToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.decode(token) as TokenPayload | null;
    return decoded;
  } catch (error) {
    console.error("Token decode failed:", error);
    return null;
  }
};
