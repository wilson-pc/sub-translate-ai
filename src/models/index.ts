export type STATE='PENDING'|'PROCESSING'|'DONE'|'ERROR'
export interface SubFile {
  id: string;
  original: string;
  split: string[];
  splitTranslated?: string[];
  filename: string;
  state: STATE;
}