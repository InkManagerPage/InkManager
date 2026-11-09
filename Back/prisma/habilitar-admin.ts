import "dotenv/config";
import { prisma } from "../src/config/prisma.js";

async function habilitar(email: string) {
  await prisma.$transaction(async (tx) => {
    const cuenta = await tx.usuario.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!cuenta)
      throw new Error("Registrá primero la cuenta dedicada de administración.");
    const ahora = new Date();
    const cambio = await tx.usuario.updateMany({
      where: {
        id: cuenta.id,
        rol: "CLIENTE",
        emailVerificado: true,
        suspendidoAt: null,
      },
      data: { rol: "SUPERADMIN" },
    });
    if (!cambio.count)
      throw new Error(
        "La cuenta debe ser un cliente activo con correo verificado.",
      );
    await tx.sesion.updateMany({
      where: { usuarioId: cuenta.id, revocadaAt: null },
      data: { revocadaAt: ahora },
    });
    await tx.accionAdministrativa.create({
      data: {
        autorId: cuenta.id,
        cuentaId: cuenta.id,
        accion: "HABILITAR_ADMIN",
        motivo: "Alta administrativa desde consola.",
      },
    });
  });
  console.log(
    "Cuenta habilitada. Volvé a iniciar sesión para entrar en /admin.",
  );
}

const email = process.argv[2]?.trim().toLowerCase() ?? "";
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || process.argv.length !== 3) {
  console.error("Uso: npm run admin:habilitar -- correo");
  process.exitCode = 1;
} else {
  try {
    await habilitar(email);
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : "No se pudo habilitar la cuenta.",
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
