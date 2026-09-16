import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email();

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(8),
  name: z.string().trim().min(1),
});

export type SignupInput = z.infer<typeof signupSchema>;
