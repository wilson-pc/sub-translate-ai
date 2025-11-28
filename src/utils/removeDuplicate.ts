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

export interface DeduplicationResult {
  deduplicatedStructure: string[]; // Estructura: [ "[[id:1]]", "[[id:2]]", ... ]
  linesToTranslate: string[]; // Para la IA: [ "[[id:1]] Hola", "[[id:2]] Mundo" ]
  patternToOriginalMap: Map<string, string>; // Respaldo: "[[id:1]]" -> "Hola"
}

export function deduplicateDialogsGemini(
  dialogs: string[]
): DeduplicationResult {
  const textToPatternMap = new Map<string, string>();
  const patternToOriginalMap = new Map<string, string>();
  const deduplicatedStructure: string[] = [];
  const linesToTranslate: string[] = [];

  let patternCounter = 1;

  for (const dialog of dialogs) {
    const normalizedDialog = dialog.trim();

    // Mantener líneas vacías si existen
    if (!normalizedDialog) {
      deduplicatedStructure.push("");
      continue;
    }

    if (textToPatternMap.has(normalizedDialog)) {
      // Si ya existe, reutilizamos el ID
      const pattern = textToPatternMap.get(normalizedDialog)!;
      deduplicatedStructure.push(pattern);
    } else {
      // Generamos nuevo patrón estilo [[id:N]]
      const pattern = `[[id:${patternCounter}]]`;

      textToPatternMap.set(normalizedDialog, pattern);
      patternToOriginalMap.set(pattern, normalizedDialog);

      deduplicatedStructure.push(pattern);

      // Preparamos la línea para la IA con un espacio simple
      linesToTranslate.push(`${pattern} ${normalizedDialog}`);

      patternCounter++;
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
  rawOutputFromAI: string | string[], // Aceptamos ambos
  patternToOriginalMap: Map<string, string>
): string[] {
  const patternToTranslationMap = new Map<string, string>();

  // 1. Convertir todo a un solo string gigante normalizado
  let bigString = "";
  if (Array.isArray(rawOutputFromAI)) {
    bigString = rawOutputFromAI.join("\n");
  } else {
    bigString = rawOutputFromAI;
  }

  // Normalizar saltos de línea extraños que a veces meten las IAs
  bigString = bigString.replace(/\r\n/g, "\n");

  // 2. LA MAGIA: Dividir usando el ID como delimitador.
  // El Regex captura el ID entero: [[ id : 123 ]]
  // Al ponerlo entre paréntesis (), el .split() incluye el separador en el array resultante.
  const splitRegex = /(\[\[\s*id:\s*\d+\s*\]\])/i;

  const parts = bigString.split(splitRegex);

  // parts se verá así:
  // [ "", "[[id:1]]", " Texto trad 1\nSegunda linea", "[[id:2]]", " Texto 2" ]

  let currentIdPattern: string | null = null;

  for (const part of parts) {
    // Verificamos si esta parte es un ID (ej: [[id:50]])
    if (splitRegex.test(part)) {
      // Normalizamos el ID para asegurarnos que coincida con nuestro mapa (sin espacios extra)
      const match = part.match(/id:\s*(\d+)/i);
      if (match) {
        currentIdPattern = `[[id:${match[1]}]]`;
      }
    }
    // Si no es un ID, y tenemos un ID pendiente, esto es el TEXTO (con saltos de línea y todo)
    else if (currentIdPattern) {
      let translation = part.trim();

      // Limpieza defensiva: A veces la IA pone "[[id:1]] : Hola"
      translation = translation.replace(/^[:.-]+/, "").trim();

      if (translation) {
        patternToTranslationMap.set(currentIdPattern, translation);
      }

      // Reseteamos para evitar asignar basura si algo falla
      currentIdPattern = null;
    }
  }

  // 3. Restaurar (igual que antes)
  const restoredArray: string[] = [];

  for (const item of deduplicatedStructure) {
    if (item.startsWith("[[id:") && item.endsWith("]]")) {
      let translation = patternToTranslationMap.get(item);

      if (translation === undefined) {
        // Fallback al original si la IA falló
        // (Aunque con este método fallará mucho menos)
        console.warn(`⚠️ Missing translation for ${item}. Using original.`);
        translation = patternToOriginalMap.get(item) || "";
      }

      restoredArray.push(translation);
    } else {
      restoredArray.push(item);
    }
  }

  return restoredArray;
}
