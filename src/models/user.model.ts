import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  refreshToken?: string | null;
  refreshTokenExpiresAt?: Date | null;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      default: null,
    },

    refreshTokenExpiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model<IUser>("User", UserSchema);
