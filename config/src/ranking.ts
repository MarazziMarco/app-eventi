/**
 * Parametri di ranking e del filtro adattivo.
 * TUTTO qui dentro e' pensato per essere tunato a mano: cambia i numeri,
 * rigira `pnpm validate`, guarda come si muovono i risultati Viterbo vs Roma.
 */

import type { Category, RankingConfig, SelectionConfig } from "@eventi/core";

/* ------------------------------------------------------------------ */
/* hypeScore (0-100)                                                   */
/* ------------------------------------------------------------------ */

/**
 * Pesi dei segnali. La somma dei `weight` definisce il massimo grezzo;
 * lo score finale viene normalizzato a 0-100 (vedi computeHypeScore in core).
 * Ogni segnale e' normalizzato a 0..1 prima di essere moltiplicato per il peso.
 */
export const RANKING_WEIGHTS = {
  /** Capienza del venue: stadio/arena conta molto piu' del piccolo club. */
  capacity: 0.35,
  /** Popolarita' artista (Spotify popularity 0-100). Solo eventi musicali. */
  artistPopularity: 0.25,
  /** Peso della categoria (festival/sport major > generico). */
  category: 0.2,
  /** Domanda: n. di ticket source + sold-out. */
  demand: 0.2,
} as const;

/** capacityTier 0..3 -> contributo normalizzato 0..1. */
export const CAPACITY_TIER_SCORE: Record<0 | 1 | 2 | 3, number> = {
  0: 0.1, // piccolo
  1: 0.4, // medio
  2: 0.7, // grande club / teatro grande
  3: 1.0, // stadio / arena
};

/** Peso per categoria, 0..1. */
export const CATEGORY_WEIGHT: Record<Category, number> = {
  festival: 1.0,
  sport: 0.9,
  concert: 0.8,
  nightlife: 0.6,
  expo: 0.5,
  other: 0.3,
};

/**
 * Blend con externalRank (PredictHQ Local Rank, 0-100) quando presente.
 * finalScore = (1 - EXTERNAL_RANK_BLEND) * hype + EXTERNAL_RANK_BLEND * externalRank
 * 1.0 = override totale di PredictHQ, 0.0 = ignoralo.
 */
export const EXTERNAL_RANK_BLEND = 0.6;

/* ------------------------------------------------------------------ */
/* Filtro adattivo alla densita'                                       */
/* ------------------------------------------------------------------ */

export const SELECTION = {
  /** Se i candidati sono <= di questo, mostra TUTTO (zona a bassa densita'). */
  SHOW_ALL_THRESHOLD: 10,
  /** Percentile da tenere in zona densa (0.30 = top 30%). */
  TOP_PERCENT: 0.3,
  /** Soglia minima assoluta di hype in zona densa. */
  MIN_HYPE: 60,
} as const;

/* ------------------------------------------------------------------ */
/* Oggetti assemblati passati a core (dependency injection)            */
/* core resta puro: non importa da config, riceve questi a parametro.  */
/* ------------------------------------------------------------------ */

export const rankingConfig: RankingConfig = {
  weights: RANKING_WEIGHTS,
  capacityTierScore: CAPACITY_TIER_SCORE,
  categoryWeight: CATEGORY_WEIGHT,
  externalRankBlend: EXTERNAL_RANK_BLEND,
};

export const selectionConfig: SelectionConfig = {
  showAllThreshold: SELECTION.SHOW_ALL_THRESHOLD,
  topPercent: SELECTION.TOP_PERCENT,
  minHype: SELECTION.MIN_HYPE,
};
