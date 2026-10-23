'use client';
import { useField } from 'formik';
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
  const id = `${prefix}-${name}`;
  const error = meta.touched && meta.error;
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        {...field}
        id={id}
        type={type}
        autoComplete={autoComplete}
        required
        className={`form-control ${error ? 'is-invalid' : ''}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />
      {error ? (
        <div id={`${id}-error`} className="invalid-feedback" role="alert">
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
