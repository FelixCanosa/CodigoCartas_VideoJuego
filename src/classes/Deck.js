// ============================================================
//  CLASE Deck — Código y Caos
//  Reglas: exactamente 10 cartas, IDs únicos, misma clase
// ============================================================
import { Card } from './Card.js';
import { CARDS_BY_ID } from '../data/cards.js';

export const DECK_SIZE = 10;

export class Deck {
  constructor(cardDataArray = []) {
    // cardDataArray: array de objetos de datos de carta (de cards.js)
    this.cards = cardDataArray.map(data => new Card(data));
    this.class = cardDataArray.length > 0 ? cardDataArray[0].class : null;
  }

  // ─── Validación del Deck Builder ────────────────────────
  validate() {
    const errors = [];

    if (this.cards.length !== DECK_SIZE) {
      errors.push(`El mazo debe tener exactamente ${DECK_SIZE} cartas (tiene ${this.cards.length}).`);
    }

    // IDs únicos
    const ids = this.cards.map(c => c.id);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      errors.push('No puede haber cartas repetidas en el mazo.');
    }

    // Misma clase
    const classes = [...new Set(this.cards.map(c => c.class))];
    if (classes.length > 1) {
      errors.push('Todas las cartas deben pertenecer a la misma clase.');
    }

    return { valid: errors.length === 0, errors };
  }

  // ─── Mezclar el mazo ─────────────────────────────────────
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    return this;
  }

  // ─── Robar una carta (extracción definitiva) ─────────────
  draw() {
    if (this.cards.length === 0) return null;
    return this.cards.pop(); // pop = extraer del "tope"
  }

  /** Roba n cartas o las disponibles si hay menos */
  drawMany(n) {
    const drawn = [];
    for (let i = 0; i < n; i++) {
      const c = this.draw();
      if (!c) break;
      drawn.push(c);
    }
    return drawn;
  }

  /** Ver la carta del tope sin extraerla */
  peekTop() {
    return this.cards.length > 0 ? this.cards[this.cards.length - 1] : null;
  }

  /** Poner una carta al fondo del mazo */
  putBottom(card) {
    this.cards.unshift(card);
  }

  get size() {
    return this.cards.length;
  }

  // ─── Crear un Deck desde IDs ──────────────────────────────
  static fromIds(ids) {
    const cardData = ids.map(id => {
      const data = CARDS_BY_ID[id];
      if (!data) throw new Error(`Carta no encontrada: ${id}`);
      return data;
    });
    return new Deck(cardData);
  }

  // ─── Guardar/cargar desde localStorage ───────────────────
  static save(deck, slot = 'playerDeck') {
    const ids = deck.cards.map(c => c.id);
    localStorage.setItem(slot, JSON.stringify(ids));
  }

  static load(slot = 'playerDeck') {
    const raw = localStorage.getItem(slot);
    if (!raw) return null;
    const ids = JSON.parse(raw);
    return Deck.fromIds(ids);
  }

  static hasSaved(slot = 'playerDeck') {
    return !!localStorage.getItem(slot);
  }
}
