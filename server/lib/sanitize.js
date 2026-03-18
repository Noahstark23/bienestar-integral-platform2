/**
 * Recorre un objeto y aplica trim() a todos los valores string (shallow).
 * Retorna un objeto nuevo sin modificar el original.
 */
export function trimStrings(obj) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        result[key] = typeof value === 'string' ? value.trim() : value;
    }
    return result;
}
