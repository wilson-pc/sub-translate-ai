interface DeduplicationResult {
  deduplicatedArray: string[];
  originalToPatternMap: Map<string, string>;
  uniqueDialogs: string[];
}

/**
 * Reemplaza los diálogos repetidos con un patrón de marcador para ahorrar tokens
 * de traducción.
 * * @param dialogs Array de strings donde cada string es un diálogo.
 * @returns Un objeto con el array modificado, los diálogos únicos y el mapa de patrones.
 */
export function deduplicateDialogsGemini(
  dialogs: string[]
): DeduplicationResult {
  // Usamos un Map para rastrear diálogos únicos y su patrón de reemplazo.
  // clave: el diálogo original (string)
  // valor: el patrón de reemplazo (string, ej: '@@DUP:1@@')
  const originalToPatternMap = new Map<string, string>();

  // Usamos un Set para asegurar la unicidad de los diálogos que se enviarán a traducir.
  const uniqueDialogsSet = new Set<string>();

  let patternCounter = 1;
  const deduplicatedArray: string[] = [];

  for (const dialog of dialogs) {
    // Normalizamos o limpiamos el diálogo si fuera necesario, aunque por simplicidad
    // aquí usamos el diálogo tal cual.
    const normalizedDialog = dialog.trim();

    if (originalToPatternMap.has(normalizedDialog)) {
      // El diálogo ya ha sido visto. Usamos su patrón existente.
      const pattern = originalToPatternMap.get(normalizedDialog)!;
      deduplicatedArray.push(pattern);
    } else {
      // Es un diálogo nuevo.

      // 1. Lo agregamos al conjunto de diálogos únicos para traducir.
      uniqueDialogsSet.add(normalizedDialog);

      // 2. Creamos un patrón de reemplazo.
      // Siempre se reemplaza por el patrón, incluso la primera aparición,
      // para que todos los diálogos únicos para traducción estén en `uniqueDialogs`.
      const pattern = `@@DUP:${patternCounter}@@`;
      originalToPatternMap.set(normalizedDialog, pattern);

      // 3. Agregamos el patrón al array final.
      deduplicatedArray.push(pattern);

      patternCounter++;
    }
  }

  // Extraemos los diálogos únicos del Set.
  const uniqueDialogs = Array.from(uniqueDialogsSet);

  return {
    deduplicatedArray,
    originalToPatternMap,
    uniqueDialogs,
  };
}
// ---
/**
 * Restaura los diálogos duplicados previamente reemplazados con el patrón.
 * * @param deduplicatedArray El array resultante de `deduplicateDialogs`, que contiene patrones ('@@DUP:N@@').
 * @param originalToPatternMap El Map generado por `deduplicateDialogs` (Original -> Patrón).
 * @param translatedDialogs Array de strings que son las traducciones de `uniqueDialogs`.
 * @returns El array final con todos los diálogos restaurados y traducidos.
 */
export function restoreDialogsGemini(
  deduplicatedArray: string[],
  originalToPatternMap: Map<string, string>,
  translatedDialogs: string[]
): string[] {
  if (originalToPatternMap.size !== translatedDialogs.length) {
    console.error(
      "El número de diálogos únicos en el mapa no coincide con el número de diálogos traducidos."
    );
  }

  // Paso 1: Invertir el mapa para ir del PATRÓN a la TRADUCCIÓN.
  // Usamos el Map original (Original -> Patrón) para generar un nuevo Map (Patrón -> Traducción).
  const patternToTranslationMap = new Map<string, string>();
  const originals = Array.from(originalToPatternMap.keys());

  // Iteramos sobre los originales. La posición 'i' de 'originals' se corresponde con
  // la posición 'i' de 'translatedDialogs'.
  for (let i = 0; i < originals.length; i++) {
    const originalDialog = originals[i];
    const pattern = originalToPatternMap.get(originalDialog)!;
    const translation = translatedDialogs[i];

    patternToTranslationMap.set(pattern, translation);
  }

  // Paso 2: Recorrer el array con patrones y reemplazar.
  const restoredArray: string[] = [];

  for (const item of deduplicatedArray) {
    // El patrón de búsqueda debe coincidir con el generado: @@DUP:1@@
    if (item.startsWith("@@DUP:") && item.endsWith("@@")) {
      // Es un patrón. Buscamos su traducción.
      const translation = patternToTranslationMap.get(item);
      if (translation === undefined) {
        // Esto no debería pasar si la lógica es correcta.
        console.error(`Patrón no encontrado en el mapa de traducción: ${item}`);
      }
      restoredArray.push(translation ?? "");
    } else {
      // Este caso es de resguardo si por error se introdujo un diálogo no-patrón.
      // En la lógica de `deduplicateDialogs`, esto no debería ocurrir.
      restoredArray.push(item);
    }
  }

  return restoredArray;
}
