// frontend/src/components/reports/OperatorReportPDF.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'; // <--- Adicionado Image
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#374151' },
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
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: { flex: 1, padding: 8, borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'solid', textAlign: 'center' },
  statLabel: { fontSize: 7, color: '#6b7280', marginBottom: 2 },
  statValue: { fontSize: 12, fontWeight: 'bold' },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginTop: 15, marginBottom: 8, backgroundColor: '#f3f4f6', padding: 4 },
  commentRow: { padding: 6, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb', borderBottomStyle: 'solid' },
  commentText: { fontStyle: 'italic', marginTop: 2 },
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, fontSize: 8, borderTopWidth: 0.5, borderTopColor: '#9ca3af', borderTopStyle: 'solid', paddingTop: 5, color: '#9ca3af' }
});

export const OperatorReportPDF: React.FC<any> = ({ operatorName, startDate, endDate, stats, comments, logoBase64 }) => {
  const renderStars = (rating: any) => {
    const r = Math.floor(Number(rating)) || 0;
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerContainer}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Relatório de Performance - GesLogic</Text>
            <Text>Operador: {operatorName || 'N/A'}</Text>
            <Text>Período: {startDate} a {endDate}</Text>
          </View>
          {logoBase64 && <Image src={logoBase64} style={styles.logo} />}
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>ATENDIMENTOS</Text>
            <Text style={styles.statValue}>{stats?.total || 0}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TEMPO MÉDIO</Text>
            <Text style={styles.statValue}>{stats?.avgTime || '0:00'}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>AVALIAÇÃO</Text>
            <Text style={styles.statValue}>{stats?.avgRating || '0.0'} / 5</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Comentários dos Utentes</Text>
        {comments && comments.length > 0 ? comments.map((c: any, i: number) => (
          <View key={i} style={styles.commentRow} wrap={false}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: 'bold' }}>Senha: {c.ticket?.ticketNumber || 'N/A'}</Text>
              <Text style={{ color: '#ca8a04' }}>{renderStars(c.rating)}</Text>
            </View>
            <Text style={styles.commentText}>"{c.comment || 'Sem comentário.'}"</Text>
          </View>
        )) : <Text style={{ color: '#9ca3af', marginTop: 10 }}>Sem comentários registados.</Text>}

        <View style={styles.footer}>
          <Text>GesLogic Platform - Gerado em {format(new Date(), 'dd/MM/yyyy HH:mm')}</Text>
        </View>
      </Page>
    </Document>
  );
};