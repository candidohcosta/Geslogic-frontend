import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

// Estilos do PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #2563eb',
    paddingBottom: 10,
  },
  companyName: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  eventName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  grid: {
    flexDirection: 'row',
    marginBottom: 20,
    marginTop: 20,
  },
  column: {
    flexDirection: 'column',
    width: '50%',
  },
  label: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 12,
    color: '#000000',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    padding: 20,
    border: '1px dashed #d1d5db',
    borderRadius: 8,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  qrLabel: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: 'Courier',
    color: '#374151',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
    borderTop: '1px solid #e5e7eb',
    paddingTop: 10,
  },
});

interface Props {
  event: any;
  registration: any;
  qrCodeDataUrl: string; // A imagem do QR Code em base64
}

export const EventTicketPDF: React.FC<Props> = ({ event, registration, qrCodeDataUrl }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{event.company?.name || 'GesLogic Eventos'}</Text>
          <Text style={styles.eventName}>{event.name}</Text>
        </View>

        {/* Detalhes do Evento */}
        <View style={styles.grid}>
          <View style={styles.column}>
            <Text style={styles.label}>Data</Text>
            <Text style={styles.value}>
              {format(new Date(event.startDate), "d 'de' MMMM 'de' yyyy", { locale: pt })}
            </Text>
            
            <Text style={styles.label}>Hora</Text>
            <Text style={styles.value}>
              {format(new Date(event.startDate), "HH:mm", { locale: pt })}
            </Text>

            <Text style={styles.label}>Localização</Text>
            <Text style={styles.value}>{event.location}</Text>
          </View>

          <View style={styles.column}>
            <Text style={styles.label}>Participante</Text>
            <Text style={styles.value}>
                {registration.participantDetails.user.firstName} {registration.participantDetails.user.lastName}
            </Text>

            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>
                {registration.participantDetails.user.email}
            </Text>
            
            <Text style={styles.label}>Tipo de Bilhete</Text>
            <Text style={styles.value}>
                {registration.selectedPricingTier?.name || 'Geral'}
            </Text>
          </View>
        </View>

        {/* Área do QR Code */}
        <View style={styles.qrContainer}>
          <Image src={qrCodeDataUrl} style={styles.qrImage} />
          <Text style={styles.qrLabel}>{registration.id.substring(0, 8).toUpperCase()}</Text>
          <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 5 }}>
            Apresente este código à entrada
          </Text>
        </View>

        {/* Rodapé */}
        <View style={styles.footer}>
          <Text>Emitido por GesLogic • ID Único: {registration.id}</Text>
        </View>

      </Page>
    </Document>
  );
};