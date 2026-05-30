// ============================================================
//  CLASE Player — Código y Caos
// ============================================================

export const MAX_HP     = 200;
export const HAND_LIMIT = 7;
export const DRAW_PER_TURN = 2;

export class Player {
  constructor(name, deck) {
    this.name          = name;
    this.deck          = deck;          // instancia de Deck (ya mezclado)
    this.hp            = MAX_HP;
    this.maxHp         = MAX_HP;
    this.hand          = [];            // cartas en mano
    this.field         = [];            // criaturas persistentes en campo
    this.persistentEffects = [];        // efectos activos (veneno, portales, metamorfosis...)
    this.hackedCards   = [];            // cartas hackeadas por el Spyware
    this.discard       = [];            // pila de descarte
    this.statusEffects = {};            // { poison: {damage:30, turns:3}, block: true, evade: true, ... }

    // Runtime del turno
    this.chosenPCard   = null;
    this.chosenHCards  = [];
    this.skippedTurn   = false;
    this.cetroUsed     = false;         // Mago: ¿cambió de cetro?
  }

  // ─── Verificación de jugabilidad ────────────────────────
  /** Retorna true si el jugador tiene al menos una carta P en mano */
  hasPlayableCard() {
    return this.hand.some(c => c.cardType === 'P');
  }

  // ─── Robo de cartas ──────────────────────────────────────
  /**
   * Roba cartas del mazo hasta el límite de mano o n cartas.
   * Una carta extraída del mazo NO puede estar en la mano simultáneamente.
   */
  drawCards(n = DRAW_PER_TURN) {
    const drawn = [];
    let toDraw = Math.min(n, HAND_LIMIT - this.hand.length);
    for (let i = 0; i < toDraw; i++) {
      const card = this.deck.draw();
      if (!card) break;
      this.hand.push(card);
      drawn.push(card);
    }
    return drawn;
  }

  /** Robar hasta completar la mano (inicio de partida) */
  fillHand(size = 5) {
    return this.drawCards(size);
  }

  // ─── Jugar cartas ────────────────────────────────────────
  /** Remueve la carta de la mano y la retorna */
  playFromHand(cardId) {
    const idx = this.hand.findIndex(c => c.id === cardId);
    if (idx === -1) return null;
    const [card] = this.hand.splice(idx, 1);
    return card;
  }

  // ─── HP ──────────────────────────────────────────────────
  takeDamage(amount) {
    const effective = Math.max(0, amount);
    this.hp = Math.max(0, this.hp - effective);
    return effective;
  }

  heal(amount) {
    const actual = Math.min(amount, this.maxHp - this.hp);
    this.hp = Math.min(this.maxHp, this.hp + actual);
    return actual;
  }

  isDead() {
    return this.hp <= 0;
  }

  // ─── Efectos de estado ───────────────────────────────────
  applyPoison(damage, turns) {
    this.statusEffects.poison = { damage, turns };
  }

  applyBlock(indestructible = false) {
    this.statusEffects.block = { active: true, indestructible };
  }

  removeBlock() {
    delete this.statusEffects.block;
  }

  applyEvade() {
    this.statusEffects.evade = true;
  }

  removeEvade() {
    delete this.statusEffects.evade;
  }

  isBlocking() {
    return !!this.statusEffects.block?.active;
  }

  isEvading() {
    return !!this.statusEffects.evade;
  }

  // ─── Cartas persistentes en campo ─────────────────────────
  addToField(card) {
    this.field.push(card);
  }

  removeFromField(cardId) {
    const idx = this.field.findIndex(c => c.id === cardId);
    if (idx !== -1) this.field.splice(idx, 1);
  }

  getFieldSummons() {
    return this.field.filter(c => c.persistent);
  }

  // ─── Hackeo (Spyware) ────────────────────────────────────
  hackCard(card) {
    card.isHacked = true;
    this.hackedCards.push(card);
  }

  get hackedCount() {
    return this.hackedCards.length;
  }

  // ─── Reset del turno ─────────────────────────────────────
  resetTurn() {
    this.chosenPCard  = null;
    this.chosenHCards = [];
    this.skippedTurn  = false;
    this.cetroUsed    = false;
  }

  // ─── Info de debug ───────────────────────────────────────
  getState() {
    return {
      name: this.name,
      hp: this.hp,
      handSize: this.hand.length,
      deckSize: this.deck.size,
      field: this.field.map(c => c.name),
      statusEffects: this.statusEffects,
      hackedCount: this.hackedCount,
    };
  }
}
