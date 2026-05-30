// ============================================================
//  GameScene.js — Mesa de Juego Principal
//  Fases: DRAW → VERIFY → PLACEMENT → REVEAL → RESOLUTION → CLEANUP
// ============================================================
import Phaser from 'phaser';
import { CardSprite }  from '../ui/CardSprite.js';
import { GameManager, PHASES } from '../classes/GameManager.js';
import { Player }      from '../classes/Player.js';
import { Bot }         from '../classes/Bot.js';
import { Deck }        from '../classes/Deck.js';
import { ALL_CARDS, CARDS_BY_CLASS } from '../data/cards.js';

// ── Layout constants ──────────────────────────────────────
const W = 1280, H = 720;
const CARD_W = 100, CARD_H = 140;

// Zonas del jugador (parte inferior)
const PLAYER_HAND_Y   = H - 90;
const PLAYER_SLOT_P_X = W / 2;
const PLAYER_SLOT_P_Y = H - 290;
const PLAYER_SLOT_H1_X = W / 2 - 115;
const PLAYER_SLOT_H2_X = W / 2 + 115;
const PLAYER_SLOT_H_Y  = H - 290;

// Zonas del bot (parte superior)
const BOT_HAND_Y      = 90;
const BOT_SLOT_P_X    = W / 2;
const BOT_SLOT_P_Y    = H - (H - 290);   // = 290 desde arriba
const BOT_SLOT_H1_X   = W / 2 - 115;
const BOT_SLOT_H2_X   = W / 2 + 115;
const BOT_SLOT_H_Y    = 290;

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.cardSprites        = [];   // todos los sprites
    this.playerHandSprites  = [];
    this.botHandSprites     = [];
    this.playerSlotP        = null; // sprite en slot P del jugador
    this.playerSlotsH       = [null, null];
    this.botSlotP           = null;
    this.botSlotsH          = [null, null];
    this.dropZones          = {};
    this.gm                 = null; // GameManager
    this.phaseText          = null;
    this.logText            = null;
    this.playerHpText       = null;
    this.botHpText          = null;
    this.confirmBtn         = null;
    this.isBusy             = false; // bloquea interacción durante animaciones
  }

  // ─── Datos de entrada ─────────────────────────────────────
  init(data) {
    this._selectedClass = data.playerClass || null;
  }

  // ─── Create ───────────────────────────────────────────────
  create() {
    this._buildBackground();
    this._buildField();
    this._buildDropZones();
    this._buildHPBars();
    this._buildPhaseUI();
    this._buildLogPanel();
    this._buildConfirmButton();
    this._buildMenuButton();
    this._setupDragListeners();
    this._initGame();
  }

  // ─── Fondo ────────────────────────────────────────────────
  _buildBackground() {
    // Fondo base
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a14, 0x0a0a14, 0x0e0e22, 0x0e0e22, 1);
    bg.fillRect(0, 0, W, H);

    // Línea divisoria central
    const divider = this.add.graphics();
    divider.lineStyle(2, 0x2a2a4a, 1);
    divider.lineBetween(0, H / 2, W, H / 2);

    // Resplandor central
    const glow = this.add.graphics();
    glow.fillStyle(0x7f5af0, 0.03);
    glow.fillRect(0, H / 2 - 80, W, 160);

    // Grid
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a3e, 0.15);
    for (let x = 0; x < W; x += 60) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 60) grid.lineBetween(0, y, W, y);

    // Etiquetas de zonas
    this.add.text(20, H / 2 + 15, 'TU CAMPO', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '11px', fill: '#3a3a6a',
    });
    this.add.text(20, H / 2 - 25, 'CAMPO DEL BOT', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '11px', fill: '#3a3a6a',
    });
  }

  // ─── Zonas de campo ──────────────────────────────────────
  _buildField() {
    // Slot P del jugador
    this._drawSlot(PLAYER_SLOT_P_X, PLAYER_SLOT_P_Y, 'PRINCIPAL', 0x7f5af0, 'player-slot-p');

    // Slots H del jugador
    this._drawSlot(PLAYER_SLOT_H1_X, PLAYER_SLOT_H_Y, 'HECHIZO 1', 0x2980B9, 'player-slot-h1');
    this._drawSlot(PLAYER_SLOT_H2_X, PLAYER_SLOT_H_Y, 'HECHIZO 2', 0x2980B9, 'player-slot-h2');

    // Slot P del bot
    this._drawSlot(BOT_SLOT_P_X, BOT_SLOT_P_Y, 'BOT P', 0xe74c3c, 'bot-slot-p');

    // Slots H del bot
    this._drawSlot(BOT_SLOT_H1_X, BOT_SLOT_H_Y, 'BOT H1', 0xe67e22, 'bot-slot-h1');
    this._drawSlot(BOT_SLOT_H2_X, BOT_SLOT_H_Y, 'BOT H2', 0xe67e22, 'bot-slot-h2');

    // Indicador de mazo del jugador
    this.playerDeckIcon = this._buildDeckIcon(80, PLAYER_SLOT_P_Y, 'Tu\nMazo');
    // Indicador de mazo del bot
    this.botDeckIcon = this._buildDeckIcon(80, BOT_SLOT_P_Y, 'Bot\nMazo');

    // Contadores de cartas hackeadas
    this.hackedCount = this.add.text(W / 2, H / 2, '', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '12px', fill: '#27AE60',
    }).setOrigin(0.5).setVisible(false);
  }

  _drawSlot(x, y, label, color, id) {
    const g = this.add.graphics();
    g.lineStyle(2, color, 0.4);
    g.strokeRoundedRect(x - CARD_W / 2 - 4, y - CARD_H / 2 - 4, CARD_W + 8, CARD_H + 8, 12);
    g.fillStyle(color, 0.04);
    g.fillRoundedRect(x - CARD_W / 2 - 4, y - CARD_H / 2 - 4, CARD_W + 8, CARD_H + 8, 12);

    this.add.text(x, y - CARD_H / 2 - 16, label, {
      fontFamily: 'Orbitron, sans-serif', fontSize: '9px', fill: '#' + color.toString(16).padStart(6, '0') + '99',
    }).setOrigin(0.5);
  }

  _buildDeckIcon(x, y, label) {
    const g = this.add.graphics();
    g.fillStyle(0x2a2a4a, 1);
    g.lineStyle(1, 0x4a4a7a, 1);
    g.fillRoundedRect(x - 30, y - 40, 60, 80, 6);
    g.strokeRoundedRect(x - 30, y - 40, 60, 80, 6);

    const lbl = this.add.text(x, y - 10, label, {
      fontFamily: 'Orbitron, sans-serif', fontSize: '8px', fill: '#7f5af0', align: 'center',
    }).setOrigin(0.5);

    const counter = this.add.text(x, y + 20, '10', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '16px', fontStyle: 'bold', fill: '#ffffff',
    }).setOrigin(0.5);

    return { g, counter };
  }

  // ─── Drop Zones (Phaser) ──────────────────────────────────
  _buildDropZones() {
    // Crear las zonas de drop para las cartas del jugador
    const zones = [
      { key: 'player-slot-p',  x: PLAYER_SLOT_P_X,  y: PLAYER_SLOT_P_Y,  type: 'P', idx: 0 },
      { key: 'player-slot-h1', x: PLAYER_SLOT_H1_X, y: PLAYER_SLOT_H_Y,  type: 'H', idx: 0 },
      { key: 'player-slot-h2', x: PLAYER_SLOT_H2_X, y: PLAYER_SLOT_H_Y,  type: 'H', idx: 1 },
    ];

    zones.forEach(z => {
      const zone = this.add.zone(z.x, z.y, CARD_W + 10, CARD_H + 10).setRectangleDropZone(CARD_W + 10, CARD_H + 10);
      zone._slotType = z.type;
      zone._slotIdx  = z.idx;
      zone._key      = z.key;
      this.dropZones[z.key] = zone;
    });
  }

  // ─── HP Bars ──────────────────────────────────────────────
  _buildHPBars() {
    const BAR_W = 220;

    // ── Jugador HP (franja inferior) ──────────────────────
    // Fondo de franja
    const playerStrip = this.add.graphics();
    playerStrip.fillStyle(0x0a0a18, 0.85);
    playerStrip.fillRect(0, H - 52, 700, 52);

    this.add.text(14, H - 38, 'TU HP', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '11px',
      fontStyle: 'bold', fill: '#7f5af0',
    });

    this.playerHpBar = this._makeHpBar(70, H - 42, BAR_W, 0x2cb67d);

    this.playerHpText = this.add.text(300, H - 38, '200 / 200', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '12px',
      fontStyle: 'bold', fill: '#2cb67d',
    });

    this.playerEffectText = this.add.text(14, H - 18, '', {
      fontFamily: '"Share Tech Mono", monospace', fontSize: '10px', fill: '#f5a623',
    });

    // ── Bot HP (franja superior) ───────────────────────────
    const botStrip = this.add.graphics();
    botStrip.fillStyle(0x0a0a18, 0.85);
    botStrip.fillRect(0, 0, 700, 52);

    this.add.text(14, 10, 'BOT HP', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '11px',
      fontStyle: 'bold', fill: '#e74c3c',
    });

    this.botHpBar = this._makeHpBar(70, 6, BAR_W, 0xe74c3c);

    this.botHpText = this.add.text(300, 10, '200 / 200', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '12px',
      fontStyle: 'bold', fill: '#e74c3c',
    });

    this.botEffectText = this.add.text(14, 30, '', {
      fontFamily: '"Share Tech Mono", monospace', fontSize: '10px', fill: '#f5a623',
    });

    // ── Turno ─────────────────────────────────────────────
    this.turnText = this.add.text(W / 2, H / 2 - 15, 'Turno 1', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '13px', fill: '#5a5a7a',
    }).setOrigin(0.5);
  }

  _makeHpBar(x, y, width, color) {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 1);
    bg.fillRoundedRect(0, 0, width, 18, 4);

    const fill = this.add.graphics();
    fill.fillStyle(color, 1);
    fill.fillRoundedRect(2, 2, width - 4, 14, 3);

    container.add([bg, fill]);
    container._fill  = fill;
    container._width = width;
    container._color = color;
    return container;
  }

  _updateHpBar(bar, current, max, color) {
    const pct = Math.max(0, current / max);
    bar._fill.clear();
    const barColor = pct > 0.5 ? color : pct > 0.25 ? 0xf5a623 : 0xe74c3c;
    bar._fill.fillStyle(barColor, 1);
    bar._fill.fillRoundedRect(2, 2, (bar._width - 4) * pct, 14, 3);
  }

  // ─── UI de Fase ──────────────────────────────────────────
  _buildPhaseUI() {
    this.phaseText = this.add.text(W / 2, H / 2 + 8, '', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '15px', fontStyle: 'bold',
      fill: '#7f5af0', backgroundColor: '#0a0a1499',
      padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setDepth(10);
  }

  _setPhaseText(txt) {
    this.phaseText.setText(txt);
    this.tweens.add({ targets: this.phaseText, scaleX: 1.1, scaleY: 1.1, duration: 200, yoyo: true });
  }

  // ─── Log Panel ────────────────────────────────────────────
  _buildLogPanel() {
    // Panel lateral derecho
    const panelX = W - 230;
    const panel  = this.add.graphics();
    panel.fillStyle(0x0d0d1c, 0.9);
    panel.lineStyle(1, 0x2a2a4a, 1);
    panel.fillRoundedRect(panelX, 50, 220, H - 100, 8);
    panel.strokeRoundedRect(panelX, 50, 220, H - 100, 8);

    this.add.text(panelX + 110, 66, 'LOG DE COMBATE', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '10px', fill: '#5a5a8a',
    }).setOrigin(0.5);

    this.logLines = [];
    for (let i = 0; i < 18; i++) {
      this.logLines.push(this.add.text(panelX + 10, 84 + i * 33, '', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '9px', fill: '#6a6a9a',
        wordWrap: { width: 200 },
      }));
    }
  }

  _addLog(msg, color = '#8888aa') {
    this.logLines.forEach((l, i) => {
      if (i < this.logLines.length - 1) {
        this.logLines[i].setText(this.logLines[i + 1].text);
        this.logLines[i].setFill(this.logLines[i + 1].style.color);
      }
    });
    const last = this.logLines[this.logLines.length - 1];
    last.setText(msg);
    last.setFill(color);
  }

  // ─── Botón Confirmar ─────────────────────────────────────
  _buildConfirmButton() {
    const x = W / 2;
    const y = H - 240;
    this.confirmBtn = this.add.container(x, y).setVisible(false).setDepth(20);

    const bg = this.add.graphics();
    bg.fillStyle(0x7f5af0, 1);
    bg.fillRoundedRect(-90, -22, 180, 44, 10);

    const txt = this.add.text(0, 0, 'CONFIRMAR', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '14px', fontStyle: 'bold', fill: '#ffffff',
    }).setOrigin(0.5);

    this.confirmBtn.add([bg, txt]);
    this.confirmBtn.setSize(180, 44);
    this.confirmBtn.setInteractive({ useHandCursor: true });
    this.confirmBtn.on('pointerover',  () => { bg.clear(); bg.fillStyle(0x5a3db8, 1); bg.fillRoundedRect(-90, -22, 180, 44, 10); });
    this.confirmBtn.on('pointerout',   () => { bg.clear(); bg.fillStyle(0x7f5af0, 1); bg.fillRoundedRect(-90, -22, 180, 44, 10); });
    this.confirmBtn.on('pointerdown',  () => this._onConfirmPlay());
  }

  // ─── Botón Menú ──────────────────────────────────────────
  _buildMenuButton() {
    const btn = this.add.text(W - 230, H - 30, '← MENÚ', {
      fontFamily: 'Orbitron, sans-serif', fontSize: '12px', fill: '#5a5a8a',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setFill('#7f5af0'));
    btn.on('pointerout',  () => btn.setFill('#5a5a8a'));
    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MenuScene');
      });
    });
  }

  // ─── Drag listeners globales ──────────────────────────────
  _setupDragListeners() {
    this.input.on('dragenter', (pointer, gameObject, dropZone) => {
      // Highlight del drop zone
    });

    this.input.on('drop', (pointer, gameObject, dropZone) => {
      if (this.isBusy) return;
      if (!gameObject.card) return;

      const card     = gameObject.card;
      const slotType = dropZone._slotType;
      const slotIdx  = dropZone._slotIdx;

      // Validar que la carta corresponde al slot
      if (slotType === 'P' && card.cardType !== 'P') {
        this._addLog('¡Solo cartas P en el slot principal!', '#e74c3c');
        this._returnCardToHand(gameObject);
        return;
      }
      if (slotType === 'H' && card.cardType !== 'H') {
        this._addLog('¡Solo hechizos en los slots H!', '#e74c3c');
        this._returnCardToHand(gameObject);
        return;
      }
      // No poner H sin P
      if (slotType === 'H' && !this.playerSlotP) {
        this._addLog('¡Primero coloca una carta P!', '#e74c3c');
        this._returnCardToHand(gameObject);
        return;
      }

      if (slotType === 'P') {
        // Si ya había una P, devolver al slot vacío
        if (this.playerSlotP) {
          this._addLog('Ya hay una carta P en tu slot.', '#f5a623');
          this._returnCardToHand(gameObject);
          return;
        }
        // Colocar P face-down
        gameObject.x = dropZone.x;
        gameObject.y = dropZone.y;
        gameObject.setOrigin2D(dropZone.x, dropZone.y);
        gameObject.isFaceDown = true;
        gameObject._build();
        this.playerSlotP = gameObject;
        this._removeFromHand(gameObject);
        this.confirmBtn.setVisible(true);
        this._addLog(`Carta P colocada (boca abajo)`, '#7f5af0');
      } else {
        // Slot H
        if (this.playerSlotsH[slotIdx]) {
          this._addLog('Ese slot H ya tiene una carta.', '#f5a623');
          this._returnCardToHand(gameObject);
          return;
        }
        gameObject.x = dropZone.x;
        gameObject.y = dropZone.y;
        gameObject.setOrigin2D(dropZone.x, dropZone.y);
        gameObject.isFaceDown = true;
        gameObject._build();
        this.playerSlotsH[slotIdx] = gameObject;
        this._removeFromHand(gameObject);
        this._addLog(`Hechizo acoplado en slot H${slotIdx + 1}`, '#4fc3f7');
      }
    });

    this.input.on('dragend', (pointer, gameObject, dropped) => {
      if (!dropped && gameObject._dragging === false) {
        this._returnCardToHand(gameObject);
      }
    });
  }

  // ─── Inicializar partida ──────────────────────────────────
  _initGame() {
    // Cargar mazo del jugador desde localStorage
    let playerDeck = Deck.load('playerDeck');
    if (!playerDeck) {
      // Fallback: mazo de guerrero por defecto
      const guerreroIds = CARDS_BY_CLASS['guerrero'].map(c => c.id);
      playerDeck = Deck.fromIds(guerreroIds);
    }

    // Mazo del bot: clase aleatoria
    const classes = ['guerrero', 'mago', 'spyware', 'invocador', 'dracodificador'];
    const botClass = classes[Math.floor(Math.random() * classes.length)];
    const botCards = CARDS_BY_CLASS[botClass].map(c => c.id);
    const botDeck  = Deck.fromIds(botCards);

    this.player = new Player('Tú', playerDeck);
    this.bot    = new Bot(botDeck);

    this.gm = new GameManager(this.player, this.bot, (phase, snapshot) => {
      this._onPhaseChange(phase, snapshot);
    });

    this._addLog('=== ¡Partida iniciada! ===', '#2cb67d');
    this._addLog(`Tu clase: ${playerDeck.class || '?'} | Bot: ${botClass}`, '#7f5af0');

    this.gm.startGame();
    this._updateUI();
    this._startTurn();
  }

  // ─── Callback de cambio de fase ──────────────────────────
  _onPhaseChange(phase, snapshot) {
    const labels = {
      [PHASES.DRAW]:       '🃏 ROBO DE CARTAS',
      [PHASES.VERIFY]:     '🔍 VERIFICANDO MANO',
      [PHASES.PLACEMENT]:  '🎴 COLOCA TU CARTA',
      [PHASES.REVEAL]:     '👁 REVELANDO CARTAS',
      [PHASES.RESOLUTION]: '⚔ RESOLVIENDO...',
      [PHASES.CLEANUP]:    '🔄 FIN DE TURNO',
      [PHASES.GAME_OVER]:  '🏆 ¡FIN DEL JUEGO!',
    };
    this._setPhaseText(labels[phase] || phase);
    this._updateUI();
  }

  // ─── Inicio de turno ─────────────────────────────────────
  _startTurn() {
    if (this.isBusy) return;

    // Fase DRAW
    const drawn = this.gm.phaseDraw();
    this._addLog(`T${this.gm.turn}: Robas ${drawn.playerDrawn.length} | Bot ${drawn.botDrawn.length}`, '#5a5aaa');

    // Renderizar manos
    this._renderPlayerHand();
    this._renderBotHand();
    this._updateUI();

    // Pequeña pausa y luego fase VERIFY
    this.time.delayedCall(600, () => {
      const { playerCanPlay, botCanPlay } = this.gm.phaseVerify();

      if (!playerCanPlay) {
        this._addLog('¡No tienes cartas P! Pierdes el turno.', '#e74c3c');
        this._flashBanner('Sin carta P — Turno perdido', 0xe74c3c);
        this.time.delayedCall(2000, () => this._executeBotAndResolve());
        return;
      }

      // Fase PLACEMENT: esperar que el jugador coloque cartas
      this.gm.setPhase(PHASES.PLACEMENT);
      this.confirmBtn.setVisible(false);
      this._addLog('Elige una carta P y arrástrala a tu slot.', '#7f5af0');
    });
  }

  // ─── Confirmar jugada del jugador ────────────────────────
  _onConfirmPlay() {
    if (this.isBusy || !this.playerSlotP) return;
    this.isBusy = true;
    this.confirmBtn.setVisible(false);

    const pCard  = this.playerSlotP.card;
    const hCards = this.playerSlotsH.filter(Boolean).map(s => s.card);

    // Registrar jugada en el GameManager
    this.gm.setPlayerPlay(pCard, hCards);

    // Fase: el bot juega
    this._executeBotAndResolve();
  }

  // ─── Bot juega y resuelve ─────────────────────────────────
  _executeBotAndResolve() {
    // Bot coloca cartas (fase PLACEMENT del bot)
    if (!this.bot.skippedTurn) {
      this.gm.phasePlacement();
      // Renderizar cartas del bot (face-down)
      this._renderBotPlay();
    }

    // Fase REVEAL después de un delay
    this.time.delayedCall(1200, () => {
      this.gm.phaseReveal();
      this._addLog('¡Revelando cartas!', '#f5a623');
      this._flipAllCards(() => {
        // Fase RESOLUTION
        this.time.delayedCall(800, () => {
          const { events } = this.gm.phaseResolution();
          this._animateResolution(events, () => {
            // Fase CLEANUP
            this.time.delayedCall(1000, () => {
              const result = this.gm.phaseCleanup();
              this._updateUI();

              if (result.gameOver) {
                this._showGameOver(result.winner);
              } else {
                this._clearField();
                this.isBusy = false;
                this.time.delayedCall(600, () => this._startTurn());
              }
            });
          });
        });
      });
    });
  }

  // ─── Renderizar mano del jugador ─────────────────────────
  _renderPlayerHand() {
    // Limpiar sprites anteriores
    this.playerHandSprites.forEach(s => s.destroy());
    this.playerHandSprites = [];

    const cards  = this.player.hand;
    const total  = cards.length;
    if (total === 0) return;

    const maxSpread = Math.min(total * 110, 800);
    const stepX     = total > 1 ? maxSpread / (total - 1) : 0;
    const startX    = W / 2 - maxSpread / 2;

    cards.forEach((card, i) => {
      const x = total === 1 ? W / 2 : startX + i * stepX;
      const sprite = new CardSprite(this, x, PLAYER_HAND_Y, card, {
        faceDown: false,
        draggable: true,
        isBot: false,
      });
      sprite.setDepth(i + 1);
      this.playerHandSprites.push(sprite);
    });
  }

  // ─── Renderizar mano del bot (cartas boca abajo) ─────────
  _renderBotHand() {
    this.botHandSprites.forEach(s => s.destroy());
    this.botHandSprites = [];

    const total  = this.bot.hand.length;
    if (total === 0) return;

    const maxSpread = Math.min(total * 110, 800);
    const stepX     = total > 1 ? maxSpread / (total - 1) : 0;
    const startX    = W / 2 - maxSpread / 2;

    for (let i = 0; i < total; i++) {
      const dummyCard = { id: `bot-hand-${i}`, name: '?', cardType: 'P', class: 'bot', color: 0x2a2a4a, damage: 0, description: '' };
      const x = total === 1 ? W / 2 : startX + i * stepX;
      const sprite = new CardSprite(this, x, BOT_HAND_Y, dummyCard, { faceDown: true, draggable: false, isBot: true });
      sprite.setDepth(i + 1);
      this.botHandSprites.push(sprite);
    }
  }

  // ─── Renderizar jugada del bot en su slot ─────────────────
  _renderBotPlay() {
    const ctx = this.gm.turnCtx;
    if (!ctx.botCard) return;

    // Carta P del bot (face-down)
    const pSprite = new CardSprite(this, BOT_SLOT_P_X, BOT_SLOT_P_Y, ctx.botCard, { faceDown: true });
    pSprite.setDepth(10);
    this.botSlotP = pSprite;

    // Cartas H del bot
    ctx.botSpells.forEach((hCard, idx) => {
      const hx = idx === 0 ? BOT_SLOT_H1_X : BOT_SLOT_H2_X;
      const sprite = new CardSprite(this, hx, BOT_SLOT_H_Y, hCard, { faceDown: true });
      sprite.setDepth(10);
      this.botSlotsH[idx] = sprite;
    });
  }

  // ─── Flip simultáneo de todas las cartas ─────────────────
  _flipAllCards(onComplete) {
    const toFlip = [
      this.playerSlotP,
      ...this.playerSlotsH.filter(Boolean),
      this.botSlotP,
      ...this.botSlotsH.filter(Boolean),
    ].filter(Boolean);

    if (toFlip.length === 0) {
      onComplete();
      return;
    }

    let done = 0;
    toFlip.forEach(sprite => {
      sprite.flip(() => {
        done++;
        if (done === toFlip.length) onComplete();
      });
    });
  }

  // ─── Animar resolución ────────────────────────────────────
  _animateResolution(events, onComplete) {
    let delay = 0;
    events.forEach(evt => {
      this.time.delayedCall(delay, () => {
        const colorMap = {
          DAMAGE:   '#ff4444',
          HEAL:     '#44ff88',
          BLOCK:    '#4fc3f7',
          EVADE:    '#f5a623',
          POISON:   '#9b59b6',
          HACK:     '#27ae60',
          SUMMON:   '#2980b9',
          DELAYED:  '#e67e22',
          REFLECT:  '#ff9800',
        };
        const col = colorMap[evt.type] || '#8888aa';
        this._addLog(evt.msg, col);

        // Mostrar daño visual
        if (evt.type === 'DAMAGE' && evt.who === 'player') {
          // Bot causa daño al jugador → efecto en barra HP del jugador
          this._shakeHPBar(this.playerHpBar);
        }
        if (evt.type === 'DAMAGE' && evt.who === 'bot') {
          this._shakeHPBar(this.botHpBar);
        }
      });
      delay += 400;
    });

    this.time.delayedCall(delay + 200, () => {
      this._updateUI();
      onComplete();
    });
  }

  _shakeHPBar(bar) {
    const origX = bar.x;
    this.tweens.add({
      targets: bar, x: origX + 6, duration: 50,
      yoyo: true, repeat: 4,
      onComplete: () => { bar.x = origX; },
    });
  }

  // ─── Limpiar campo al final del turno ────────────────────
  _clearField() {
    [this.playerSlotP, ...this.playerSlotsH, this.botSlotP, ...this.botSlotsH]
      .filter(Boolean).forEach(s => {
        this.tweens.add({ targets: s, alpha: 0, duration: 300, onComplete: () => s.destroy() });
      });

    this.playerSlotP   = null;
    this.playerSlotsH  = [null, null];
    this.botSlotP      = null;
    this.botSlotsH     = [null, null];
    this.confirmBtn.setVisible(false);
  }

  // ─── Helpers de mano ─────────────────────────────────────
  _removeFromHand(sprite) {
    const idx = this.playerHandSprites.indexOf(sprite);
    if (idx !== -1) this.playerHandSprites.splice(idx, 1);
  }

  _returnCardToHand(sprite) {
    this.tweens.add({
      targets: sprite,
      x: sprite._originX, y: sprite._originY,
      scaleX: 1, scaleY: 1,
      duration: 200, ease: 'Power2',
    });
  }

  // ─── Actualizar UI ────────────────────────────────────────
  _updateUI() {
    if (!this.gm) return;
    const snap = this.gm.getSnapshot();

    // HP
    this._updateHpBar(this.playerHpBar, snap.playerHp, 200, 0x2cb67d);
    this._updateHpBar(this.botHpBar,    snap.botHp,    200, 0xe74c3c);
    this.playerHpText.setText(`${snap.playerHp} / 200`);
    this.botHpText.setText(`${snap.botHp} / 200`);

    // Turno
    this.turnText.setText(`Turno ${snap.turn}`);

    // Mazos
    if (this.playerDeckIcon) this.playerDeckIcon.counter.setText(snap.playerDeck);
    if (this.botDeckIcon)    this.botDeckIcon.counter.setText(snap.botDeck);

    // Efectos de estado del jugador
    const pEfx = [];
    if (snap.playerEffects.poison) pEfx.push(`☠ Veneno x${snap.playerEffects.poison.turns}`);
    if (snap.playerEffects.block)  pEfx.push(`🛡 Bloqueo`);
    if (snap.playerEffects.evade)  pEfx.push(`💨 Evasión`);
    this.playerEffectText.setText(pEfx.join(' | '));

    const bEfx = [];
    if (snap.botEffects.poison) bEfx.push(`☠ x${snap.botEffects.poison.turns}`);
    if (snap.botEffects.block)  bEfx.push(`🛡`);
    if (snap.botEffects.evade)  bEfx.push(`💨`);
    this.botEffectText.setText(bEfx.join(' '));

    // Cartas hackeadas (Spyware)
    if (snap.hackedCards > 0) {
      this.hackedCount.setText(`◈ Hackeadas: ${snap.hackedCards}`).setVisible(true);
    }
  }

  // ─── Banner de fase ───────────────────────────────────────
  _flashBanner(msg, color = 0x7f5af0) {
    const banner = this.add.graphics();
    banner.fillStyle(color, 0.9);
    banner.fillRect(W / 2 - 220, H / 2 - 30, 440, 60);

    const txt = this.add.text(W / 2, H / 2, msg, {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '20px', fontStyle: 'bold', fill: '#ffffff',
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: [banner, txt], alpha: 0, duration: 1500, delay: 600,
      onComplete: () => { banner.destroy(); txt.destroy(); },
    });
  }

  // ─── Game Over ────────────────────────────────────────────
  _showGameOver(winner) {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, W, H);

    const isWin = winner === 'player';
    const title = isWin ? '¡VICTORIA!' : winner === 'bot' ? '¡DERROTA!' : '¡EMPATE!';
    const color = isWin ? '#2cb67d' : winner === 'bot' ? '#e74c3c' : '#f5a623';

    this.add.text(W / 2, H / 2 - 60, title, {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '56px', fontStyle: 'bold',
      fill: color, stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(200);

    this.add.text(W / 2, H / 2 + 10, `Turno ${this.gm.turn} — ${isWin ? 'El Bot ha sido derrotado.' : 'Has sido derrotado.'}`, {
      fontFamily: '"Share Tech Mono", monospace', fontSize: '16px', fill: '#ccccdd',
    }).setOrigin(0.5).setDepth(200);

    // Botones
    this._makeGOButton(W / 2 - 110, H / 2 + 80, 'JUGAR DE NUEVO', 0x7f5af0, () => {
      this.scene.restart();
    });
    this._makeGOButton(W / 2 + 110, H / 2 + 80, 'MENÚ PRINCIPAL', 0x2cb67d, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MenuScene'));
    });
  }

  _makeGOButton(x, y, label, color, onClick) {
    const cont = this.add.container(x, y).setDepth(200);
    const bg   = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-90, -20, 180, 40, 8);
    const txt = this.add.text(0, 0, label, {
      fontFamily: 'Orbitron, sans-serif', fontSize: '12px', fontStyle: 'bold', fill: '#fff',
    }).setOrigin(0.5);
    cont.add([bg, txt]);
    cont.setSize(180, 40);
    cont.setInteractive({ useHandCursor: true });
    cont.on('pointerdown', onClick);
  }
}
