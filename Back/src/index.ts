import "dotenv/config";
import { app } from "./app.js";
import { configuracionCorreo } from "./config/correos.js";
import { iniciarAvisosVencimiento } from "./pagos/pagos.service.js";
import { iniciarRecordatorios } from "./recordatorios/recordatorios.worker.js";
import { iniciarBotInstagram } from "./instagram/instagram-bot.service.js";
import { enviarEnHiloInstagram } from "./instagram/instagram.service.js";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  iniciarBotInstagram(enviarEnHiloInstagram);
  if (process.env.RECORDATORIOS_AUTOMATICOS === "1") {
    iniciarAvisosVencimiento();
    iniciarRecordatorios();
  }
  console.log("Servidor ejecutándose en http://localhost:" + PORT);
  try {
    console.log("Transporte de correo: " + configuracionCorreo().transporte);
  } catch {
    console.error(
      "Correo sin configurar: revisá MAIL_TRANSPORT y las variables del proveedor en el backend.",
    );
  }
});
