import { rateLimit } from "express-rate-limit";

export const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Demasiados intentos. Volvé a intentar más tarde.",
  },
});
