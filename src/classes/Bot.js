// ============================================================
//  CLASE Bot — Código y Caos (IA básica)
//  Extiende Player con lógica de selección aleatoria de cartas
// ============================================================
import { Player } from './Player.js';

export class Bot extends Player {
  constructor(deck) {
    super('Bot', deck);
    this.isBot = true;
  }

  // ─── Seleccionar carta P ────────────────────────────────
  /**
   * Elige una carta P aleatoria de la mano.
   * Si no tiene P, retorna null (el turno se pierde).
   */
  choosePCard() {
    const pCards = this.hand.filter(c => c.cardType === 'P');
    if (pCards.length === 0) return null;

    // El bot prefiere cartas ofensivas si puede hacerlo
    const offensive = pCards.filter(c => c.isOffensive ? c.isOffensive() : c.subType === 'offensive');
    const pool = offensive.length > 0 ? offensive : pCards;

    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ─── Seleccionar cartas H (hasta 2 slots) ───────────────
  /**
   * Elige hasta 2 cartas H aleatorias de la mano que complementen la P elegida.
   */
  chooseHCards(pCard, maxSlots = 2) {
    const hCards = this.hand.filter(c => c.cardType === 'H');
    if (hCards.length === 0) return [];

    // Mezcla y toma hasta maxSlots
    const shuffled = [...hCards].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(maxSlots, shuffled.length));
  }

  // ─── Decidir turno completo ──────────────────────────────
  /**
   * El bot toma una decisión completa para este turno.
   * Retorna { pCard, hCards } o { skipped: true }.
   */
  decidePlay() {
    const pCard = this.choosePCard();
    if (!pCard) {
      return { skipped: true };
    }

    const hCards = this.chooseHCards(pCard, 2);
    return { pCard, hCards, skipped: false };
  }

  // ─── Ejecutar la decisión ────────────────────────────────
  /**
   * Extrae las cartas elegidas de la mano.
   * Retorna { pCard, hCards } listas para la fase de resolución.
   */
  executePlay() {
    const decision = this.decidePlay();
    if (decision.skipped) {
      this.skippedTurn = true;
      return null;
    }

    // Extraer carta P de la mano
    const pCard = this.playFromHand(decision.pCard.id);

    // Extraer cartas H de la mano
    const hCards = decision.hCards.map(h => this.playFromHand(h.id)).filter(Boolean);

    // Acoplar H a P
    hCards.forEach(h => pCard.attachSpell(h));

    this.chosenPCard  = pCard;
    this.chosenHCards = hCards;

    return { pCard, hCards };
  }
}
