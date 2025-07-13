import Dexie, { type EntityTable } from 'dexie';

interface ApiKey {
  id: string;
  family: string;
  model: string;
  apiKey: string;
  isDefault: boolean;
}

const db = new Dexie('SubIa') as Dexie & {
  apiKey: EntityTable<
  ApiKey,
    'id' // primary key "id" (for the typings only)
  >;
};

// Schema declaration:
db.version(1).stores({
  apiKey: 'id, model, apiKey' // primary key "id" (for the runtime!)
});

export type { ApiKey };
export { db };