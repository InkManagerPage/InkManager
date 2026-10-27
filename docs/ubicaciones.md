# Ubicaciones

La aplicación utiliza `@tansuasici/country-state-city`, versión fija `3.0.3`, en el backend. Sus datos se consultan localmente; el navegador recibe únicamente las opciones del país o provincia elegidos. No se requieren una API key, una consulta de IP ni permisos de geolocalización.

## Endpoints

| Ruta                                                   | Respuesta                                              |
| ------------------------------------------------------ | ------------------------------------------------------ |
| `GET /api/ubicaciones/paises`                          | Países con `codigo` y `nombre`, ordenados en español.  |
| `GET /api/ubicaciones/provincias?pais=AR`              | Provincias o estados con `id` y `nombre`.              |
| `GET /api/ubicaciones/ciudades?pais=AR&provincia=3641` | Ciudades de la provincia elegida, con `id` y `nombre`. |

Las rutas rechazan países desconocidos y provincias que no pertenecen al país indicado. Los selectores se cargan en cascada: cambiar el país borra provincia y ciudad; cambiar la provincia borra la ciudad.

## Persistencia y validación

`Usuario.ciudadId` contiene el identificador de ciudad del catálogo instalado. Al guardar un perfil o el registro ampliado de un artista, el backend busca ese registro y obtiene los valores canónicos de `ciudad` y `pais`. No utiliza los nombres enviados por el navegador. Un ID inexistente o una ciudad escrita sin ID devuelve HTTP 400. Una ubicación vacía puede mantenerse en un perfil incompleto.

Los perfiles necesitan una ciudad del catálogo para considerarse completos. Las ubicaciones anteriores se conservan en la base y se muestran como referencia al editar, hasta que el usuario elige una opción válida. El catálogo público presenta ciudad, provincia y país para distinguir localidades con el mismo nombre.

El país elegido se recuerda en `localStorage`, bajo `inkmanager-pais`. Esta preferencia no contiene la ubicación física del usuario ni datos de sesión. Sin preferencia o ubicación guardada se utiliza Argentina. Si el navegador bloquea el almacenamiento, el selector sigue funcionando.

## Organización y fuentes

`Back/src/ubicaciones/` separa rutas, controlador, servicio, repositorio y tipos. El repositorio consulta la biblioteca; el servicio valida y limita la respuesta a las opciones públicas. `Front/src/components/forms/LocationFields.tsx` presenta los selectores y `services/ubicaciones.service.ts` realiza las consultas.

El código de [CountryStateCity](https://github.com/tansuasici/CountryStateCity) utiliza licencia MIT. El catálogo deriva de [Countries States Cities Database](https://github.com/dr5hn/countries-states-cities-database), disponible bajo [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). El selector enlaza a la fuente de los datos. La disponibilidad de localidades depende de la versión del catálogo instalada.
