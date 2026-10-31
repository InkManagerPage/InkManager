import Link from 'next/link';
import styles from './landing.module.css';

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
                    {plan.name === 'Individual'
                      ? 'ARS 12.000 por mes o ARS 120.000 por año.'
                      : 'ARS 35.000 por mes o ARS 350.000 por año.'}
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
                  <Link
                    href={`/suscripcion?plan=${plan.name === 'Individual' ? 'INDIVIDUAL' : 'ESTUDIO'}`}
                    className={`btn btn-outline-dark ${styles.planButton}`}
                    aria-label={`Elegir el plan ${plan.name}`}
                  >
                    Elegir plan <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
