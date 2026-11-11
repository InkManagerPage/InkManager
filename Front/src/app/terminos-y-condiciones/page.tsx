import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/auth/SiteHeader';
import { LandingFooter } from '@/app/estudios/_components/LandingFooter';
import styles from './Terms.module.css';

export const metadata: Metadata = {
  title: 'Términos y Condiciones | InkManager',
  description: 'Términos y condiciones de uso del servicio de InkManager.',
};

export default function TermsPage() {
  return (
    <div className={styles.layout}>
      <SiteHeader />
      <main className={styles.page}>
        <article className={styles.container}>
          <Link className={styles.backLink} href="/">
            <span aria-hidden="true">←</span> Volver al Home
          </Link>

          <header className={styles.intro}>
            <p className={styles.eyebrow}>InkManager</p>
            <h1>TÉRMINOS Y CONDICIONES DE USO</h1>
            <p className={styles.updated}>Última actualización: 11 de noviembre de 2026</p>
          </header>

          <div className={styles.content}>
            <p>
              Los presentes Términos y Condiciones (en adelante, los &quot;Términos&quot;) regulan
              el acceso y uso de la plataforma web de gestión de enlaces y páginas personalizadas
              (en adelante, el &quot;Servicio&quot;). Al registrarte, acceder o utilizar de
              cualquier forma el Servicio, declaras que has leído, comprendido y aceptado quedar
              legalmente vinculado por estos Términos, así como por nuestra Política de Privacidad.
              Si no estás de acuerdo con estos Términos, debes abstenerse de utilizar el Servicio.
            </p>

            <section aria-labelledby="terms-object">
              <h2 id="terms-object">1. Objeto del Servicio</h2>
              <p>
                El Servicio opera como una herramienta tecnológica de software como servicio (SaaS)
                que permite a los usuarios crear páginas web personalizadas de aterrizaje y agrupar
                enlaces externos hacia sus redes sociales, portafolios, tiendas u otros destinos en
                la web. El Servicio se proporciona bajo la modalidad &quot;tal cual&quot; (as is) y
                &quot;según disponibilidad&quot;.
              </p>
            </section>

            <section aria-labelledby="terms-accounts">
              <h2 id="terms-accounts">2. Registro y Cuentas de Usuario</h2>
              <ul>
                <li>
                  <strong>Capacidad Legal:</strong> Para utilizar el Servicio, debes tener capacidad
                  legal para contratar conforme a las leyes de tu jurisdicción.
                </li>
                <li>
                  <strong>Seguridad de la Cuenta:</strong> Eres responsable de mantener la
                  confidencialidad de tus credenciales de acceso (correo electrónico y contraseña).
                  Cualquier actividad realizada bajo tu cuenta será de tu entera responsabilidad.
                </li>
                <li>
                  <strong>Exactitud de los Datos:</strong> Te comprometes a proporcionar información
                  verídica, actualizada y completa durante tu registro.
                </li>
              </ul>
            </section>

            <section aria-labelledby="terms-content">
              <h2 id="terms-content">
                3. Contenido del Usuario y Responsabilidad sobre Enlaces (User-Generated Content)
              </h2>
              <ul>
                <li>
                  <strong>Autonomía del Contenido:</strong> El usuario reconoce y acepta que es el
                  único propietario y responsable exclusivo de todo el contenido que cargue,
                  muestre, enlace o transmita a través de su página personalizada (textos,
                  logotipos, imágenes, marcas y, muy especialmente, los enlaces a sitios web
                  externos).
                </li>
                <li>
                  <strong>Ausencia de Control Previo:</strong> El operador del Servicio actúa como
                  un proveedor de servicios de alojamiento intermediario y pasivo. No revisamos,
                  filtramos, garantizamos ni controlamos de antemano el contenido de los destinos a
                  los que apuntan los enlaces creados por los usuarios.
                </li>
              </ul>
            </section>

            <section aria-labelledby="terms-prohibited">
              <h2 id="terms-prohibited">4. Usos Prohibidos y Restricciones de Enlaces</h2>
              <p>
                Queda terminantemente prohibido utilizar el Servicio para publicar, alojar o
                redirigir tráfico mediante enlaces hacia:
              </p>
              <ol>
                <li>
                  Actividades fraudulentas o maliciosas: Enlaces de phishing, distribución de
                  malware, virus troyanos, ransomware o cualquier software diseñado para dañar
                  sistemas informáticos.
                </li>
                <li>
                  Estafas y fraudes: Esquemas piramidales, falsas tiendas virtuales, estafas con
                  criptomonedas o captación ilegal de recursos.
                </li>
                <li>
                  Contenido ilegal o infringente: Material que vulnere derechos de autor, propiedad
                  industrial, secretos comerciales, o que promueva la piratería.
                </li>
                <li>
                  Contenido prohibido o sensible: Pornografía infantil, violencia extrema,
                  incitación al odio, discriminación, terrorismo o comercialización de sustancias
                  ilícitas.
                </li>
                <li>
                  Suplantación de identidad: Crear páginas fingiendo ser personas naturales, marcas
                  comerciales, entidades gubernamentales o empresas sin la debida autorización.
                </li>
              </ol>
            </section>

            <section aria-labelledby="terms-suspension">
              <h2 id="terms-suspension">5. Suspensión, Bloqueo y Eliminación de Contenido</h2>
              <p>
                Nos reservamos el derecho absoluto —sin que ello genere derecho a indemnización ni
                reembolso alguno para el usuario— de suspender cuentas, bloquear páginas
                personalizadas y eliminar de forma inmediata cualquier enlace que:
              </p>
              <ul>
                <li>Viole estos Términos y Condiciones.</li>
                <li>Infrinja la legislación aplicable o derechos de terceros.</li>
                <li>
                  Sea reportado por autoridades competentes o mediante denuncias de abuso (abuse
                  reports).
                </li>
              </ul>
            </section>

            <section aria-labelledby="terms-liability">
              <h2 id="terms-liability">6. Limitación de Responsabilidad y Exención de Garantías</h2>
              <ul>
                <li>
                  <strong>Funcionamiento Continuo:</strong> No garantizamos que el Servicio esté
                  libre de errores, interrupciones, caídas de servidores de terceros (como
                  proveedores de infraestructura en la nube) o fallos de seguridad imprevistos.
                </li>
                <li>
                  <strong>Daños por Enlaces Externos:</strong> El operador del Servicio no asume
                  ninguna responsabilidad por los daños, pérdidas económicas, infecciones de virus o
                  perjuicios que los visitantes de una página puedan sufrir al hacer clic en los
                  enlaces externos configurados por los usuarios.
                </li>
                <li>
                  <strong>Indemnización:</strong> El usuario acepta defender, indemnizar y mantener
                  indemne al operador del Servicio, sus desarrolladores, socios y colaboradores
                  frente a cualquier reclamación, demanda, multa o gasto (incluyendo honorarios
                  legales) derivado del mal uso del Servicio o del incumplimiento de estos Términos.
                </li>
              </ul>
            </section>

            <section aria-labelledby="terms-intellectual-property">
              <h2 id="terms-intellectual-property">7. Propiedad Intelectual</h2>
              <ul>
                <li>
                  <strong>Derechos de la Plataforma:</strong> Todo el código fuente, diseño,
                  interfaces, logotipos, arquitectura de software y marcas comerciales asociadas al
                  Servicio son propiedad exclusiva del operador de la plataforma y están protegidos
                  por las leyes de propiedad intelectual.
                </li>
                <li>
                  <strong>Licencia de Contenido del Usuario:</strong> Al publicar contenido en tu
                  página, otorgas al operador una licencia mundial, no exclusiva, gratuita y
                  limitada para alojar, mostrar técnicamente y reproducir dicho contenido
                  estrictamente con el propósito de operar y promocionar el Servicio.
                </li>
              </ul>
            </section>

            <section aria-labelledby="terms-modifications">
              <h2 id="terms-modifications">8. Modificaciones a los Términos</h2>
              <p>
                Nos reservamos el derecho de modificar estos Términos en cualquier momento. Las
                modificaciones entrarán en vigor a partir de su publicación en la plataforma. El uso
                continuado del Servicio después de dicha publicación constituirá tu aceptación de
                los nuevos términos.
              </p>
            </section>

            <section aria-labelledby="terms-law">
              <h2 id="terms-law">9. Ley Aplicable y Jurisdicción</h2>
              <p>
                Estos Términos se regirán e interpretarán de conformidad con las leyes vigentes del
                país de residencia principal del operador, sin tener en cuenta sus principios de
                conflicto de leyes. Cualquier controversia será sometida a la jurisdicción de los
                tribunales competentes.
              </p>
            </section>
          </div>

          <Link className={styles.backLink} href="/">
            <span aria-hidden="true">←</span> Volver al Home
          </Link>
        </article>
      </main>
      <LandingFooter />
    </div>
  );
}
