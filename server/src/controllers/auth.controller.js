import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { env } from "../config/env.js";
import { Teacher } from "../models/Teacher.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const registerSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
    role: z.literal("teacher").optional().default("teacher"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(teacher) {
  return jwt.sign(
    {
      sub: teacher._id.toString(),
      role: teacher.role,
      email: teacher.email,
      name: teacher.name,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

export const register = asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { message: "Validation error", details: parsed.error.flatten() } });
  }

  const { name, email, password, role } = parsed.data;

  const existing = await Teacher.findOne({ email }).lean();
  if (existing) {
    return res.status(409).json({ error: { message: "Email already registered" } });
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  const teacher = await Teacher.create({
    name,
    email,
    passwordHash,
    role,
  });

  const token = signToken(teacher);

  return res.status(201).json({
    token,
    teacher: {
      id: teacher._id,
      name: teacher.name,
      email: teacher.email,
      role: teacher.role,
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { message: "Validation error", details: parsed.error.flatten() } });
  }

  const { email, password } = parsed.data;

  const teacher = await Teacher.findOne({ email });
  if (!teacher) {
    return res.status(401).json({ error: { message: "Invalid credentials" } });
  }

  const ok = await bcrypt.compare(password, teacher.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: { message: "Invalid credentials" } });
  }

  const token = signToken(teacher);

  return res.json({
    token,
    teacher: {
      id: teacher._id,
      name: teacher.name,
      email: teacher.email,
      role: teacher.role,
    },
  });
});

export const me = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.user.sub).lean();
  if (!teacher) {
    return res.status(404).json({ error: { message: "Not found" } });
  }

  return res.json({
    teacher: {
      id: teacher._id,
      name: teacher.name,
      email: teacher.email,
      role: teacher.role,
      createdAt: teacher.createdAt,
    },
  });
});
