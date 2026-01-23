import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.utils";

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
}

/**
 * Middleware to verify JWT token
 */
export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        message: "No token provided",
        code: "NO_TOKEN",
      });
    }

    // Expected format: "Bearer <token>"
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        message: "Invalid token format",
        code: "INVALID_FORMAT",
      });
    }

    const token = parts[1];

    // Verify token
    const payload = verifyAccessToken(token);
    if (!payload) {
      return res.status(401).json({
        message: "Invalid or expired token",
        code: "INVALID_TOKEN",
      });
    }

    // Attach user data to request
    req.userId = payload.userId;
    req.email = payload.email;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({
      message: "Unauthorized",
      code: "UNAUTHORIZED",
    });
  }
};

/**
 * Optional middleware - doesn't block request if token is invalid
 */
export const optionalAuthMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const parts = authHeader.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        const token = parts[1];
        const payload = verifyAccessToken(token);
        if (payload) {
          req.userId = payload.userId;
          req.email = payload.email;
        }
      }
    }
    next();
  } catch (error) {
    console.error("Optional auth middleware error:", error);
    next();
  }
};
