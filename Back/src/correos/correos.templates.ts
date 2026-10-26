import type { Correo } from "./correos.entity.js";

function escapar(texto: string): string {
  return texto.replace(
    /[&<>"']/g,
    (letra) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        letra
      ]!,
  );
}

export function correoCuenta(datos: {
  para: string;
  nombre: string | null;
  asunto: string;
  mensaje: string;
  clave: string;
  accion?: { texto: string; url: string };
}): Correo {
  const saludo = datos.nombre ? `Hola, ${datos.nombre}.` : "Hola.";
  const accion = datos.accion;
  return {
    para: datos.para,
    asunto: datos.asunto,
    clave: datos.clave,
    texto: `${saludo}\n\n${datos.mensaje}${accion ? `\n\n${accion.texto}: ${accion.url}` : ""}\n\nSi no reconocés esta actividad, contactá al equipo de InkManager. Nunca te pediremos tu contraseña por correo.`,
    html: `<!doctype html><html lang="es"><body style="margin:0;background:#f6f6f2;color:#202320;font-family:Arial,sans-serif"><table role="presentation" style="width:100%;max-width:560px;margin:32px auto;background:white;border:1px solid #e0e2db;border-radius:12px"><tr><td style="padding:36px"><p style="font-size:22px;font-weight:bold;margin-top:0">InkManager</p><h1 style="font-size:24px">${escapar(datos.asunto)}</h1><p>${escapar(saludo)}</p><p style="line-height:1.7">${escapar(datos.mensaje)}</p>${accion ? `<p style="margin:28px 0"><a href="${escapar(accion.url)}" style="display:inline-block;padding:14px 22px;background:#202320;color:#fff;border-radius:5px;text-decoration:none">${escapar(accion.texto)}</a></p><p style="font-size:12px;word-break:break-all">También podés abrir este enlace: ${escapar(accion.url)}</p>` : ""}<hr style="border:0;border-top:1px solid #e0e2db"><p style="font-size:12px;color:#62665f;line-height:1.6">Si no reconocés esta actividad, contactá al equipo de InkManager. Nunca te pediremos tu contraseña por correo.</p></td></tr></table></body></html>`,
  };
}
