import styles from './panel.module.css';

export function StylePicker({
  opciones,
  seleccionados,
  onChange,
  label = 'Estilos',
  error,
}: {
  opciones: string[];
  seleccionados: string[];
  onChange: (valores: string[]) => void;
  label?: string;
  error?: string;
}) {
  return (
    <fieldset
      className={styles.stylePicker}
      tabIndex={-1}
      aria-invalid={Boolean(error) || undefined}
      aria-describedby={error ? 'styles-error' : undefined}
    >
      <legend>{label}</legend>
      <div className={styles.choices}>
        {opciones.map((estilo) => (
          <label key={estilo} className={styles.choice}>
            <input
              type="checkbox"
              className="visually-hidden"
              checked={seleccionados.includes(estilo)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...seleccionados, estilo]
                    : seleccionados.filter((valor) => valor !== estilo),
                )
              }
            />
            <span>{estilo}</span>
          </label>
        ))}
      </div>
      {error && (
        <p id="styles-error" role="alert" className="text-danger mt-2">
          {error}
        </p>
      )}
    </fieldset>
  );
}
