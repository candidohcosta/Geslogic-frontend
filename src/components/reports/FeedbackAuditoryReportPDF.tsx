// frontend/src/components/reports/FeedbackAuditoryReportPDF.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Svg, Path, Image } from '@react-pdf/renderer'; // <--- Adicionado Image
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica', color: '#374151' },
  // NOVO CONTAINER DE CABEÇALHO
  headerContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#1e3a8a', 
    paddingBottom: 15 
  },
  logo: { width: 80, height: 'auto' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1e3a8a' },
  meta: { fontSize: 9, color: '#6b7280', marginBottom: 2 },
  
  tableHeader: { 
    flexDirection: 'row', 
    backgroundColor: '#f3f4f6', 
    borderBottomWidth: 1, 
    borderBottomColor: '#e5e7eb',
    padding: 8,
    alignItems: 'center'
  },
  row: { 
    flexDirection: 'row', 
    borderBottomWidth: 0.5, 
    borderBottomColor: '#f3f4f6', 
    padding: 8,
    alignItems: 'center', // Alinhamento vertical central
    minHeight: 35
  },
  
  colTicket: { width: '12%' },
  colService: { width: '18%' },
  colOperator: { width: '20%' },
  colRating: { width: '15%', flexDirection: 'column', alignItems: 'center' }, 
  colComment: { width: '35%' },
  
  ratingText: { fontSize: 7, color: '#6b7280', marginTop: 1 },
  commentText: { fontStyle: 'italic', color: '#4b5563', fontSize: 8 },
  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, fontSize: 8, borderTopWidth: 0.5, borderTopColor: '#e5e7eb', paddingTop: 10, color: '#9ca3af' }
});

// Componente para desenhar uma estrela perfeita via SVG
const StarIcon = ({ fill = '#ca8a04' }) => (
  <Svg width="10" height="10" viewBox="0 0 24 24" style={{ marginHorizontal: 0.5 }}>
    <Path
      fill={fill}
      d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
    />
  </Svg>
);

export const FeedbackAuditoryReportPDF: React.FC<any> = ({ feedbacks, startDate, endDate, companyName, logoBase64 }) => {
  
  const renderRatingStars = (rating: any) => {
    const r = Math.floor(Number(rating)) || 0;
    return (
      <View style={{ alignItems: 'center' }}>
        <View style={{ flexDirection: 'row' }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <StarIcon key={s} fill={s <= r ? '#ca8a04' : '#e5e7eb'} />
          ))}
        </View>
        <Text style={styles.ratingText}>{r} / 5</Text>
      </View>
    );
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* CABEÇALHO ATUALIZADO */}
        <View style={styles.headerContainer}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Relatório de Satisfação de Utentes</Text>
            <Text style={styles.meta}>Empresa: {companyName}</Text>
            <Text style={styles.meta}>Período: {startDate} a {endDate}</Text>
            <Text style={styles.meta}>Total de Avaliações: {feedbacks?.length || 0}</Text>
          </View>
          {logoBase64 && <Image src={logoBase64} style={styles.logo} />}
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.colTicket, { fontWeight: 'bold' }]}>Senha</Text>
          <Text style={[styles.colService, { fontWeight: 'bold' }]}>Serviço</Text>
          <Text style={[styles.colOperator, { fontWeight: 'bold' }]}>Operador</Text>
          <Text style={[styles.colRating, { fontWeight: 'bold', textAlign: 'center' }]}>Avaliação</Text>
          <Text style={[styles.colComment, { fontWeight: 'bold' }]}>Comentário</Text>
        </View>

        {feedbacks && feedbacks.length > 0 ? feedbacks.map((f: any, i: number) => (
          <View key={i} style={styles.row} wrap={false}>
            <Text style={styles.colTicket}>{f.ticket?.ticketNumber || 'N/A'}</Text>
            <Text style={styles.colService}>{f.ticket?.service?.name || '---'}</Text>
            <Text style={styles.colOperator}>
              {f.ticket?.operator ? `${f.ticket.operator.firstName} ${f.ticket.operator.lastName}` : 'N/A'}
            </Text>
            
            <View style={styles.colRating}>
                {renderRatingStars(f.rating)}
            </View>

            <Text style={[styles.colComment, styles.commentText]}>
              {f.comment ? `"${f.comment}"` : '---'}
            </Text>
          </View>
        )) : (
          <Text style={{ textAlign: 'center', marginTop: 20, color: '#9ca3af' }}>Nenhum registo encontrado.</Text>
        )}

        <View style={styles.footer}>
          <Text>GesLogic Platform - Gerado em {format(new Date(), 'dd/MM/yyyy HH:mm')}</Text>
          <Text style={{ textAlign: 'right', marginTop: -8 }} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};