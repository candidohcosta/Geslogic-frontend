export const deepClone = <T,>(obj: T): T =>
  JSON.parse(JSON.stringify(obj));

let __rid = 0;
export const genId = () => `r${Date.now().toString(36)}-${(__rid++).toString(36)}`;

export const recordToList = (rec?: Record<string, any>) => {
  if (!rec) return [];
  return Object.entries(rec).map(([k, r]) => ({
    id: genId(),
    key: k,
    rule: r,
    __collapsed: true,
  }));
};

export const listToRecord = (list: any[]) => {
  const out: Record<string, any> = {};
  list.forEach((it) => (out[it.key] = it.rule));
  return out;
};

export const diffRules = (orig: any, cur: any) => {
  const out: any = {};
  const o = orig ?? {};
  for (const [k, v] of Object.entries(cur)) {
    if (!o[k] || JSON.stringify(o[k]) !== JSON.stringify(v)) {
      out[k] = v;
    }
  }
  return out;
};