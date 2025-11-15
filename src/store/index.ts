import { SubFile } from "@/models";
import { atom } from "jotai";
import { atomWithIndexedDB } from "./atomWithIndexedDB";

export const subFileAtom = atomWithIndexedDB<SubFile[]>("files", []);

export const getSubFileByIdAtom = atom(async (get) => {
  // 1. Await: Espera a que la promesa de subFileAtom se resuelva (cargue de IDB)
  const files = await get(subFileAtom);

  // 2. Retorna la función que busca el archivo en el array resuelto
  return (id: string) => files.find((file) => file.id === id);
});

export const updateSubFileStateAtom = atom(
  null,
  // 1. Haz la función de escritura asíncrona
  async (get, set, { id, state, splitTranslated }: SubFile) => {
    // 2. Espera a que el valor actual de subFileAtom se resuelva (cargue de IndexedDB)
    const currentFiles = await get(subFileAtom);

    // 3. Procede con la lógica de mapeo
    const updatedFiles = currentFiles.map((file) =>
      file.id === id
        ? { ...file, state: state, splitTranslated: splitTranslated }
        : file
    );

    // 4. Establece el nuevo valor en el átomo.
    // Recuerda: set(subFileAtom, updatedFiles) es una operación asíncrona
    // porque tu atomWithIndexedDB se encarga de guardar el valor en IDB.
    await set(subFileAtom, updatedFiles);
  }
);
