import {  SubFile } from '@/models'
import { atomWithStorage } from 'jotai/utils'
import { atom } from "jotai";

export const subFileAtom = atomWithStorage<SubFile[]>('files',[
  ])

 export const getSubFileByIdAtom = atom(
    (get) => (id: string) => get(subFileAtom).find((file) => file.id === id)
  );

  export const updateSubFileStateAtom = atom(
    null,
    (get, set, { id, state,splitTranslated }: SubFile) => {
      const currentFiles = get(subFileAtom);
      const updatedFiles = currentFiles.map((file) =>
        file.id === id ? { ...file, state: state,splitTranslated:splitTranslated } : file
      );
  
      set(subFileAtom, updatedFiles);
    }
  );