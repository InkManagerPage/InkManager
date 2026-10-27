export const estudiosDemo = [
  { slug: "demo-catalogo-tinta-sur", nombre: "Tinta Sur", ciudadId: 704 },
  { slug: "demo-catalogo-linea-norte", nombre: "Línea Norte", ciudadId: 815 },
];

export const artistasDemo = [
  {
    nombre: "Valentina Ríos",
    ciudadId: 704,
    estilos: ["Fine Line", "Botánico"],
    retrato: "sofia-martinez",
    estudio: 0,
  },
  {
    nombre: "Tomás Vidal",
    ciudadId: 704,
    estilos: ["Blackwork", "Geométrico"],
    retrato: "lucas-realismo",
    estudio: null,
  },
  {
    nombre: "Emilia Castro",
    ciudadId: 815,
    estilos: ["Realismo", "Microrealismo"],
    retrato: "lucia-fernandez",
    estudio: 1,
  },
  {
    nombre: "Bruno Acosta",
    ciudadId: 1384,
    estilos: ["Tradicional", "Full Color"],
    retrato: "martin-suarez",
    estudio: null,
  },
  {
    nombre: "Lara Méndez",
    ciudadId: 1278,
    estilos: ["Ornamental", "Puntillismo"],
    retrato: "camila-vega",
    estudio: null,
  },
  {
    nombre: "Diego Silva",
    ciudadId: 129833,
    estilos: ["Japonés", "Neotradicional"],
    retrato: "nicolas-torres",
    estudio: null,
  },
  {
    nombre: "Clara Torres",
    ciudadId: 142544,
    estilos: ["Acuarela", "Ilustrativo"],
    retrato: "lucia-fernandez",
    estudio: null,
  },
  {
    nombre: "Mateo Ferrer",
    ciudadId: 35186,
    estilos: ["Minimalista", "Lettering"],
    retrato: "martin-suarez",
    estudio: null,
  },
];

export const emailDemo = (indice: number) =>
  `catalogo-demo-${indice + 1}@example.test`;
export const idTrabajoDemo = (indice: number) =>
  `b6e77d20-58f2-4ec9-9fd7-${String(indice + 1).padStart(12, "0")}`;
