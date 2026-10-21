import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Compartimos un cliente entre las rutas del backend.
export const prisma = new PrismaClient();
