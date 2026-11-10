export function descripcionValida(texto: string) {
  return /^[\s\S]{20,1500}$/.test(texto.trim());
}
