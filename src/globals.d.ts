// src/globals.d.ts

import { Quill as QuillType } from 'react-quill-new';

declare global {
  interface Window {
    Quill: typeof QuillType;
  }
}