import React, {
  useMemo,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import ImageResize from 'quill-image-resize-module-react';
import { uploadFile } from '../../services/api';

Quill.register('modules/imageResize', ImageResize);

export interface RichTextEditorHandle {
  /** Insere o texto exatamente na posição atual do cursor (ou no fim, se não houver seleção). */
  insertAtCursor: (text: string) => void;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  uploadOwner?: {
    ownerType: string;
    ownerId: string;
    purpose: any; // O enum FilePurpose
  };
}

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  ({ value, onChange, readOnly = false, uploadOwner }, ref) => {
    const quillRef = useRef<ReactQuill>(null);

    const imageHandler = useCallback(() => {
      if (!uploadOwner) {
        alert('A funcionalidade de upload não está configurada.');
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
            const data = await uploadFile({
              file,
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
            console.error('Image upload error:', error);
            alert(`Ocorreu um erro: ${(error as Error).message}`);
          }
        }
      };
    }, [uploadOwner]);

    // 🔹 Expor API imperativa
    useImperativeHandle(ref, () => ({
      insertAtCursor: (text: string) => {
        const quill = quillRef.current?.getEditor();
        if (!quill) return;

        // Se não houver seleção ativa, insere no fim
        const range = quill.getSelection(true) || {
          index: quill.getLength(),
          length: 0,
        };

        // Foca, insere e reposiciona o cursor após o texto
        quill.focus();
        quill.insertText(range.index, text, 'user');
        quill.setSelection(range.index + text.length, 0, 'user');
      },
    }));

    // Memoizamos os 'modules' para evitar recriações
    const modules = useMemo(
      () => ({
        toolbar: {
          container: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ color: [] }, { background: [] }],
            ['link', 'image'], // O botão 'image' usa o nosso handler
            ['clean'],
          ],
          handlers: {
            image: imageHandler,
          },
        },
        imageResize: {
          parchment: Quill.import('parchment'),
          modules: ['Resize', 'DisplaySize'],
        },
      }),
      [imageHandler]
    );

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
  }
);

export default RichTextEditor;
