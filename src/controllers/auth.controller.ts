import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/user.model";

import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.utils";
import { AuthRequest } from "../middleware/auth.middleware";

import { hashToken } from "../utils/tokenHash";

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // 1. Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // 5. Respond (never return password)
    return res.status(201).json({
      name: user.name,
      message: "User registered successfully",
      userId: user._id,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // 2. Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 4. Generate tokens
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
    });

    // ✅ STORE refresh token in DB (HASHED)
    user.refreshToken = hashToken(refreshToken);
    user.refreshTokenExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    );
    await user.save();

    // ✅ SEND refresh token via HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/auth/refresh",
    });

    // 5. Return success response with tokens
    return res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        userId: user._id,
        name: user.name,
        email: user.email,
      },
      redirectUrl: "/dashboard",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    // 1. Validate input
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    // 2. Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({
        message: "Invalid or expired refresh token",
        code: "INVALID_REFRESH_TOKEN",
      });
    }

    // 3. Find user (optional but recommended)
    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // 4. Generate new access token
    const newAccessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
    });

    // 5. Return new access token
    return res.status(200).json({
      message: "Access token refreshed successfully",
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Logout endpoint (client should discard tokens)
 */
export const logout = async (req: AuthRequest, res: Response) => {
  try {
    // In a basic implementation, logout is handled by client discarding tokens
    // In advanced implementation, you could maintain a token blacklist in Redis
    return res.status(200).json({
      message: "Logged out successfully",
      code: "LOGOUT_SUCCESS",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
