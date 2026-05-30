// ============================================================
//  CLASE Card — Código y Caos
// ============================================================

export class Card {
  constructor(data) {
    this.id            = data.id;
    this.name          = data.name;
    this.class         = data.class;
    this.cardType      = data.cardType;     // 'P' | 'H' | 'S'
    this.subType       = data.subType;      // 'offensive' | 'defensive' | 'support' | 'special'
    this.damage        = data.damage        ?? 0;
    this.heal          = data.heal          ?? 0;
    this.bonusDamage   = data.bonusDamage   ?? 0;
    this.effect        = data.effect        ?? null;
    this.description   = data.description   ?? '';
    this.image         = data.image         ?? null;
    this.color         = data.color         ?? 0x444444;
    this.highPriority  = data.highPriority  ?? false;

    // Propiedades de persistencia (Invocador / Dracodificador)
    this.persistent       = data.persistent       ?? false;
    this.turnsOnField     = data.turnsOnField      ?? 0;
    this.turnsRemaining   = data.turnsOnField      ?? 0;
    this.taunt            = data.taunt             ?? false;
    this.reflectDamage    = data.reflectDamage     ?? 0;
    this.selfDamage       = data.selfDamage        ?? 0;

    // Dracodificador — Retardo
    this.delay            = data.delay             ?? 0;
    this.currentDelay     = data.delay             ?? 0;
    this.delayReduce      = data.delayReduce       ?? 0;
    this.delayAdd         = data.delayAdd          ?? 0;
    this.bonusDamagePerCouple = data.bonusDamagePerCouple ?? 0;

    // Spyware
    this.maxDamage        = data.maxDamage         ?? null;
    this.damageReducePerCard = data.damageReducePerCard ?? 0;
    this.healPerHacked    = data.healPerHacked      ?? 0;

    // Estado runtime
    this.isHacked         = false;
    this.coupledCards     = []; // cartas H acopladas (solo cartas P)
  }

  /** Devuelve true si esta carta es de tipo Principal */
  isMain() {
    return this.cardType === 'P';
  }

  /** Devuelve true si esta carta es un Hechizo */
  isSpell() {
    return this.cardType === 'H';
  }

  /** Devuelve true si es ofensiva */
  isOffensive() {
    return this.subType === 'offensive';
  }

  /** Devuelve true si es defensiva */
  isDefensive() {
    return this.subType === 'defensive';
  }

  /** Adjunta una carta H a esta carta P */
  attachSpell(hCard) {
    this.coupledCards.push(hCard);
  }

  /** Clona la carta (para el mazo de la sesión) */
  clone() {
    const clone = new Card({ ...this });
    clone.coupledCards = [];
    clone.isHacked = false;
    clone.turnsRemaining = this.turnsOnField;
    clone.currentDelay = this.delay;
    return clone;
  }
}
