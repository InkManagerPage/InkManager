import CheckoutButton from './CheckoutButton';
import styles from './landing.module.css';
import ConoceMasButton from './ConocerMasButton';

// Para cambiar los planes, editá los datos de esta lista.
const plans = [
  {
    name: 'Individual',
    description: 'Maneja tu negocio de manera independiente y profesional.',
    features: [
      'Formulario y asistente IA',
      'Mensajes y presupuestos',
      'Agenda, señas y seguimiento',
      'Portafolio y resultados propios',
    ],
    benefits: [
      {
        title: 'Consultas organizadas',
        description:
          'Recibí consultas desde un formulario y usá el asistente de IA para ordenar la información de cada proyecto.',
        keyBenefit: 'tenés los detalles de cada pedido a mano desde el primer contacto.',
      },
      {
        title: 'Mensajes y presupuestos',
        description:
          'Gestioná la conversación con tus clientes y prepará presupuestos para sus ideas.',
        keyBenefit: 'mantenés cada propuesta vinculada con su consulta.',
      },
      {
        title: 'Agenda y seguimiento',
        description: 'Organizá tus turnos, registrá señas y hacé seguimiento de cada trabajo.',
        keyBenefit: 'reunís las tareas importantes del proceso en un solo lugar.',
      },
      {
        title: 'Tu portafolio y tus resultados',
        description: 'Mostrá tus trabajos y consultá los resultados de tu actividad como artista.',
        keyBenefit: 'tu presencia profesional y el rendimiento de tu negocio están conectados.',
      },
    ],
    image: '/images/artist-hands.jpg',
    price: 20,
  },
  {
    name: 'Estudio',
    description: 'Maneja tu estudio con tu equipo y optimiza la gestión de tu negocio.',
    features: [
      'Todo lo incluido en Individual',
      'Incluye a todos los artistas del estudio',
      'Asignación de consultas y agenda compartida',
      'Resultados del negocio y por artista',
      'Sistema de cotización competitiva entre artistas',
    ],
    benefits: [
      {
        title: 'Todo lo del Plan Individual',
        description:
          'El estudio cuenta con las herramientas de consultas, presupuestos, agenda y seguimiento incluidas en el plan Individual.',
        keyBenefit: 'el equipo parte de una base completa para gestionar el negocio.',
      },
      {
        title: 'Gestión de artistas',
        description:
          'Incluí a los artistas del estudio y asigná consultas según las necesidades del equipo.',
        keyBenefit: 'las consultas pueden llegar a la persona indicada.',
      },
      {
        title: 'Agenda compartida',
        description: 'Coordiná los turnos del estudio en una agenda compartida para el equipo.',
        keyBenefit: 'todos pueden organizar el trabajo con una visión común.',
      },
      {
        title: 'Resultados por estudio y artista',
        description:
          'Consultá los resultados generales del negocio y el desempeño de cada artista.',
        keyBenefit: 'entendés tanto el panorama del estudio como el aporte individual.',
      },
      {
        title: 'Cotizaciones entre artistas',
        description: 'Usá el sistema de cotización competitiva entre los artistas del estudio.',
        keyBenefit: 'podés comparar propuestas del equipo para cada consulta.',
      },
    ],
    image: '/images/studio-session.jpg',
    price: 50,
  },
];

export function PlansSection() {
  return (
    <section id="planes" className={styles.section} aria-labelledby="plans-title">
      <div className={`container-fluid ${styles.container}`}>
        <header className="text-center">
          <h2 id="plans-title">Elegí cómo llevar tu negocio.</h2>
        </header>
        <div className={`row g-4 justify-content-center ${styles.plans}`}>
          {plans.map((plan) => (
            <div className="col-md-6" key={plan.name}>
              <article className={`card h-100 ${styles.plan}`}>
                <div className="card-body d-flex flex-column">
                  <h3>{plan.name}</h3>
                  <p>{plan.description}</p>
                  <p>
                    {plan.name === 'Individual' ? 'ARS 12.000 por mes.' : 'ARS 35.000 por mes.'}
                    <br />
                    El plan anual incluye 2 meses bonificados.
                  </p>
                  <ul>
                    {plan.features.map((feature) => (
                      <li key={feature}>
                        <span aria-hidden="true">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <ConoceMasButton plan={plan} />
                  <CheckoutButton plan={plan} />
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
