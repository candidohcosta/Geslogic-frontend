import qz from 'qz-tray';
import { fetchPrintCertificate, fetchPrintSignature } from '../services/api';
import SHA256 from 'crypto-js/sha256';
import Hex from 'crypto-js/enc-hex';

// --- CONFIGURAÇÃO DE HASH ---
qz.api.setSha256Type(function(data: any) {
    return new Promise((resolve, reject) => {
        try {
            const hash = SHA256(data).toString(Hex);
            resolve(hash);
        } catch (e) { reject(e); }
    });
});

let isSecurityConfigured = false;

const ensureSecurityConfig = () => {
    if (isSecurityConfigured) return;

    qz.security.setCertificatePromise(function(resolve: any, reject: any) {
        fetchPrintCertificate().then(data => resolve(data.certificate)).catch(reject);
    });

    qz.security.setSignaturePromise(function(toSign: string) {
        return function(resolve: any, reject: any) {
            fetchPrintSignature(toSign).then(data => resolve(data.signature)).catch(reject);
        };
    });

    isSecurityConfigured = true;
};

export const QzService = {
    // Agora aceita um 'host' opcional (default: localhost)
    connectAndListPrinters: async (host: string = 'localhost'): Promise<string[]> => {
        ensureSecurityConfig();

        // Delay de segurança
        await new Promise(r => setTimeout(r, 100));

        // Se já estiver conectado, mas o host for diferente, desconectar
        // (Nota: o QZ não expõe facilmente o host atual, por isso simplificamos:
        // se já está ativo, assumimos que está bem, senão reconectamos)
        if (!qz.websocket.isActive()) {
             console.log(`QZ Service: A conectar a ${host}...`);
             await qz.websocket.connect({ 
                host: host, // <--- USA O IP AQUI
                retries: 0, 
                delay: 0,
                usingSecure: false 
            });
        }

        console.log("QZ Service: A listar...");
        return await qz.printers.find();
    },

    printHTML: async (printerName: string, htmlContent: string, host: string = 'localhost') => {
        // Se não estiver ativo, conecta ao host específico
        if (!qz.websocket.isActive()) {
             await QzService.connectAndListPrinters(host);
        }

        const config = qz.configs.create(printerName, { 
            scaleContent: true, 
            size: { width: 80, height: 297 }, 
            units: 'mm'
        });

        const data = [{
            type: 'html',
            format: 'plain',
            data: `<html><body style="margin:0; font-family: monospace;">${htmlContent}</body></html>`
        }];

        await qz.print(config, data);
    }
};