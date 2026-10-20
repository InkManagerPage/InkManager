# Backend de InkManager

API con Express, TypeScript y Prisma. Los datos están en PostgreSQL de Supabase y las fotos en Cloudinary.

## Ejecutar

Desde `Back/`, con las credenciales configuradas en `.env`:

```sh
npm ci
npm run db:generate
npm run dev
```

El servidor usa el puerto 4000, salvo que `.env` indique otro en `PORT`.

Para producción: `npm run build` y después `npm start`.

## Reseñas de artistas

`GET /api/resenas` devuelve hasta 20 artistas, ordenados por nombre, que tengan foto y reseña. Cada elemento contiene únicamente:

```json
{
  "id": "id-del-artista",
  "nombre": "Nombre del artista",
  "fotoUrl": "https://res.cloudinary.com/...",
  "resena": "Texto de la reseña"
}
```

Responde con un arreglo vacío si todavía no hay reseñas y con HTTP 503 si la base no está disponible. No devuelve emails, teléfonos ni claves. No permite crear o editar usuarios desde una ruta pública.

La ruta está en `src/routes/resenas.routes.ts` y usa el cliente compartido de `src/config/prisma.ts`. En `Usuario`, se reutiliza `fotoPerfil` para la foto y se agregan `resena` y `fotoPublicId`. El endpoint llama `fotoUrl` a la URL pública. No se leen ni se exponen contraseñas o documentos de identidad.

## Cargar los ejemplos

El proyecto todavía no tiene un historial de Prisma Migrate. El cambio SQL de esta tarea agrega las columnas de foto y reseña solo si faltan, conserva los datos y mantiene las reglas RLS existentes. El esquema Prisma local refleja la estructura actual de Supabase, incluidos los campos de perfil que ya existían. Para preparar otra base que ya tenga ese esquema:

```sh
npm run db:reviews
npm run db:security
npm run db:generate
npm run seed:reviews
```

`prisma/review-artists.ts` contiene seis perfiles ficticios: los dos artistas del seed inicial y cuatro nuevos. `prisma/seed-reviews.ts` sube los retratos de `assets/portraits/` y guarda las URLs y reseñas. Usa el email para identificar perfiles y un ID fijo para cada imagen, así se puede repetir sin duplicados. No borra tablas ni usuarios.

Como el modelo actual exige `password`, los perfiles nuevos reciben un hash bcrypt de un valor aleatorio que no se guarda ni se muestra. No se generan contraseñas compartidas para iniciar sesión y no se cambia la contraseña de los artistas existentes.

`db:security` activa RLS en las cinco tablas de la aplicación y conserva sus políticas. El backend accede con su conexión privada; el navegador solo consulta el endpoint público, que selecciona los datos de la tarjeta. Si se agregan accesos directos desde un cliente de Supabase, necesitarán políticas propias de lectura o escritura.

Los retratos fueron creados con la herramienta integrada `image_gen`. Los prompts completos de cada imagen están en `assets/portraits/prompts.json`.

Este script es independiente de `prisma/seed.ts`, que reemplaza los datos de las tablas. Para agregar las reseñas usá `seed:reviews`.
