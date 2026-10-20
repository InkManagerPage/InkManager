'use client';

import Image from 'next/image';
import Accordion from 'react-bootstrap/Accordion';
import styles from './landing.module.css';

// El  muestra un elemento por cada herramienta de esta lista.
const tools = [
  {
    title: 'Consultas con contexto',
    text: 'La idea, la zona del cuerpo y las referencias acompañan cada consulta. Tené a mano lo que necesitás antes de preparar una propuesta.',
  },
  {
    title: 'Presupuestos claros',
    text: 'Reuní el alcance del trabajo, su duración y las condiciones de la seña. Una propuesta que tu cliente pueda revisar sin perderse entre mensajes.',
  },
  {
    title: 'Agenda y señas',
    text: 'Relacioná cada turno con su presupuesto y el estado de su seña. Diferenciá lo que está pendiente de lo que ya está confirmado.',
  },
  {
    title: 'Después de la sesión',
    text: 'El trabajo sigue cuando el cliente se va. Mantené las indicaciones de cuidado y el seguimiento junto al historial de su tatuaje.',
  },
];

export function ToolsSection() {
  return (
    <section
      id="herramientas"
      className={`border-top ${styles.section}`}
      aria-labelledby="tools-title"
    >
      <div className={`container-fluid ${styles.container}`}>
        <div className="row gy-5 gx-lg-5">
          <div className="col-lg-6">
            <h2 id="tools-title">Herramientas que ofrecemos</h2>
            <Accordion defaultActiveKey="0" flush className={styles.accordion}>
              {tools.map((tool, index) => (
                <Accordion.Item eventKey={String(index)} key={tool.title}>
                  <Accordion.Header as="h3">{tool.title}</Accordion.Header>
                  <Accordion.Body>{tool.text}</Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          </div>
          <div className="col-lg-6">
            <div className={styles.toolsImage}>
              <Image
                src="/images/artist-hands.jpg"
                alt="Las manos de un tatuador trabajando con precisión en un diseño"
                fill
                sizes="(max-width: 991px) 90vw, 40vw"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
