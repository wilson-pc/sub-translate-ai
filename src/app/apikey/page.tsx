//ciertamente has cuidado bien
"use client";
import Image from "next/image";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { createId } from "@paralleldrive/cuid2";
import { useState } from "react";

interface FormComponentProps {
  isEditing: boolean;
  editData: { family: string; model: string; apiKey: string };
  setEditData: (data: {
    family: string;
    model: string;
    apiKey: string;
  }) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onSaveEdit: () => void;
  onCancel: () => void;
}

const FormComponent = ({
  isEditing,
  editData,
  setEditData,
  onSubmit,
  onSaveEdit,
  onCancel,
}: FormComponentProps) => (
  <form className="space-y-4" onSubmit={isEditing ? undefined : onSubmit}>
    <div>
      <label
        htmlFor="model"
        className="block text-sm font-medium text-gray-700"
      >
        Familia
      </label>
      {isEditing ? (
        <select
          value={editData.family}
          onChange={(e) => setEditData({ ...editData, family: e.target.value })}
          className="mt-1 block w-full p-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-blue-500"
        >
          <option value="openai">Open AI</option>
          <option value="gemini">Gemini</option>
          <option value="deepseek">deepseek</option>
          <option value="kimi">kimi</option>
        </select>
      ) : (
        <select
          id="family"
          name="family"
          required
          className="mt-1 block w-full p-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-blue-500"
        >
          <option value="">Selecciona una opción</option>
          <option value="open-ai">Open AI</option>
          <option value="gemini" selected>
            Gemini
          </option>
          <option value="deepseek">deepseek</option>
          <option value="kimi">kimi</option>
        </select>
      )}
    </div>
    <div>
      <label
        htmlFor="model"
        className="block text-sm font-medium text-gray-700"
      >
        Modelo
      </label>
      <input
        type="text"
        id="model"
        name="model"
        value={isEditing ? editData.model : undefined}
        onChange={
          isEditing
            ? (e) => setEditData({ ...editData, model: e.target.value })
            : undefined
        }
        required
        className="mt-1 block w-full p-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
      />
    </div>
    <div>
      <label
        htmlFor="apiKey"
        className="block text-sm font-medium text-gray-700"
      >
        API Key
      </label>
      <input
        type="text"
        id="apiKey"
        name="apiKey"
        value={isEditing ? editData.apiKey : undefined}
        onChange={
          isEditing
            ? (e) => setEditData({ ...editData, apiKey: e.target.value })
            : undefined
        }
        required
        className="mt-1 block w-full p-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
      />
    </div>

    <div className="flex justify-center w-full">
      {isEditing ? (
        <>
          <button
            type="button"
            className="px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 mr-2"
            onClick={onSaveEdit}
          >
            Guardar
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg text-white bg-gray-600 hover:bg-gray-700"
            onClick={onCancel}
          >
            Cancelar
          </button>
        </>
      ) : (
        <button
          type="submit"
          className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700"
        >
          Guardar
        </button>
      )}
    </div>
  </form>
);

export default function Edit() {
  const apiKeys = useLiveQuery(() => db.apiKey.toArray());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    family: "",
    model: "",
    apiKey: "",
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = {
      family: formData.get("family"),
      model: formData.get("model"),
      apiKey: formData.get("apiKey"),
    };
    const id = createId();
    await db.apiKey.add({
      id,
      model: data.model?.toString() ?? "",
      apiKey: data.apiKey?.toString() ?? "",
      family: data.family?.toString() ?? "",
      isDefault: false,
    });
    (event.target as HTMLFormElement).reset();
  };

  const handleEdit = (file: any) => {
    setEditingId(file.id);
    setEditData({
      family: file.family,
      model: file.model,
      apiKey: file.apiKey,
    });
  };

  const handleSaveEdit = async () => {
    if (editingId) {
      await db.apiKey.update(editingId, {
        family: editData.family,
        model: editData.model,
        apiKey: editData.apiKey,
      });
      setEditingId(null);
      setEditData({ family: "", model: "", apiKey: "" });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({ family: "", model: "", apiKey: "" });
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div>
        <div>configura un modelo</div>
      </div>
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full">
        <div className="flex justify-center w-full">
          <div className="form">
            <FormComponent
              isEditing={!!editingId}
              editData={editData}
              setEditData={setEditData}
              onSubmit={handleSubmit}
              onSaveEdit={handleSaveEdit}
              onCancel={handleCancel}
            />
          </div>
        </div>

        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {apiKeys?.map((file, index) => {
            const isEditing = editingId === file.id;
            return (
              <li className="pb-3 sm:pb-4" key={index}>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center space-x-4 rtl:space-x-reverse">
                    <div className="shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {file.model}
                      </p>
                      <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                        {file.family}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    {file.isDefault === true && (
                      <div className="text-sm text-gray-500">
                        Es Por defecto
                      </div>
                    )}
                    {file.isDefault === false && (
                      <button
                        className="px-4 py-2 rounded-lg text-white bg-yellow-600 hover:bg-yellow-700"
                        onClick={() => {
                          const oldDefault = apiKeys?.find(
                            (apiKey) => apiKey.isDefault === true
                          );
                          if (oldDefault) {
                            db.apiKey.update(oldDefault.id, {
                              isDefault: false,
                            });
                          }
                          db.apiKey.update(file.id, {
                            isDefault: true,
                          });
                          localStorage.setItem("apiKey", file.apiKey ?? "");
                          localStorage.setItem("model", file.model ?? "");
                        }}
                      >
                        Poner por defecto
                      </button>
                    )}

                    {!isEditing && (
                      <>
                        <button
                          className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleEdit(file)}
                        >
                          Editar
                        </button>
                        <button
                          className="px-4 py-2 rounded-lg text-white bg-red-500 hover:bg-red-700"
                          onClick={() => db.apiKey.delete(file.id)}
                        >
                          Borrar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </main>

      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
