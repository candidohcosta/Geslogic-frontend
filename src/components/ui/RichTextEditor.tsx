// src/components/ui/RichTextEditor.tsx (VERSÃO FINAL E COMPLETA)

import React, { useMemo, useRef } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import ImageResize from 'quill-image-resize-module-react';
import { uploadFile } from '../../services/api';

Quill.register('modules/imageResize', ImageResize);

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  // NOVAS PROPS para o contexto do upload
  uploadOwner?: {
    ownerType: string;
    ownerId: string;
    purpose: any; // O enum FilePurpose
  };
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, readOnly = false, uploadOwner }) => {
  const quillRef = useRef<ReactQuill>(null);

const imageHandler = () => {
  if (!uploadOwner) {
    alert("A funcionalidade de upload não está configurada.");
    return;
  }

  const input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('accept', 'image/*');
  input.click();

  input.onchange = async () => {
    if (input.files) {
      const file = input.files[0];
      try {
        // AQUI ESTÁ A MUDANÇA: Usamos a nossa função centralizada
        const data = await uploadFile({
          file: file,
          ownerType: uploadOwner.ownerType,
          ownerId: uploadOwner.ownerId,
          purpose: uploadOwner.purpose,
        });
        
        const imageUrl = data.file.url;

        const quill = quillRef.current?.getEditor();
        if (quill) {
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, 'image', imageUrl);
        }
      } catch (error) {
        console.error("Image upload error:", error);
        alert(`Ocorreu um erro: ${(error as Error).message}`);
      }
    }
  };
};

  // Memoizamos os 'modules' para evitar que sejam recriados em cada renderização
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{'list': 'ordered'}, {'list': 'bullet'}],
        [{ 'color': [] }, { 'background': [] }],
        ['link', 'image'], // O botão 'image' vai agora usar o nosso handler
        ['clean']
      ],
      handlers: {
        'image': imageHandler, // AQUI ESTÁ A LIGAÇÃO
      }
    },
    imageResize: {
      parchment: Quill.import('parchment'),
      modules: ['Resize', 'DisplaySize'] // Ativa os módulos de redimensionar e mostrar o tamanho
    }
  }), []);

  return (
    <div className={readOnly ? 'quill-readonly' : ''}>
      <ReactQuill 
        ref={quillRef}
        theme="snow" 
        value={value} 
        onChange={onChange}
        modules={modules}
        readOnly={readOnly}
      />
    </div>
  );
};

export default RichTextEditor;