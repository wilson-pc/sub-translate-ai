export function filterDrawingCommands(dialogs: string[]): string[] {
  const isCmd = (t: string) => /^[mlb]$/i.test(t);
  const isNum = (t: string) => /^-?\d+$/.test(t);

  function isDrawingCommandLine(line: string): boolean {
    const tokens = line.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return false;

    let sawCommand = false;

    for (const t of tokens) {
      if (isCmd(t)) {
        sawCommand = true; // vimos al menos un comando
      } else if (!isNum(t)) {
        return false; // letra extraña → inválido
      }
    }

    return sawCommand; // válido mientras solo haya cmds + números
  }

  return dialogs.map((dialog, index) =>
    isDrawingCommandLine(dialog) ? `{{${index}}}` : dialog
  );
}

export function restoreDrawingCommands(
  filtered: string[],
  original: string[]
): string[] {
  return filtered.map((dialog) =>
    dialog.replace(
      /\{\{(\d+)\}\}/g,
      (_, index) => original[Number(index)] ?? ""
    )
  );
}

export function deduplicateDialogsGemini(dialogs: string[]) {
  const textToPatternMap = new Map<string, string>();
  const patternToOriginalMap = new Map<string, string>();
  const deduplicatedStructure: string[] = [];
  const linesToTranslate: string[] = [];

  let patternCounter = 1;

  // Variables de estado
  let lastText = "";
  let repeatCount = 0;

  // Guardamos explícitamente el patrón de la primera vez que aparece el texto actual
  let currentSequenceFirstPattern = "";

  for (const dialog of dialogs) {
    const text = dialog.trim();

    // 1. Manejo de líneas vacías
    if (!text) {
      deduplicatedStructure.push("");
      lastText = "";
      repeatCount = 0;
      currentSequenceFirstPattern = ""; // Reseteamos
      continue;
    }

    // 2. Contar repeticiones
    if (text === lastText) {
      repeatCount++;
    } else {
      repeatCount = 1;
      lastText = text;
      currentSequenceFirstPattern = ""; // Nuevo texto, limpiamos referencia
    }

    // 3. Lógica de asignación de patrones

    // CASO A: Primera o Segunda vez que aparece → CREAR NUEVO ID
    if (repeatCount <= 2) {
      const pattern = `[[id:${patternCounter}]]`;

      // Si es la primera vez (repeatCount === 1), guardamos este patrón como la "referencia"
      // para usarlo si aparecen una 3ra, 4ta, 5ta vez...
      if (repeatCount === 1) {
        currentSequenceFirstPattern = pattern;
      }

      deduplicatedStructure.push(pattern);

      // Solo agregamos al mapa y a traducir si generamos un ID nuevo
      // Nota: Aquí podrías optimizar más si la 2da repetición es idéntica a la 1ra,
      // pero tu requerimiento dice explícitamente "SIEMPRE crear un nuevo patrón" para la 2da.
      textToPatternMap.set(`${text}__${patternCounter}`, pattern);
      patternToOriginalMap.set(pattern, text);
      linesToTranslate.push(`${pattern} ${text}`);

      patternCounter++;
    }
    // CASO B: Tercera vez o más → REUTILIZAR EL PRIMER PATRÓN (DEDUPLICAR)
    else {
      // Simplemente usamos la variable que guardamos en la repetición 1
      // Esto evita el cálculo matemático que fallaba con índices negativos o cero.
      if (currentSequenceFirstPattern) {
        deduplicatedStructure.push(currentSequenceFirstPattern);
      } else {
        // Fallback defensivo (no debería ocurrir nunca si la lógica anterior es correcta)
        const pattern = `[[id:${patternCounter}]]`;
        deduplicatedStructure.push(pattern);
        linesToTranslate.push(`${pattern} ${text}`);
        patternToOriginalMap.set(pattern, text);
        patternCounter++;
      }
    }
  }

  return {
    deduplicatedStructure,
    linesToTranslate,
    patternToOriginalMap,
  };
}

export function restoreDialogsGemini(
  deduplicatedStructure: string[],
  rawOutputFromAI: string | string[],
  patternToOriginalMap: Map<string, string>
): {
  items: string[];
  isError: boolean;
} {
  const patternToTranslationMap = new Map<string, string>();

  // 1. Normalizar input
  let bigString = "";
  if (Array.isArray(rawOutputFromAI)) {
    bigString = rawOutputFromAI.join("\n");
  } else {
    bigString = rawOutputFromAI;
  }
  bigString = bigString.replace(/\r\n/g, "\n");

  // 2. Parseo (Tu lógica de Regex estaba bien, solo añadí robustez al split)
  const splitRegex = /(\[\[\s*id:\s*\d+\s*\]\])/i;
  const parts = bigString.split(splitRegex);

  let currentIdPattern: string | null = null;

  for (const part of parts) {
    // Es un ID
    if (splitRegex.test(part)) {
      const match = part.match(/id:\s*(\d+)/i);
      if (match) {
        // Reconstruimos el ID exactamente como lo generamos en deduplicate (sin espacios)
        currentIdPattern = `[[id:${match[1]}]]`;
      }
    }
    // Es contenido (Texto)
    else if (currentIdPattern) {
      // Eliminamos espacios al inicio/final del bloque
      let translation = part.trim();

      // Limpieza: La IA a veces pone "[[id:1]] : Hola". Quitamos ese ":" o "-" inicial.
      translation = translation.replace(/^[:.-]+/, "").trim();

      // A veces el split deja un string vacío si hay dos IDs pegados. Lo ignoramos si no hay texto.
      if (translation) {
        patternToTranslationMap.set(currentIdPattern, translation);
      }

      // Reseteamos null para que la siguiente iteración busque un nuevo ID
      // Ojo: No resetearlo permite que si la IA parte el texto en varios trozos sin ID,
      // se concatenen? No con este loop. Resetear es correcto.
      currentIdPattern = null;
    }
  }

  // 3. Restaurar
  const restoredArray: string[] = [];
  let isError = false;

  for (const item of deduplicatedStructure) {
    if (item.startsWith("[[id:") && item.endsWith("]]")) {
      let translation = patternToTranslationMap.get(item);

      if (translation === undefined || translation === null) {
        // Si no hay traducción, usamos el original
        // console.warn(`⚠️ Faltó traducción para ${item}. Usando original.`);
        translation = `[[error]]${patternToOriginalMap.get(item)}`;
        isError = true;
      }

      restoredArray.push(translation);
    } else {
      // Líneas vacías o cosas que no eran diálogos
      restoredArray.push(item);
    }
  }

  return {
    items: restoredArray,
    isError,
  };
}
