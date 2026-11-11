'use client';

import { useState } from 'react';
import { Field, Form, Formik, type FormikErrors } from 'formik';
import Link from 'next/link';
import { SiteHeader } from '@/components/auth/SiteHeader';
import { LandingFooter } from '@/app/estudios/_components/LandingFooter';
import { sendContactMessage } from './actions';
import styles from './contacto.module.css';

type ContactValues = {
  name: string;
  email: string;
  message: string;
};

type ContactFeedback = {
  success: boolean;
  message: string;
};

const initialValues: ContactValues = { name: '', email: '', message: '' };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: ContactValues): FormikErrors<ContactValues> {
  const errors: FormikErrors<ContactValues> = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const message = values.message.trim();

  if (!name || name.length > 100) {
    errors.name = 'Ingresá tu nombre (hasta 100 caracteres).';
  }
  if (!emailPattern.test(email) || email.length > 254) {
    errors.email = 'Ingresá un email válido.';
  }
  if (!message || message.length > 5000) {
    errors.message = 'Escribí un mensaje de hasta 5000 caracteres.';
  }
  return errors;
}

export default function ContactPage() {
  const [feedback, setFeedback] = useState<ContactFeedback>();

  return (
    <div className={styles.layout}>
      <SiteHeader />
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.intro}>
            <Link className={styles.backLink} href="/">
              <span aria-hidden="true">←</span> Volver al inicio
            </Link>
            <p className={styles.eyebrow}>InkManager</p>
            <h1>Contacto</h1>
            <p>Dejanos tu consulta y el equipo de InkManager se pondrá en contacto.</p>
          </header>

          <Formik<ContactValues>
            initialValues={initialValues}
            validate={validate}
            onSubmit={async (values, { resetForm }) => {
              setFeedback(undefined);
              try {
                const result = await sendContactMessage(values.name, values.email, values.message);
                setFeedback(result);
                if (result.success) resetForm();
              } catch (error) {
                console.error('Contact form submission failed:', error);
                setFeedback({
                  success: false,
                  message: 'No pudimos enviar tu mensaje. Intentá nuevamente más tarde.',
                });
              }
            }}
          >
            {({ errors, touched, isSubmitting }) => (
              <Form className={styles.form} noValidate onChange={() => setFeedback(undefined)}>
                <fieldset className={styles.fields} disabled={isSubmitting}>
                  <div className={styles.field}>
                    <label htmlFor="contact-name">Nombre</label>
                    <Field
                      id="contact-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      maxLength={100}
                      aria-invalid={Boolean(touched.name && errors.name)}
                      aria-describedby={
                        touched.name && errors.name ? 'contact-name-error' : undefined
                      }
                    />
                    {touched.name && errors.name && (
                      <p className={styles.error} id="contact-name-error">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="contact-email">Email</label>
                    <Field
                      id="contact-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      aria-invalid={Boolean(touched.email && errors.email)}
                      aria-describedby={
                        touched.email && errors.email ? 'contact-email-error' : undefined
                      }
                    />
                    {touched.email && errors.email && (
                      <p className={styles.error} id="contact-email-error">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div className={`${styles.field} ${styles.messageField}`}>
                    <label htmlFor="contact-message">Mensaje</label>
                    <Field
                      as="textarea"
                      id="contact-message"
                      name="message"
                      rows={6}
                      maxLength={5000}
                      aria-invalid={Boolean(touched.message && errors.message)}
                      aria-describedby={
                        touched.message && errors.message ? 'contact-message-error' : undefined
                      }
                    />
                    {touched.message && errors.message && (
                      <p className={styles.error} id="contact-message-error">
                        {errors.message}
                      </p>
                    )}
                  </div>

                  <button className={styles.submit} type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Enviando…' : 'Enviar mensaje'}
                  </button>
                </fieldset>
                {feedback && (
                  <p
                    className={feedback.success ? styles.success : styles.error}
                    role={feedback.success ? 'status' : 'alert'}
                    aria-live={feedback.success ? 'polite' : 'assertive'}
                  >
                    {feedback.message}
                  </p>
                )}
              </Form>
            )}
          </Formik>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
