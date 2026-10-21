import "dotenv/config";

const secret = process.env.JWT_SECRET;

if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
  throw new Error(
    "Configurá JWT_SECRET con una clave aleatoria de al menos 32 bytes.",
  );
}

export const jwtSecret = secret;
export const duracionSesionSegundos = 60 * 60;

export const origenesPermitidos = process.env.FRONTEND_URL
  ? [new URL(process.env.FRONTEND_URL).origin]
  : ["http://localhost:3001", "http://127.0.0.1:3001"];
