// frontend/src/components/events/CertificateDesigner.tsx
import React, { useState, useRef, useEffect } from 'react';
import { SingleFileUpload } from '../ui/SingleFileUpload'; // <--- O teu componente padrão
import { FilePurpose } from '../../types/file';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Save, RefreshCw } from 'lucide-react';
import { CertificateConfig } from '../../types/event';

interface Props {
  eventId: string;
  initialConfig?: CertificateConfig;
  onSave: (config: CertificateConfig) => void;
}

const DEFAULT_CONFIG: CertificateConfig = {
  enabled: false,
  textX: 50,
  textY: 50,
  fontSize: 24,
  fontColor: '#000000',
  fontFamily: 'Helvetica',
  textAlign: 'center'
};

export const CertificateDesigner: React.FC<Props> = ({ eventId, initialConfig, onSave }) => {
  const [config, setConfig] = useState<CertificateConfig>(initialConfig || DEFAULT_CONFIG);
  
  // Atualizar estado se as props mudarem (ex: carregamento inicial)
  useEffect(() => {
    if (initialConfig) setConfig(initialConfig);
  }, [initialConfig]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // --- HANDLERS DO SINGLE FILE UPLOAD ---
  
  const handleImageSuccess = (file: any) => {
    // Quando o upload acaba, atualizamos a configuração com o novo URL e ID
    setConfig(prev => ({
        ...prev,
        backgroundFileId: file.id,
        backgroundUrl: file.url, // O SingleFileUpload devolve o URL completo
        enabled: true
    }));
  };

  const handleImageClear = () => {
    // Se o utilizador apagar a imagem, limpamos a config
    setConfig(prev => ({
        ...prev,
        backgroundFileId: undefined,
        backgroundUrl: undefined,
        enabled: false
    }));
  };

  // --- LÓGICA DE ARRASTAR (CANVAS) ---

  const handleMouseDown = (e: React.MouseEvent) => setIsDragging(true);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Converter para percentagem (0-100) para ser responsivo
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    setConfig(prev => ({
        ...prev,
        textX: Math.max(0, Math.min(100, xPercent)),
        textY: Math.max(0, Math.min(100, yPercent))
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="space-y-6">
      
      {/* 1. UPLOAD DA IMAGEM (Usando o componente padrão) */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
          <Label className="mb-2 block">Modelo de Fundo (A4 Paisagem)</Label>
          <SingleFileUpload 
            ownerType="Event" 
            ownerId={eventId} 
            purpose={FilePurpose.CERTIFICATE_TEMPLATE} // <--- O novo tipo
            currentFileUrl={config.backgroundUrl}
            onUploadSuccess={handleImageSuccess}
            onFileClear={handleImageClear}
          />
      </div>

      {/* 2. ÁREA DE EDIÇÃO (Só aparece se houver imagem) */}
      {config.backgroundUrl && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
              
              <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                     <RefreshCw className="w-4 h-4"/> 
                     Arraste o nome "Nome do Participante" para a linha correta.
                  </p>
                  <Button size="sm" onClick={() => onSave(config)}>
                    <Save className="w-4 h-4 mr-2" /> Guardar Posição e Estilo
                  </Button>
              </div>

              {/* CANVAS */}
              <div className="relative border-2 border-gray-300 rounded-lg shadow-sm bg-gray-100 overflow-hidden select-none w-full"
                   style={{ aspectRatio: '297/210' }} // Ratio A4
                   ref={containerRef}
                   onMouseMove={handleMouseMove}
                   onMouseUp={handleMouseUp}
                   onMouseLeave={handleMouseUp}
              >
                  {/* Imagem de Fundo */}
                  <img src={config.backgroundUrl} alt="Certificate Background" className="w-full h-full object-cover pointer-events-none" />
                  
                  {/* Texto Flutuante (Arrastável) */}
                  <div 
                    className="absolute cursor-move border-2 border-dashed border-blue-500 bg-blue-500/20 px-4 py-2 hover:bg-blue-500/30 whitespace-nowrap text-center"
                    style={{
                        left: `${config.textX}%`,
                        top: `${config.textY}%`,
                        transform: 'translate(-50%, -50%)', 
                        fontSize: `${Math.max(12, config.fontSize / 1.5)}px`, 
                        color: config.fontColor,
                        fontFamily: config.fontFamily === 'Times-Roman' ? 'serif' : config.fontFamily === 'Courier' ? 'monospace' : 'sans-serif',
                        textAlign: config.textAlign as any,
                        width: config.maxWidth ? `${config.maxWidth}px` : 'auto'
                    }}
                    onMouseDown={handleMouseDown}
                  >
                      Nome do Participante
                  </div>
              </div>

              {/* 3. CONTROLOS DE ESTILO */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-md border">
                 <div className="space-y-1">
                    <Label className="text-xs">Tamanho (pt)</Label>
                    <Input type="number" value={config.fontSize} onChange={e => setConfig({...config, fontSize: Number(e.target.value)})} />
                 </div>
                 <div className="space-y-1">
                    <Label className="text-xs">Cor</Label>
                    <div className="flex gap-2">
                        <Input type="color" value={config.fontColor} onChange={e => setConfig({...config, fontColor: e.target.value})} className="w-10 p-0 border-0 h-9" />
                        <Input value={config.fontColor} onChange={e => setConfig({...config, fontColor: e.target.value})} className="flex-1" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <Label className="text-xs">Tipo de Letra</Label>
                    <Select value={config.fontFamily} onValueChange={(v) => setConfig({...config, fontFamily: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Helvetica">Helvetica (Sans)</SelectItem>
                            <SelectItem value="Times-Roman">Times New Roman (Serif)</SelectItem>
                            <SelectItem value="Courier">Courier (Mono)</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-1">
                    <Label className="text-xs">Alinhamento</Label>
                    <Select value={config.textAlign} onValueChange={(v) => setConfig({...config, textAlign: v as any})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="left">Esquerda</SelectItem>
                            <SelectItem value="center">Centro</SelectItem>
                            <SelectItem value="right">Direita</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
              </div>
          </div>
      )}
    </div>
  );
};