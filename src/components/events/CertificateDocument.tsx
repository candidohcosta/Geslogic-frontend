// frontend/src/components/events/CertificateDocument.tsx
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { CertificateConfig } from '../../types/event';

// Registar fontes padrão (opcional, mas ajuda na consistência)
// Se quiseres fontes custom, terias de as registar aqui.
// Por defeito o react-pdf suporta Helvetica, Times-Roman, Courier.

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
  },
  background: {
    position: 'absolute',
    minWidth: '100%',
    minHeight: '100%',
    height: '100%',
    width: '100%',
    top: 0,
    left: 0,
    zIndex: -1,
  },
});

interface Props {
  participantName: string;
  config: CertificateConfig;
  backgroundBase64?: string | null;
}

export const CertificateDocument: React.FC<Props> = ({ participantName, config, backgroundBase64 }) => {
  
  // Estilo dinâmico do texto baseado na configuração
  const textStyle = {
    position: 'absolute' as const,
    left: `${config.textX}%`,
    top: `${config.textY}%`,
    // Transformar a percentagem do centro (translate -50%) é difícil em PDF.
    // O react-pdf não suporta 'transform: translate'.
    // TRUQUE: Se o alinhamento for 'center', o left define o centro.
    // Vamos usar textAlign e width para controlar isso.
    fontSize: config.fontSize,
    color: config.fontColor,
    fontFamily: config.fontFamily,
    textAlign: config.textAlign,
    width: config.maxWidth ? config.maxWidth : '100%', // Se não houver max, assume largura total para permitir centrar
    // Se for 'center', temos de compensar o left para centrar na página ou no ponto
    // Simplificação: Vamos assumir que o utilizador arrastou para onde queria o início/centro.
    // Ajuste fino para simular o "transform: translate(-50%, -50%)" do editor web:
    marginTop: -(config.fontSize / 2), 
    marginLeft: config.textAlign === 'center' ? -((config.maxWidth || 500) / 2) : 0, 
  };

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        
        {/* Imagem de Fundo */}
        {backgroundBase64 && (
          <Image 
            src={backgroundBase64} 
            style={styles.background} 
            fixed
          />
        )}

        {/* Nome do Participante */}
        <View style={textStyle}>
          <Text>{participantName}</Text>
        </View>

      </Page>
    </Document>
  );
};