// ============================================================
//  DeckBuilderScene.js — Constructor de Mazos
//  Reglas: 10 cartas, misma clase, IDs únicos
// ============================================================
import Phaser from 'phaser';
import { ALL_CARDS, CARDS_BY_CLASS, CLASS_NAMES, CLASS_COLORS } from '../data/cards.js';
import { Deck, DECK_SIZE } from '../classes/Deck.js';

const CLASSES = ['guerrero', 'mago', 'spyware', 'invocador', 'dracodificador'];
const CLASS_HEX = {
  guerrero:       0xC0392B,
  mago:           0x8E44AD,
  spyware:        0x27AE60,
  invocador:      0x2980B9,
  dracodificador: 0xE67E22,
};

export class DeckBuilderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DeckBuilderScene' });
    this.selectedClass  = null;
    this.currentDeck    = [];   // array de IDs
    this.catalogCards   = [];   // sprites/containers en pantalla
    this.deckSlots      = [];   // slots visuales del mazo actual
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this._buildBackground(W, H);
    this._buildHeader(W, H);
    this._buildClassFilter(W, H);
    this._buildDeckPanel(W, H);
    this._buildSaveButton(W, H);
    this._buildBackButton(W, H);

    // Cargar mazo guardado si existe
    const saved = localStorage.getItem('playerDeck');
    if (saved) {
      const ids = JSON.parse(saved);
      this.currentDeck = ids;
      const firstCard = ALL_CARDS.find(c => c.id === ids[0]);
      if (firstCard) {
        this.selectedClass = firstCard.class;
        this._renderCatalog(W, H);
        this._updateDeckPanel();
      }
    }

    // Seleccionar primera clase por defecto si no hay guardado
    if (!this.selectedClass) {
      this._selectClass('guerrero', W, H);
    }
  }

  _buildBackground(W, H) {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a14, 0x0a0a14, 0x0e0e22, 0x0e0e22, 1);
    bg.fillRect(0, 0, W, H);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a3e, 0.25);
    for (let x = 0; x < W; x += 50) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 50) grid.lineBetween(0, y, W, y);
  }

  _buildHeader(W, H) {
    this.add.text(W / 2, 30, 'CONSTRUCTOR DE MAZOS', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '26px', fontStyle: 'bold',
      fill: '#ffffff', stroke: '#7f5af0', strokeThickness: 2,
    }).setOrigin(0.5);

    // Contador del mazo
    this.counterText = this.add.text(W - 260, 30, `Cartas: 0 / ${DECK_SIZE}`, {
      fontFamily: 'Orbitron, sans-serif', fontSize: '16px', fill: '#2cb67d',
    }).setOrigin(0.5);
  }

  _buildClassFilter(W, H) {
    this.classBtns = {};
    const btnW = 170;
    const totalW = CLASSES.length * btnW + (CLASSES.length - 1) * 10;
    const startX = (W - totalW) / 2;

    CLASSES.forEach((cls, i) => {
      const x = startX + i * (btnW + 10) + btnW / 2;
      const y = 75;
      const btn = this._makeClassBtn(x, y, CLASS_NAMES[cls], cls, btnW, 36, () => {
        this._selectClass(cls, W, H);
      });
      this.classBtns[cls] = btn;
    });
  }

  _makeClassBtn(x, y, label, cls, w, h, onClick) {
    const color = CLASS_HEX[cls];
    const cont  = this.add.container(x, y);
    const bg    = this.add.graphics();
    bg.fillStyle(0x16161e, 1);
    bg.lineStyle(2, color, 0.5);
    bg.fillRoundedRect(-w/2, -h/2, w, h, 8);
    bg.strokeRoundedRect(-w/2, -h/2, w, h, 8);

    const txt = this.add.text(0, 0, label, {
      fontFamily: 'Orbitron, sans-serif', fontSize: '12px', fontStyle: 'bold',
      fill: '#aaaacc',
    }).setOrigin(0.5);

    cont.add([bg, txt]);
    cont.setSize(w, h);
    cont.setInteractive({ useHandCursor: true });
    cont.on('pointerover', () => { txt.setFill('#ffffff'); });
    cont.on('pointerout', () => { if (this.selectedClass !== cls) txt.setFill('#aaaacc'); });
    cont.on('pointerdown', onClick);
    cont._bg  = bg;
    cont._txt = txt;
    cont._cls = cls;
    return cont;
  }

  _selectClass(cls, W, H) {
    if (this.selectedClass === cls) return;

    // Reset mazo si cambia de clase
    if (this.selectedClass && this.selectedClass !== cls) {
      this.currentDeck = [];
    }

    this.selectedClass = cls;

    // Actualizar estilos de botones de clase
    CLASSES.forEach(c => {
      const btn = this.classBtns[c];
      if (!btn) return;
      const color = CLASS_HEX[c];
      const isSelected = c === cls;
      btn._bg.clear();
      btn._bg.fillStyle(isSelected ? color : 0x16161e, isSelected ? 0.3 : 1);
      btn._bg.lineStyle(2, color, isSelected ? 1 : 0.5);
      btn._bg.fillRoundedRect(-btn.width/2, -btn.height/2, btn.width, btn.height, 8);
      btn._bg.strokeRoundedRect(-btn.width/2, -btn.height/2, btn.width, btn.height, 8);
      btn._txt.setFill(isSelected ? '#ffffff' : '#aaaacc');
    });

    this._renderCatalog(W, H);
    this._updateDeckPanel();
  }

  // ─── Catálogo de cartas ──────────────────────────────────
  _renderCatalog(W, H) {
    // Limpiar catálogo anterior
    this.catalogCards.forEach(c => c.destroy());
    this.catalogCards = [];

    if (!this.selectedClass) return;

    const cards    = CARDS_BY_CLASS[this.selectedClass] || [];
    const CARD_W   = 110;
    const CARD_H   = 150;
    const COLS     = 5;
    const PAD_X    = 18;
    const PAD_Y    = 18;
    const startX   = 60;
    const startY   = 120;

    cards.forEach((cardData, idx) => {
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const x   = startX + col * (CARD_W + PAD_X) + CARD_W / 2;
      const y   = startY + row * (CARD_H + PAD_Y) + CARD_H / 2;

      const sprite = this._makeCardSprite(x, y, cardData, CARD_W, CARD_H);
      this.catalogCards.push(sprite);
    });
  }

  _makeCardSprite(x, y, cardData, w, h) {
    const color     = CLASS_HEX[cardData.class] || 0x444466;
    const isInDeck  = this.currentDeck.includes(cardData.id);
    const container = this.add.container(x, y);

    // Marco
    const bg = this.add.graphics();
    this._drawCardBg(bg, cardData, w, h, isInDeck);

    // Tipo badge
    const typeBadge = this.add.text(-w/2 + 6, -h/2 + 6, cardData.cardType, {
      fontFamily: 'Orbitron, sans-serif', fontSize: '10px', fontStyle: 'bold',
      fill: cardData.cardType === 'P' ? '#f5a623' : '#4fc3f7',
      backgroundColor: '#000000aa',
      padding: { x: 4, y: 2 },
    });

    // Nombre
    const nameText = this.add.text(0, -h/2 + 26, cardData.name, {
      fontFamily: 'Orbitron, sans-serif', fontSize: '8px', fontStyle: 'bold',
      fill: '#ffffff', align: 'center', wordWrap: { width: w - 10 },
    }).setOrigin(0.5, 0);

    // Daño (si tiene)
    const dmgText = cardData.damage > 0
      ? this.add.text(w/2 - 6, h/2 - 16, `⚔ ${cardData.damage}`, {
          fontFamily: '"Share Tech Mono", monospace', fontSize: '10px', fill: '#ff6b6b',
        }).setOrigin(1, 1)
      : null;

    // Curación (si tiene)
    const healText = cardData.heal > 0
      ? this.add.text(-w/2 + 6, h/2 - 16, `♥ ${cardData.heal}`, {
          fontFamily: '"Share Tech Mono", monospace', fontSize: '10px', fill: '#6bff9e',
        }).setOrigin(0, 1)
      : null;

    // Descripción corta
    const descText = this.add.text(0, 10, cardData.description.slice(0, 60) + (cardData.description.length > 60 ? '…' : ''), {
      fontFamily: '"Share Tech Mono", monospace', fontSize: '7px',
      fill: '#9090b0', align: 'center', wordWrap: { width: w - 12 },
    }).setOrigin(0.5, 0);

    const children = [bg, typeBadge, nameText, descText];
    if (dmgText) children.push(dmgText);
    if (healText) children.push(healText);

    container.add(children);
    container.setSize(w, h);
    container.setInteractive({ useHandCursor: true });

    // Overlay "en mazo"
    if (isInDeck) {
      const check = this.add.text(0, -10, '✓ EN MAZO', {
        fontFamily: 'Orbitron, sans-serif', fontSize: '11px', fontStyle: 'bold',
        fill: '#2cb67d',
      }).setOrigin(0.5);
      container.add(check);
      container._checkText = check;
    }

    // Hover
    container.on('pointerover', () => {
      this.tweens.add({ targets: container, scaleX: 1.06, scaleY: 1.06, duration: 80 });
      this._showCardTooltip(cardData, x, y, w, h);
    });
    container.on('pointerout', () => {
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 80 });
      this._hideTooltip();
    });
    container.on('pointerdown', () => {
      this._toggleCardInDeck(cardData, container, w, h);
    });

    container._cardData = cardData;
    container._bg       = bg;
    return container;
  }

  _drawCardBg(bg, cardData, w, h, isInDeck) {
    const color = CLASS_HEX[cardData.class] || 0x444466;
    bg.clear();
    bg.fillStyle(0x16161e, 1);
    bg.lineStyle(2, isInDeck ? color : 0x333355, isInDeck ? 1 : 0.5);
    bg.fillRoundedRect(-w/2, -h/2, w, h, 8);
    bg.strokeRoundedRect(-w/2, -h/2, w, h, 8);
    // Franja superior del color de clase
    bg.fillStyle(color, isInDeck ? 0.4 : 0.15);
    bg.fillRoundedRect(-w/2, -h/2, w, 22, 8);
  }

  _toggleCardInDeck(cardData, container, w, h) {
    const inDeck = this.currentDeck.includes(cardData.id);

    if (inDeck) {
      // Quitar del mazo
      this.currentDeck = this.currentDeck.filter(id => id !== cardData.id);
      if (container._checkText) {
        container._checkText.destroy();
        container._checkText = null;
      }
      this._drawCardBg(container._bg, cardData, w, h, false);
    } else {
      // Agregar al mazo
      if (this.currentDeck.length >= DECK_SIZE) {
        this._flashError(`El mazo ya tiene ${DECK_SIZE} cartas.`);
        return;
      }
      this.currentDeck.push(cardData.id);
      this._drawCardBg(container._bg, cardData, w, h, true);
      const check = this.add.text(0, -10, '✓ EN MAZO', {
        fontFamily: 'Orbitron, sans-serif', fontSize: '11px', fontStyle: 'bold',
        fill: '#2cb67d',
      }).setOrigin(0.5);
      container.add(check);
      container._checkText = check;
    }

    this._updateDeckPanel();
    this.tweens.add({ targets: container, scaleX: 1.12, scaleY: 1.12, duration: 80, yoyo: true });
  }

  // ─── Panel del mazo actual ───────────────────────────────
  _buildDeckPanel(W, H) {
    const PX = W - 250;
    // Fondo del panel
    const panel = this.add.graphics();
    panel.fillStyle(0x0d0d1c, 1);
    panel.lineStyle(1, 0x2a2a4a, 1);
    panel.strokeRoundedRect(PX - 10, 105, 255, H - 165, 10);
    panel.fillRoundedRect(PX - 10, 105, 255, H - 165, 10);

    this.add.text(PX + 105, 120, 'TU MAZO', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '13px', fontStyle: 'bold',
      fill: '#7f5af0',
    }).setOrigin(0.5);

    this.deckListContainer = this.add.container(PX, 140);
  }

  _updateDeckPanel() {
    const DECK_SIZE_REQ = DECK_SIZE;
    // Actualizar contador
    const count = this.currentDeck.length;
    this.counterText.setText(`Cartas: ${count} / ${DECK_SIZE_REQ}`);
    this.counterText.setFill(count === DECK_SIZE_REQ ? '#2cb67d' : count > DECK_SIZE_REQ ? '#e74c3c' : '#f5a623');

    // Limpiar lista
    this.deckListContainer.removeAll(true);

    this.currentDeck.forEach((id, idx) => {
      const cardData = ALL_CARDS.find(c => c.id === id);
      if (!cardData) return;
      const color = CLASS_HEX[cardData.class];
      const y     = idx * 44;

      // Fondo
      const rowBg = this.add.graphics();
      rowBg.fillStyle(color, 0.1);
      rowBg.lineStyle(1, color, 0.3);
      rowBg.fillRoundedRect(0, y, 225, 38, 6);
      rowBg.strokeRoundedRect(0, y, 225, 38, 6);

      // Badge tipo
      const typeTxt = this.add.text(8, y + 5, cardData.cardType, {
        fontFamily: 'Orbitron, sans-serif', fontSize: '9px', fontStyle: 'bold',
        fill: cardData.cardType === 'P' ? '#f5a623' : '#4fc3f7',
        backgroundColor: '#000000aa',
        padding: { x: 3, y: 2 },
      });

      // Nombre
      const nameTxt = this.add.text(36, y + 10, cardData.name, {
        fontFamily: 'Orbitron, sans-serif', fontSize: '9px',
        fill: '#e0e0f0', wordWrap: { width: 160 },
      });

      // Botón quitar
      const removeBtn = this.add.text(215, y + 12, '✕', {
        fontFamily: 'Orbitron, sans-serif', fontSize: '13px', fill: '#e74c3c',
      }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

      removeBtn.on('pointerover', () => removeBtn.setFill('#ff6b6b'));
      removeBtn.on('pointerout',  () => removeBtn.setFill('#e74c3c'));
      removeBtn.on('pointerdown', () => {
        this.currentDeck = this.currentDeck.filter(did => did !== id);
        // Re-render catalogo para actualizar checkmarks
        this._renderCatalog(this.scale.width, this.scale.height);
        this._updateDeckPanel();
      });

      this.deckListContainer.add([rowBg, typeTxt, nameTxt, removeBtn]);
    });
  }

  // ─── Botón Guardar ───────────────────────────────────────
  _buildSaveButton(W, H) {
    const cont = this.add.container(W - 125, H - 48);
    const bg   = this.add.graphics();
    bg.fillStyle(0x2cb67d, 1);
    bg.fillRoundedRect(-100, -22, 200, 44, 10);

    const txt = this.add.text(0, 0, 'GUARDAR MAZO', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '13px', fontStyle: 'bold', fill: '#ffffff',
    }).setOrigin(0.5);

    cont.add([bg, txt]);
    cont.setSize(200, 44);
    cont.setInteractive({ useHandCursor: true });

    cont.on('pointerover', () => {
      bg.clear(); bg.fillStyle(0x1a8055, 1); bg.fillRoundedRect(-100, -22, 200, 44, 10);
      this.tweens.add({ targets: cont, scaleX: 1.04, scaleY: 1.04, duration: 80 });
    });
    cont.on('pointerout', () => {
      bg.clear(); bg.fillStyle(0x2cb67d, 1); bg.fillRoundedRect(-100, -22, 200, 44, 10);
      this.tweens.add({ targets: cont, scaleX: 1, scaleY: 1, duration: 80 });
    });
    cont.on('pointerdown', () => this._saveDeck());
  }

  _saveDeck() {
    const deck = Deck.fromIds(this.currentDeck);
    const { valid, errors } = deck.validate();

    if (!valid) {
      this._flashError(errors.join('\n'));
      return;
    }

    Deck.save(deck);
    this._flashSuccess('¡Mazo guardado correctamente!');
  }

  // ─── Botón Volver ────────────────────────────────────────
  _buildBackButton(W, H) {
    const btn = this.add.text(60, H - 40, '← MENÚ', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '14px', fill: '#7f5af0',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setFill('#cb6ce6'));
    btn.on('pointerout',  () => btn.setFill('#7f5af0'));
    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MenuScene'));
    });
  }

  // ─── Tooltip de carta ────────────────────────────────────
  _showCardTooltip(cardData, x, y, w, h) {
    this._hideTooltip();
    const W = this.scale.width;
    const tx = Math.min(x + w / 2 + 10, W - 220);
    const ty = Math.max(y - 60, 10);

    const bg = this.add.graphics();
    bg.fillStyle(0x12122a, 0.97);
    bg.lineStyle(1, CLASS_HEX[cardData.class], 0.8);
    bg.fillRoundedRect(tx, ty, 210, 110, 8);
    bg.strokeRoundedRect(tx, ty, 210, 110, 8);

    const title = this.add.text(tx + 10, ty + 10, cardData.name, {
      fontFamily: 'Orbitron, sans-serif', fontSize: '10px', fontStyle: 'bold', fill: '#ffffff',
    });
    const desc = this.add.text(tx + 10, ty + 28, cardData.description, {
      fontFamily: '"Share Tech Mono", monospace', fontSize: '8px', fill: '#c0c0d8',
      wordWrap: { width: 190 },
    });

    this._tooltip = { bg, title, desc };
  }

  _hideTooltip() {
    if (this._tooltip) {
      Object.values(this._tooltip).forEach(t => t.destroy());
      this._tooltip = null;
    }
  }

  // ─── Mensajes flash ──────────────────────────────────────
  _flashError(msg) {
    const W = this.scale.width;
    const flash = this.add.text(W / 2, this.scale.height - 100, `⚠ ${msg}`, {
      fontFamily: 'Orbitron, sans-serif', fontSize: '13px', fill: '#e74c3c',
      backgroundColor: '#1a0a0a',
      padding: { x: 12, y: 8 },
    }).setOrigin(0.5);
    this.tweens.add({ targets: flash, alpha: 0, duration: 2500, onComplete: () => flash.destroy() });
  }

  _flashSuccess(msg) {
    const W = this.scale.width;
    const flash = this.add.text(W / 2, this.scale.height - 100, `✓ ${msg}`, {
      fontFamily: 'Orbitron, sans-serif', fontSize: '13px', fill: '#2cb67d',
      backgroundColor: '#0a1a0e',
      padding: { x: 12, y: 8 },
    }).setOrigin(0.5);
    this.tweens.add({ targets: flash, alpha: 0, duration: 2500, onComplete: () => flash.destroy() });
  }
}
