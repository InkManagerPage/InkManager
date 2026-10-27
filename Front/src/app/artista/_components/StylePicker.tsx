import styles from './panel.module.css';

export function StylePicker({
  opciones,
  seleccionados,
  onChange,
  label = 'Estilos',
}: {
  opciones: string[];
  seleccionados: string[];
  onChange: (valores: string[]) => void;
  label?: string;
}) {
  return (
    <fieldset className={styles.stylePicker}>
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
    </fieldset>
  );
}
