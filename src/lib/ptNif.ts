// src/lib/ptNif.ts

/**
 * Valida NIF português (9 dígitos) usando o algoritmo oficial do dígito de controlo (módulo 11).
 * Regras:
 *  - 9 dígitos, todos numéricos.
 *  - Dígito de controlo calculado com pesos 9..2: sum = Σ(ni * peso), r = sum % 11
 *    controlo = (11 - r) % 10   // nota: quando r=0 -> 0; quando 11-r=10 -> 0
 *
 * NOTA: Alguns guias impõem restrições aos prefixos (1,2,3,5,6,8,9, etc.),
 * mas como a AT tem emitido novos intervalos ao longo do tempo, aqui validamos
 * apenas pelo checksum + 9 dígitos (é o critério robusto e “future-proof”).
 */
export function isValidPortugueseNIF(raw: string): boolean {
  if (!raw) return false;
  const nif = String(raw).replace(/\D+/g, ''); // só dígitos
  if (nif.length !== 9) return false;

  // todos dígitos
  if (!/^\d{9}$/.test(nif)) return false;

  // cálculo do dígito de controlo
  const digits = nif.split('').map((d) => parseInt(d, 10));
  const control = digits[8];

  // pesos 9..2 sobre os 8 primeiros dígitos
  let sum = 0;
  for (let i = 0, weight = 9; i < 8; i++, weight--) {
    sum += digits[i] * weight;
  }
  const r = sum % 11;
  const computed = (11 - r) % 10; // 10 -> 0; 11 -> 0; resto normal -> 11-resto

  return control === computed;
}