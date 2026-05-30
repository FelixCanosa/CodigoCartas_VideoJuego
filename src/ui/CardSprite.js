// ============================================================
//  CardSprite.js — Sprite interactivo de carta en Phaser
//  Usado en la GameScene para drag & drop y animaciones
// ============================================================
import Phaser from 'phaser';

const CARD_W = 100;
const CARD_H = 140;

export class CardSprite extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {import('../classes/Card.js').Card} card
   * @param {object} options
   */
  constructor(scene, x, y, card, options = {}) {
    super(scene, x, y);
    this.scene       = scene;
    this.card        = card;
    this.isFaceDown  = options.faceDown  ?? false;
    this.isDraggable = options.draggable ?? false;
    this.isBot       = options.isBot     ?? false;

    this._originX    = x;
    this._originY    = y;
    this._selected   = false;

    this._build();

    if (this.isDraggable && !this.isFaceDown) {
      this._setupDrag();
    }

    scene.add.existing(this);
  }

  // ─── Construcción visual ─────────────────────────────────
  _build() {
    this.removeAll(true);

    const card  = this.card;
    const color = card.color ?? 0x444466;

    // Sombra
    const shadow = this.scene.add.graphics();
    shadow.fillStyle(0x000000, 0.4);
    shadow.fillRoundedRect(-CARD_W / 2 + 4, -CARD_H / 2 + 4, CARD_W, CARD_H, 10);
    this.add(shadow);

    if (this.isFaceDown) {
      this._buildBack();
    } else {
      this._buildFront(card, color);
    }

    this.setSize(CARD_W, CARD_H);
  }

  _buildFront(card, color) {
    // Marco exterior
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x16161e, 1);
    bg.lineStyle(2, color, 1);
    bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
    bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);

    // Franja de color de clase (cabecera)
    const header = this.scene.add.graphics();
    header.fillStyle(color, 0.5);
    header.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, 24, 10);

    // Badge tipo (P o H)
    const typeColor = card.cardType === 'P' ? '#f5a623' : '#4fc3f7';
    const typeBadge = this.scene.add.text(-CARD_W / 2 + 5, -CARD_H / 2 + 4, card.cardType, {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '9px', fontStyle: 'bold',
      fill: typeColor,
      backgroundColor: '#000000bb',
      padding: { x: 3, y: 2 },
    });

    // Nombre
    const nameText = this.scene.add.text(0, -CARD_H / 2 + 28, card.name, {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '7px', fontStyle: 'bold',
      fill: '#ffffff', align: 'center',
      wordWrap: { width: CARD_W - 8 },
    }).setOrigin(0.5, 0);

    // Área central (imagen futura o placeholder)
    const imgArea = this.scene.add.graphics();
    imgArea.fillStyle(color, 0.1);
    imgArea.fillRect(-CARD_W / 2 + 6, -CARD_H / 2 + 50, CARD_W - 12, 42);

    // Símbolo de clase
    const classSymbol = this._getClassSymbol(card.class);
    const classIcon = this.scene.add.text(0, -CARD_H / 2 + 71, classSymbol, {
      fontSize: '24px', fill: '#' + color.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    // Daño
    if (card.damage > 0) {
      const dmgBg = this.scene.add.graphics();
      dmgBg.fillStyle(0x3d1414, 1);
      dmgBg.fillRoundedRect(CARD_W / 2 - 28, CARD_H / 2 - 22, 26, 18, 4);
      const dmgTxt = this.scene.add.text(CARD_W / 2 - 15, CARD_H / 2 - 13, `${card.damage}`, {
        fontFamily: 'Orbitron, sans-serif', fontSize: '10px',
        fontStyle: 'bold', fill: '#ff6b6b',
      }).setOrigin(0.5);
      this.add([dmgBg, dmgTxt]);
    }

    // Curación
    if (card.heal > 0) {
      const healBg = this.scene.add.graphics();
      healBg.fillStyle(0x143d1e, 1);
      healBg.fillRoundedRect(-CARD_W / 2 + 2, CARD_H / 2 - 22, 26, 18, 4);
      const healTxt = this.scene.add.text(-CARD_W / 2 + 15, CARD_H / 2 - 13, `+${card.heal}`, {
        fontFamily: 'Orbitron, sans-serif', fontSize: '10px',
        fontStyle: 'bold', fill: '#6bff9e',
      }).setOrigin(0.5);
      this.add([healBg, healTxt]);
    }

    // Descripción
    const descText = this.scene.add.text(0, CARD_H / 2 - 36, card.description.slice(0, 55) + (card.description.length > 55 ? '…' : ''), {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize: '6px', fill: '#8888aa', align: 'center',
      wordWrap: { width: CARD_W - 10 },
    }).setOrigin(0.5, 1);

    // Brillo superior
    const shine = this.scene.add.graphics();
    shine.fillStyle(0xffffff, 0.04);
    shine.fillRoundedRect(-CARD_W / 2 + 2, -CARD_H / 2 + 2, CARD_W - 4, CARD_H / 2, 10);

    this._bg = bg;
    this.add([bg, header, imgArea, shine, typeBadge, nameText, classIcon, descText]);
  }

  _buildBack() {
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0f0f22, 1);
    bg.lineStyle(2, 0x3a2a6a, 1);
    bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
    bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);

    // Patrón de puntos
    const pattern = this.scene.add.graphics();
    pattern.fillStyle(0x4a3a8a, 0.3);
    for (let px = -40; px < 50; px += 14) {
      for (let py = -60; py < 70; py += 14) {
        pattern.fillCircle(px, py, 2);
      }
    }

    const label = this.scene.add.text(0, 0, '?', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '40px', fontStyle: 'bold',
      fill: '#3a2a6a',
    }).setOrigin(0.5);

    this._bg = bg;
    this.add([bg, pattern, label]);
  }

  _getClassSymbol(cls) {
    const symbols = {
      guerrero: '⚔',
      mago: '✦',
      spyware: '◈',
      invocador: '★',
      dracodificador: '◎',
    };
    return symbols[cls] || '●';
  }

  // ─── Drag & Drop ─────────────────────────────────────────
  _setupDrag() {
    this.setInteractive({ useHandCursor: true });
    this.scene.input.setDraggable(this);

    this.on('pointerover', () => {
      if (!this._selected) {
        this.scene.tweens.add({ targets: this, y: this.y - 10, scaleX: 1.05, scaleY: 1.05, duration: 120 });
      }
    });
    this.on('pointerout', () => {
      if (!this._selected && !this._dragging) {
        this.scene.tweens.add({ targets: this, y: this._originY, scaleX: 1, scaleY: 1, duration: 120 });
      }
    });

    this.on('dragstart', () => {
      this._dragging = true;
      this.scene.tweens.add({ targets: this, scaleX: 1.1, scaleY: 1.1, duration: 100 });
      this.setDepth(100);
    });

    this.on('drag', (pointer, dragX, dragY) => {
      this.x = dragX;
      this.y = dragY;
    });

    this.on('dragend', (pointer, dropped) => {
      this._dragging = false;
      this.setDepth(1);
      if (!dropped) {
        // Volver al origen
        this.scene.tweens.add({
          targets: this, x: this._originX, y: this._originY,
          scaleX: 1, scaleY: 1, duration: 200, ease: 'Power2',
        });
      }
    });
  }

  // ─── Animación flip (face-down → face-up) ────────────────
  flip(onComplete) {
    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      duration: 180,
      ease: 'Power2.easeIn',
      onComplete: () => {
        this.isFaceDown = false;
        this._build();
        this.scene.tweens.add({
          targets: this,
          scaleX: 1,
          duration: 180,
          ease: 'Power2.easeOut',
          onComplete,
        });
      },
    });
  }

  // ─── Animación de daño ───────────────────────────────────
  showDamage(amount, color = '#ff4444') {
    const dmgText = this.scene.add.text(this.x, this.y - 40, `-${amount}`, {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '22px', fontStyle: 'bold',
      fill: color, stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(200);

    this.scene.tweens.add({
      targets: dmgText,
      y: this.y - 90,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => dmgText.destroy(),
    });

    // Flash rojo
    this.scene.tweens.add({
      targets: this,
      tint: 0xff2222,
      duration: 120,
      yoyo: true,
      repeat: 2,
    });
  }

  // ─── Animación de curación ────────────────────────────────
  showHeal(amount) {
    this.showDamage(amount, '#44ff88');
  }

  // ─── Selección ───────────────────────────────────────────
  setSelected(val) {
    this._selected = val;
    if (this._bg) {
      if (val) {
        this._bg.lineStyle(3, 0xffd700, 1);
      } else {
        this._bg.lineStyle(2, this.card.color, 1);
      }
    }
  }

  // ─── Actualizar posición origen ──────────────────────────
  setOrigin2D(x, y) {
    this._originX = x;
    this._originY = y;
  }
}
