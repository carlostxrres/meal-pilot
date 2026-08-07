/**
 * Deduplica queries idénticas dentro de una misma carga de página: varias
 * funciones de `data/` pueden necesitar la misma tabla completa (`ingredient`,
 * `meal`...) y hoy cada una la pide por su cuenta. Se instancia una por
 * request (nunca a nivel de módulo — mezclaría datos de usuarios distintos)
 * y se pasa como parámetro opcional a las funciones que la soportan; quien no
 * la pasa sigue funcionando igual que antes (cada llamada crea la suya).
 */
export class RequestCache {
  private readonly entries = new Map<string, Promise<unknown>>();

  get<T>(key: string, fetch: () => PromiseLike<T>): Promise<T> {
    let entry = this.entries.get(key);
    if (!entry) {
      entry = Promise.resolve(fetch());
      this.entries.set(key, entry);
    }
    return entry as Promise<T>;
  }
}
