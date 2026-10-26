'use client';
import { useField } from 'formik';
import { useState } from 'react';
import type { HTMLInputTypeAttribute } from 'react';
import styles from '@/components/auth/auth.module.css';
interface Props {
  name: string;
  label: string;
  prefix: string;
  type?: HTMLInputTypeAttribute;
  autoComplete?: string;
  hint?: string;
}
export function AuthField({ name, label, prefix, type = 'text', autoComplete, hint }: Props) {
  const [field, meta] = useField<string>(name);
  const [visible, setVisible] = useState(false);
  const esPassword = type === 'password';
  const nombrePassword =
    name === 'confirmPassword' ? 'confirmación de contraseña' : label.toLowerCase();
  const id = `${prefix}-${name}`;
  const error = meta.touched && meta.error;
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={esPassword ? styles.passwordInput : undefined}>
        <input
          {...field}
          id={id}
          type={esPassword && visible ? 'text' : type}
          autoComplete={autoComplete}
          required
          className={`form-control ${error ? 'is-invalid' : ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
        {esPassword && (
          <button
            type="button"
            className={styles.passwordToggle}
            aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${nombrePassword}`}
            aria-pressed={visible}
            aria-controls={id}
            onClick={() => setVisible(!visible)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
              {visible && <path d="m3 3 18 18" />}
            </svg>
          </button>
        )}
      </div>
      {error ? (
        <div id={`${id}-error`} className="invalid-feedback d-block" role="alert">
          {error}
        </div>
      ) : (
        hint && (
          <small id={`${id}-hint`} className={styles.hint}>
            {hint}
          </small>
        )
      )}
    </div>
  );
}
