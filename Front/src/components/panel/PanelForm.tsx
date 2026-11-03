'use client';

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import {
  Formik,
  Form,
  useField,
  useFormikContext,
  type FormikErrors,
  type FormikValues,
} from 'formik';
import BootstrapForm from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';
import { useUnsavedChanges } from '@/components/forms/UnsavedChanges';
import styles from './workspace.module.css';

export function PanelForm<Values extends FormikValues>({
  initialValues,
  validate,
  onSave,
  onSaved,
  children,
  className,
  enableReinitialize = false,
}: {
  initialValues: Values;
  validate: (values: Values) => FormikErrors<Values>;
  onSave: (values: Values) => string | void | Promise<string | void>;
  onSaved?: () => void;
  children: ReactNode;
  className?: string;
  enableReinitialize?: boolean;
}) {
  const [submitted, setSubmitted] = useState(false);
  return (
    <Formik
      initialValues={initialValues}
      enableReinitialize={enableReinitialize}
      validate={validate}
      validateOnChange={submitted}
      validateOnBlur={submitted}
      onSubmit={async (values, helpers) => {
        helpers.setStatus('');
        try {
          const error = await onSave(values);
          if (error) {
            helpers.setStatus(error);
            return;
          }
          flushSync(() => {
            helpers.resetForm({ values });
            setSubmitted(false);
          });
          onSaved?.();
        } catch (cause) {
          helpers.setStatus(
            cause instanceof Error
              ? cause.message
              : 'No pudimos guardar los cambios. Intentá nuevamente.',
          );
        }
      }}
    >
      <Form noValidate className={className} onSubmitCapture={() => setSubmitted(true)}>
        <FormState />
        <FormContents>{children}</FormContents>
        <FormStatus />
      </Form>
    </Formik>
  );
}

function FormContents({ children }: { children: ReactNode }) {
  const { isSubmitting } = useFormikContext();
  return (
    <fieldset disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
      {children}
    </fieldset>
  );
}

function FormState() {
  const { dirty, submitCount, isValidating, isSubmitting, errors, touched } = useFormikContext();
  const handled = useRef(0);
  const anchor = useRef<HTMLSpanElement>(null);
  useUnsavedChanges(dirty);
  useEffect(() => {
    if (
      !submitCount ||
      isValidating ||
      isSubmitting ||
      handled.current === submitCount ||
      !Object.keys(errors).length
    )
      return;
    const element = anchor.current
      ?.closest('form')
      ?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (element) {
      for (const details of element.closest('details') ? [element.closest('details')!] : [])
        details.open = true;
      const collapsed = element.closest('.accordion-collapse:not(.show)');
      const focus = () => {
        element.focus();
        if (document.activeElement === element) handled.current = submitCount;
      };
      if (collapsed) {
        collapsed
          .closest('.accordion-item')
          ?.querySelector<HTMLButtonElement>('.accordion-button[aria-expanded="false"]')
          ?.click();
      }
      const timer = setTimeout(focus, 0);
      return () => clearTimeout(timer);
    }
  }, [errors, isValidating, isSubmitting, submitCount, touched]);
  return <span ref={anchor} hidden />;
}

function FormStatus() {
  const { status } = useFormikContext();
  return status ? (
    <p role="alert" className={`${styles.notice} ${styles.error} mt-3`}>
      {String(status)}
    </p>
  ) : null;
}

export function PanelSubmitButton({
  children,
  disabled = false,
  pendingText = 'Guardando…',
}: {
  children: ReactNode;
  disabled?: boolean;
  pendingText?: string;
}) {
  const { isSubmitting } = useFormikContext();
  return (
    <button
      type="submit"
      className={styles.button}
      disabled={disabled || isSubmitting}
      aria-busy={isSubmitting || undefined}
    >
      {isSubmitting ? (
        <>
          <Spinner animation="border" size="sm" aria-hidden="true" className="me-2" />
          <span role="status">{pendingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function PanelField({
  name,
  label,
  children,
  as,
  type = 'text',
  hint,
  ...props
}: {
  name: string;
  label: string;
  children?: ReactNode;
  as?: 'select' | 'textarea';
  type?: string;
  hint?: string;
  min?: number | string;
  max?: number | string;
  minLength?: number;
  maxLength?: number;
  rows?: number;
  required?: boolean;
  autoComplete?: string;
  step?: string | number;
  placeholder?: string;
}) {
  const [field, meta] = useField(name);
  const invalid = Boolean(meta.touched && meta.error);
  const id = `panel-field-${name}`;
  const { setFieldValue } = useFormikContext();
  const shared = {
    ...field,
    ...props,
    ...(as === 'select' && type === 'number'
      ? {
          onChange: (
            event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
          ) => {
            void setFieldValue(name, Number(event.target.value));
          },
        }
      : {}),
    'aria-invalid': invalid || undefined,
    'aria-describedby': invalid ? `${id}-error` : hint ? `${id}-hint` : undefined,
    isInvalid: invalid,
  };
  return (
    <BootstrapForm.Group className={styles.field} controlId={id}>
      <BootstrapForm.Label>
        {label}
        {props.required && <span className="visually-hidden"> (obligatorio)</span>}
      </BootstrapForm.Label>
      {as === 'select' ? (
        <BootstrapForm.Select {...shared}>{children}</BootstrapForm.Select>
      ) : (
        <BootstrapForm.Control {...shared} as={as} type={as === 'textarea' ? undefined : type} />
      )}
      {invalid && (
        <BootstrapForm.Control.Feedback type="invalid" id={`${id}-error`}>
          {meta.error}
        </BootstrapForm.Control.Feedback>
      )}
      {hint && <BootstrapForm.Text id={`${id}-hint`}>{hint}</BootstrapForm.Text>}
    </BootstrapForm.Group>
  );
}
