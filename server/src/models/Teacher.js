import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ["teacher"], default: "teacher" },
  },
  {
    timestamps: true,
  }
);

teacherSchema.index({ email: 1 }, { unique: true });

export const Teacher = mongoose.model("Teacher", teacherSchema);
