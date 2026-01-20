// frontend/src/components/reports/CompanyGlobalReportPDF.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Svg, Path } from '@react-pdf/renderer';
import { format } from 'date-fns';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica', color: '#374151' },
  header: { marginBottom: 25, borderBottomWidth: 2, borderBottomColor: '#1e3a8a', paddingBottom: 15 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1e3a8a', marginBottom: 5 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#1e3a8a', paddingBottom: 15 },
  logo: { width: 80, height: 'auto' },
  meta: { fontSize: 10, color: '#6b7280' },
  
  // Grid de KPIs principais
  kpiContainer: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  kpiBox: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, textAlign: 'center' },
  kpiLabel: { fontSize: 7, fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 5 },
  kpiValue: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  kpiValueRed: { fontSize: 18, fontWeight: 'bold', color: '#dc2626' },

  // Tabelas
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#1e3a8a', marginBottom: 10, marginTop: 15, borderLeftWidth: 3, borderLeftColor: '#1e3a8a', paddingLeft: 8 },
  table: { width: 'auto', marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', padding: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6', padding: 8, alignItems: 'center' },
  tableColHeader: { fontWeight: 'bold', color: '#4b5563' },
  tableCol: { color: '#374151' },

  // Estrelas
  starRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  ratingNum: { fontSize: 7, color: '#9ca3af', marginTop: 2 },

  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#9ca3af' }
});

const StarIcon = ({ fill = '#ca8a04' }) => (
  <Svg width="8" height="8" viewBox="0 0 24 24">
    <Path fill={fill} d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  </Svg>
);

export const CompanyGlobalReportPDF: React.FC<any> = ({ companyName, startDate, endDate, stats, logoBase64  }) => {
  
  const formatTime = (seconds: any) => {
    const s = Number(seconds) || 0;
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}m`;
  };

  const renderRating = (rating: any) => {
    const r = Math.floor(Number(rating)) || 0;
    return (
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((s) => (
          <StarIcon key={s} fill={s <= r ? '#ca8a04' : '#e5e7eb'} />
        ))}
      </View>
    );
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
{/*             <View style={styles.header}> */}
            <View style={{ flex: 1 }}>
                <Text style={styles.title}>Relatório Executivo de Atendimento</Text>
                <Text style={styles.meta}>Empresa: {companyName}</Text>
                <Text style={styles.meta}>Período: {startDate} a {endDate}</Text>
            </View>
        {/* SÓ MOSTRA O LOGO SE O BASE64 EXISTIR */}
        {logoBase64 && <Image src={logoBase64} style={styles.logo} />}
      </View>

        {/* KPIs Resumo */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total Emitido</Text>
            <Text style={styles.kpiValue}>{stats.summary.total}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Atendidos</Text>
            <Text style={styles.kpiValue}>{stats.summary.completed}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Taxa de Perda</Text>
            <Text style={styles.kpiValueRed}>{stats.summary.abandonmentRate}</Text>
          </View>
        </View>

        {/* Tabela de Serviços */}
        <Text style={styles.sectionTitle}>Performance por Serviço</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableColHeader, { width: '40%' }]}>Serviço</Text>
            <Text style={[styles.tableColHeader, { width: '20%', textAlign: 'center' }]}>Total</Text>
            <Text style={[styles.tableColHeader, { width: '20%', textAlign: 'center' }]}>Concluídos</Text>
            <Text style={[styles.tableColHeader, { width: '20%', textAlign: 'center' }]}>Média Espera</Text>
          </View>
          {stats.byService.map((s: any, i: number) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCol, { width: '40%', fontWeight: 'bold' }]}>{s.service_name}</Text>
              <Text style={[styles.tableCol, { width: '20%', textAlign: 'center' }]}>{s.total_tickets}</Text>
              <Text style={[styles.tableCol, { width: '20%', textAlign: 'center' }]}>{s.completed_tickets}</Text>
              <Text style={[styles.tableCol, { width: '20%', textAlign: 'center' }]}>{formatTime(s.avg_wait_time)}</Text>
            </View>
          ))}
        </View>

        {/* Tabela de Operadores */}
        <Text style={styles.sectionTitle}>Performance por Operador</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableColHeader, { width: '35%' }]}>Operador</Text>
            <Text style={[styles.tableColHeader, { width: '15%', textAlign: 'center' }]}>Atendidos</Text>
            <Text style={[styles.tableColHeader, { width: '25%', textAlign: 'center' }]}>Tempo Médio</Text>
            <Text style={[styles.tableColHeader, { width: '25%', textAlign: 'center' }]}>Satisfação</Text>
          </View>
          {stats.byOperator.map((op: any, i: number) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCol, { width: '35%' }]}>{op.operator_name}</Text>
              <Text style={[styles.tableCol, { width: '15%', textAlign: 'center' }]}>{op.total_tickets}</Text>
              <Text style={[styles.tableCol, { width: '25%', textAlign: 'center' }]}>{formatTime(op.avg_service_time)}</Text>
              <View style={[styles.tableCol, { width: '25%', alignItems: 'center' }]}>
                {renderRating(op.avg_rating)}
                <Text style={styles.ratingNum}>{op.avg_rating ? parseFloat(op.avg_rating).toFixed(1) : '0.0'}/5</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>GesLogic Platform - Auditoria de Gestão</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};