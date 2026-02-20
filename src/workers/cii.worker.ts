/**
 * PERF-040: Web Worker for Country Instability Index (CII) calculation.
 * Offloads multi-country score computation from the main thread.
 */

interface CIIComponentData {
  protestCount: number;
  conflictCount: number;
  militaryFlightCount: number;
  militaryVesselCount: number;
  newsEventCount: number;
  outageCount: number;
  displacementOutflow: number;
  climateStress: number;
  ucdpActive: boolean;
  hapiSeverity: number;
}

interface CIIMessage {
  type: 'calculate';
  id: string;
  countries: Array<{
    code: string;
    name: string;
    data: CIIComponentData;
    previousScore?: number;
  }>;
}

interface CIIScore {
  code: string;
  name: string;
  score: number;
  level: 'low' | 'normal' | 'elevated' | 'high' | 'critical';
  components: {
    unrest: number;
    conflict: number;
    security: number;
    information: number;
  };
}

interface CIIResult {
  type: 'cii-result';
  id: string;
  scores: CIIScore[];
}

function calculateScore(data: CIIComponentData): { score: number; components: CIIScore['components'] } {
  const unrest = Math.min(100, data.protestCount * 5 + data.outageCount * 10);
  const conflict = Math.min(100,
    data.conflictCount * 8 +
    (data.ucdpActive ? 30 : 0) +
    data.hapiSeverity * 10 +
    data.displacementOutflow * 0.01
  );
  const security = Math.min(100,
    data.militaryFlightCount * 3 +
    data.militaryVesselCount * 2 +
    data.climateStress * 5
  );
  const information = Math.min(100, data.newsEventCount * 2);

  const score = Math.round(
    unrest * 0.3 + conflict * 0.35 + security * 0.2 + information * 0.15
  );

  return {
    score: Math.min(100, score),
    components: { unrest, conflict, security, information },
  };
}

function scoreToLevel(score: number): CIIScore['level'] {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'elevated';
  if (score >= 20) return 'normal';
  return 'low';
}

self.onmessage = (event: MessageEvent<CIIMessage>) => {
  const { type, id, countries } = event.data;
  if (type !== 'calculate') return;

  const scores: CIIScore[] = countries.map(country => {
    const { score, components } = calculateScore(country.data);
    return {
      code: country.code,
      name: country.name,
      score,
      level: scoreToLevel(score),
      components,
    };
  });

  const result: CIIResult = { type: 'cii-result', id, scores };
  self.postMessage(result);
};

self.postMessage({ type: 'ready' });
