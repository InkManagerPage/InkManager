import "dotenv/config";
import { app } from "./app.js";
import { configuracionCorreo } from "./config/correos.js";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log("Servidor ejecutándose en http://localhost:" + PORT);
  try {
    console.log("Transporte de correo: " + configuracionCorreo().transporte);
  } catch {
    console.error(
      "Correo sin configurar: revisá MAIL_TRANSPORT, RESEND_API_KEY y MAIL_FROM en Back/.env.",
    );
  }
});
