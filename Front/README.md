# InkManager · Frontend

Frontend con Next.js, React, TypeScript y Bootstrap. La Home está en `/`, la landing para tatuadores en `/estudios` y el catálogo de clientes en `/clientes`.

## Empezar

Desde la carpeta `Front/`:

```sh
npm ci
```

Copiá `.env.example` como `.env.local` si todavía no tenés ese archivo. `NEXT_PUBLIC_API_URL` indica la dirección pública del backend; para el entorno local es `http://127.0.0.1:4000/api`. Iniciá también el backend desde `Back/` para usar el acceso y ver las reseñas.

```sh
npm run dev
```

Abrí [http://127.0.0.1:3001](http://127.0.0.1:3001).

## Dónde hacer cambios

| Quiero cambiar…               | Archivo o carpeta                                  |
| ----------------------------- | -------------------------------------------------- |
| El orden de las secciones     | `src/app/estudios/page.tsx`                        |
| El texto principal y su foto  | `src/app/estudios/_components/Hero.tsx`            |
| El menú                       | `src/app/estudios/_components/LandingHeader.tsx`   |
| Las palabras de la franja     | `src/app/estudios/_components/Marquee.tsx`         |
| La explicación del producto   | `src/app/estudios/_components/PlatformSection.tsx` |
| Las herramientas              | `src/app/estudios/_components/ToolsSection.tsx`    |
| Las reseñas de ejemplo        | `src/app/estudios/_components/ReviewsSection.tsx`  |
| Los planes y sus prestaciones | `src/app/estudios/_components/PlansSection.tsx`    |
| El pie de página              | `src/app/estudios/_components/LandingFooter.tsx`   |
| Colores, tamaños y espacios   | `src/app/estudios/_components/landing.module.css`  |
| Las fotografías               | `public/images/`                                   |

[La guía de carpetas y código](docs/architecture.md) explica cómo se relacionan estos archivos y qué guardar en cada carpeta.

## Comandos

| Comando          | Para qué sirve                               |
| ---------------- | -------------------------------------------- |
| `npm run dev`    | Ver los cambios mientras trabajás            |
| `npm run format` | Ordenar el formato del código                |
| `npm run check`  | Revisar código, formato, tipos y compilación |
| `npm run build`  | Preparar la versión de producción            |
| `npm start`      | Ejecutar la versión preparada con `build`    |

## Qué está implementado

La landing tiene menú para celular, portada a pantalla completa, franja de palabras, acordeón de herramientas, reseñas de ejemplo y tarjetas de planes. Los botones «Conocer más» quedan sin acción por ahora.

Bootstrap y React Bootstrap aportan la grilla, el menú, el acordeón, los botones y las tarjetas. React Fast Marquee mueve las palabras hacia la derecha y las pausa al pasar el cursor. Si la persona tiene activada la opción de reducir movimiento, las palabras se muestran quietas.

Las reseñas se obtienen de `GET /api/resenas` del backend. Cada tarjeta muestra la foto de Cloudinary, el nombre y el texto guardado en Supabase. Se pausan al pasar el cursor y quedan quietas con movimiento reducido. La sección muestra un mensaje mientras carga, si no hay reseñas o si falla la conexión. Los perfiles actuales son ficticios y se aclara en la sección.

El registro y el login se abren en modales desde la cabecera. En `/clientes` se crea una cuenta de cliente sin elegir rol; en `/estudios` se elige entre artista y estudio. La Home pregunta primero qué tipo de cuenta se necesita. El backend administra las sesiones mediante una cookie HttpOnly. El catálogo de `/clientes` todavía usa datos de ejemplo y el dashboard está reservado para más adelante.

El login y el registro incluyen botones de Google. El backend valida la identidad y crea nuestra sesión; el registro conserva el perfil elegido en la landing. Si se cancela o falla el acceso, se vuelve a la Home con un aviso. [El detalle del registro por landing](../docs/registro-por-landing.md) explica el recorrido y la configuración local.

Las fotografías de la portada y la fuente IBM Plex Sans se guardan localmente. Los retratos de las reseñas se sirven desde Cloudinary. La licencia de la fuente está en `public/fonts/`.
