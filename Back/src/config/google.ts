import "dotenv/config";
import { OAuth2Client } from "google-auth-library";
import { HttpError } from "../errors/http-error.js";

export function obtenerClienteGoogle(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new HttpError(503, "El acceso con Google no está configurado.");
  }

  return new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri,
  });
}
