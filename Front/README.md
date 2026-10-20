# InkManager · Frontend

Frontend con Next.js, React, TypeScript y Bootstrap. La landing para tatuadores está en `/estudios`; la dirección `/` lleva a esa página.

## Empezar

Desde la carpeta `Front/`:

```sh
npm ci
```

Copiá `.env.example` como `.env.local` si todavía no tenés ese archivo. Por ahora solo guarda la dirección pública del backend; la landing no hace llamadas a la API.

```sh
npm run dev
```

Abrí [http://localhost:3001](http://localhost:3001).

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

Las reseñas también usan tarjetas de Bootstrap y React Fast Marquee. Se pausan al pasar el cursor. Con movimiento reducido se muestran quietas. Los nombres y las experiencias son ficticios y se aclara en la sección.

`/clientes` está vacío. Las carpetas de login, registro y dashboard están reservadas para más adelante. Todavía no hay autenticación ni conexión de las páginas con el backend.

Las fotos y la fuente IBM Plex Sans se guardan localmente. La licencia de la fuente está en `public/fonts/`.
