import { atom, WritableAtom } from "jotai";
import Dexie, { Table } from "dexie";

// --- A. Definición de la Base de Datos con Dexie ---

// Define la estructura de tu base de datos y la tabla
interface KeyValueItem {
  key: string;
  value: any;
}

class MyDexieDB extends Dexie {
  // 'settings' es el nombre de la tabla (Object Store)
  settings!: Table<KeyValueItem, string>;

  constructor() {
    super("JotaiIndexedDBStore");
    // Versionar la base de datos y definir el esquema
    this.version(1).stores({
      // El índice primario es 'key', y no hay índices secundarios.
      settings: "&key",
    });
  }
}

// Inicializa la instancia de la base de datos
export const database = new MyDexieDB();

// --- B. Función de Persistencia ---

/**
 * Carga un valor desde IndexedDB.
 * @param key La clave para buscar en la tabla 'settings'.
 * @param initialValue El valor a devolver si no se encuentra nada.
 */
const loadFromIDB = async <T>(key: string, initialValue: T): Promise<T> => {
  try {
    const item = await database.settings.get(key);
    // Si item existe y tiene una propiedad 'value', se devuelve. De lo contrario, devuelve initialValue.
    return item ? (item.value as T) : initialValue;
  } catch (e) {
    console.error(
      `Dexie: Error loading key "${key}". Returning initial value.`,
      e
    );
    return initialValue;
  }
};

/**
 * Guarda un valor en IndexedDB.
 * @param key La clave para guardar en la tabla 'settings'.
 * @param value El valor a guardar.
 */
const saveToIDB = async (key: string, value: any): Promise<void> => {
  try {
    // Usa 'put' para insertar o actualizar si la clave ya existe
    await database.settings.put({ key, value });
  } catch (e) {
    console.error(`Dexie: Error saving key "${key}".`, e);
  }
};

// --- C. El átomo con IndexedDB ---

/**
 * Crea un átomo que persiste su estado en IndexedDB usando Dexie.
 *
 * @param key La clave usada para la persistencia en IndexedDB.
 * @param initialValue El valor inicial si no hay valor persistido.
 * @returns Un WritableAtom que maneja la lectura y escritura asíncrona.
 */
export const atomWithIndexedDB = <T>(
  key: string,
  initialValue: T
): WritableAtom<T, [T], Promise<void>> => {
  // 1. Átomo base para guardar el estado real, inicialmente un Promise (para el estado de carga)
  const baseAtom = atom<T | Promise<T>>(
    // Inicializamos con la promesa de cargar el valor de IDB
    loadFromIDB(key, initialValue)
  );

  // 2. Átomo derivado para exponer la interfaz sincrónica al componente
  const idbAtom = atom(
    // READ (asíncrona)
    (get) => get(baseAtom),

    // WRITE (asíncrona)
    async (_get, set, newValue: T) => {
      // 2a. Actualiza el átomo base inmediatamente
      set(baseAtom, newValue);

      // 2b. Persiste el nuevo valor en IndexedDB de forma asíncrona
      await saveToIDB(key, newValue);
    }
  );

  // Forzamos el tipo al Atom de lectura/escritura (T es el tipo que exponemos)
  return idbAtom as WritableAtom<T, [T], Promise<void>>;
};
