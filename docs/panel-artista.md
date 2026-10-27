# Panel del artista

El panel está disponible en `/artista/trabajos` y `/artista/perfil`. El login con contraseña y el callback de Google redirigen allí a los usuarios con rol `ARTISTA`. Una sesión existente puede entrar mediante «Mi panel» en la cabecera. La API valida sesión y rol en todas las rutas privadas.

## Mi perfil

El artista puede guardar foto, nombre artístico, biografía, ciudad y estilos principales. Se permite guardar un perfil incompleto. El nombre artístico admite entre 2 y 50 caracteres y la biografía hasta 300. La ubicación se elige por país, provincia o estado y ciudad; el backend valida el identificador de ciudad y obtiene sus nombres del catálogo. El formulario ocupa el área principal del panel. Un punto rojo junto a «Mi perfil» indica datos pendientes; al enfocarlo o pasar el cursor muestra los campos faltantes. El mismo formulario muestra una línea breve con esos campos.

`GET /api/artistas/perfil` devuelve los campos editables, `ciudadId`, `pais`, `provinciaId` y `perfilCompleto`, `totalPublicados` y `visibleEnCatalogo`. `PUT /api/artistas/perfil` recibe `nombreArtistico`, `biografia`, `ciudadId`, `estilosPrincipales` y el archivo opcional `imagen`. El backend obtiene la ciudad y el país a partir de `ciudadId`. El archivo reemplaza la foto anterior; omitirlo conserva la foto. El perfil no permite cambiar email, rol ni pertenencia a un estudio.

Las ciudades anteriores escritas libremente se conservan como referencia, pero se deben confirmar mediante el selector para completar el perfil. La migración `prisma/changes/20261027_ciudad_validada.sql` agrega `Usuario.ciudadId` sin reemplazar los textos existentes. El comportamiento del catálogo geográfico se describe en [Ubicaciones](ubicaciones.md).

## Mis trabajos

Cada trabajo pertenece a un usuario y contiene una sola foto, descripción, varios estilos y estado `BORRADOR` o `PUBLICADO`. Se almacena en `FotoGaleria`, junto con fechas de creación y actualización. La descripción admite hasta 1200 caracteres.

El artista puede crear y editar trabajos, filtrar su portafolio por estado, publicar, volver a borrador y eliminar con confirmación. Los borradores pueden estar incompletos. Publicar requiere foto, descripción y al menos un estilo. Publicar un trabajo no lo hace visible si el perfil sigue incompleto.

`POST /api/trabajos` y `PATCH /api/trabajos/:id` aceptan `descripcion`, `estilos`, `estado` y un archivo opcional `imagen`. En `PATCH`, los campos omitidos se conservan. Para cambiar solo el estado también se puede enviar JSON:

```json
{ "estado": "PUBLICADO" }
```

Las cargas utilizan `multipart/form-data`; los arreglos de estilos se envían como JSON dentro del campo correspondiente. El selector acepta originales JPG, PNG o WebP de hasta 10 MB para prepararlos en el navegador: limita el lado mayor a 1600 px, mantiene la proporción, elimina los metadatos al volver a codificar y ajusta la calidad JPEG buscando un archivo de hasta 1 MB. El máximo enviado es 2 MB; los botones de guardar permanecen desactivados durante el procesamiento. Si el resultado supera ese límite se rechaza. El backend también limita los archivos a 2 MB y comprueba su firma. Cloudinary aplica una transformación al ingresar, con dimensiones máximas de 1600×1600, calidad automática y formato WebP, antes de almacenar el archivo. Las imágenes existentes conservan sus archivos hasta que se reemplazan.

Reemplazar o eliminar una foto elimina su referencia anterior en Cloudinary. Si falla el guardado en la base después de una carga, el servicio intenta eliminar la imagen nueva.

## Lista común de estilos

`GET /api/estilos` devuelve el catálogo definido en `Back/src/estilos/estilos.entity.ts`. Perfil, trabajos y filtros de clientes utilizan esa misma lista. El backend rechaza estilos desconocidos y elimina duplicados de la selección. Los nombres no se escriben libremente desde el panel.

## Catálogo público

Un artista aparece cuando tiene foto, nombre artístico, biografía, ciudad, estilos principales y al menos un trabajo publicado completo. Los borradores y perfiles incompletos quedan fuera de `GET /api/catalogo`. Esta respuesta incluye `artistas`, `trabajos`, `estilos` y `ciudades`, sin email, contraseña, teléfono ni documentos personales.

La consulta devuelve hasta 100 artistas ordenados por nombre y hasta 24 trabajos publicados por artista, ordenados por fecha descendente. El frontend consulta sin caché y aplica los filtros existentes de estilo, ciudad y tipo. Un trabajo puede encontrarse por cualquiera de sus estilos.

En `/clientes` se muestra una única galería de trabajos publicados, con filtros por estilo, tipo de artista y ciudad. Cada foto abre un modal con la imagen completa, descripción, estilos, nombre, foto, biografía y ciudad del artista. No se muestran secciones separadas de artistas y estudios ni perfiles de ejemplo. El panel no controla suscripciones o cobros.

## Organización del código

- `Back/src/artistas/`: perfil propio, validaciones y persistencia.
- `Back/src/trabajos/`: portafolio, propiedad y estados de publicación.
- `Back/src/estilos/`: lista común y validación de selecciones.
- `Back/src/catalogo/`: selección y presentación de datos públicos.
- `Front/src/app/artista/`: rutas, navegación, formularios y galería.
- `Front/src/services/artistas.service.ts`: peticiones privadas del panel.
- `Front/src/services/catalogo.service.ts`: consulta pública del catálogo.
- `Front/src/types/artista.ts`: contratos del perfil, trabajos y catálogo.

El esquema está en `Back/prisma/schema.prisma`. El script SQL aditivo correspondiente es `Back/prisma/changes/20261026_panel_artista.sql`. Los trabajos existentes conservan sus fotos y pasan a borrador por defecto.
