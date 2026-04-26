import { z } from "zod";
import { Email, Password, NonEmptyString, ShortText } from "./common.js";

export const RegisterBody = z.object({
  email: Email,
  password: Password,
  displayName: ShortText.optional(),
}).strict();

export const LoginBody = z.object({
  email: Email,
  password: z.string().min(1).max(200),
}).strict();

export const ForgotPasswordBody = z.object({
  email: Email,
}).strict();

export const ResetPasswordBody = z.object({
  token: NonEmptyString.max(512),
  password: Password,
}).strict();

export const VerifyEmailBody = z.object({
  token: NonEmptyString.max(512),
}).strict();
