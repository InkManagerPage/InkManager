import CheckoutButton from './CheckoutButton';
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
    price: 20
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
    price: 50
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
                  <ul>
                    {plan.features.map((feature) => (
                      <li key={feature}>
                        <span aria-hidden="true">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {/* El botón queda preparado para agregar su acción más adelante. */}
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
