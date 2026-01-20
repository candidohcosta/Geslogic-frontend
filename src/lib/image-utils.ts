// frontend/src/lib/image-utils.ts

/**
 * Converte um URL de imagem para Base64 para garantir compatibilidade com PDFs
 */
export const getBase64Image = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Erro ao converter imagem para Base64:", error);
    return null; // Se falhar, o PDF avança sem logo em vez de crashar
  }
};