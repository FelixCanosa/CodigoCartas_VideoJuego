// ============================================================
//  MenuScene.js — Menú Principal
// ============================================================
import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ── Fondo ──
    this._buildBackground(W, H);

    // ── Partículas decorativas ──
    this._buildParticles(W, H);

    // ── Logo / título ──
    this._buildLogo(W, H);

    // ── Botones ──
    this._buildButtons(W, H);

    // ── Footer ──
    this.add.text(W / 2, H - 24, 'Código y Caos © 2026 — MVP', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '11px',
      fill: '#3a3a5c',
    }).setOrigin(0.5);
  }

  _buildBackground(W, H) {
    // Fondo degradado oscuro
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a14, 0x0a0a14, 0x12122a, 0x12122a, 1);
    bg.fillRect(0, 0, W, H);

    // Grid de líneas cibernéticas
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a3e, 0.4);
    for (let x = 0; x < W; x += 60) {
      grid.lineBetween(x, 0, x, H);
    }
    for (let y = 0; y < H; y += 60) {
      grid.lineBetween(0, y, W, y);
    }

    // Resplandor central
    const glow = this.add.graphics();
    glow.fillStyle(0x7f5af0, 0.06);
    glow.fillCircle(W / 2, H / 2, 350);
  }

  _buildParticles(W, H) {
    // Partículas flotantes (hexágonos / píxeles)
    const numParticles = 30;
    for (let i = 0; i < numParticles; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H);
      const size = Phaser.Math.Between(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.1, 0.5);
      const dot = this.add.graphics();
      dot.fillStyle(0x7f5af0, alpha);
      dot.fillCircle(0, 0, size);
      dot.setPosition(x, y);

      this.tweens.add({
        targets: dot,
        y: y - Phaser.Math.Between(80, 200),
        alpha: 0,
        duration: Phaser.Math.Between(3000, 7000),
        repeat: -1,
        yoyo: false,
        delay: Phaser.Math.Between(0, 4000),
        onRepeat: () => {
          dot.setPosition(Phaser.Math.Between(0, W), H + 10);
          dot.alpha = alpha;
        },
      });
    }
  }

  _buildLogo(W, H) {
    // Título principal
    const title = this.add.text(W / 2, H * 0.28, 'CÓDIGO', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '72px',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#7f5af0',
      strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);

    const subtitle = this.add.text(W / 2, H * 0.28 + 80, 'Y CAOS', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '48px',
      fontStyle: 'bold',
      fill: '#cb6ce6',
      stroke: '#7f5af0',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0);

    const tagline = this.add.text(W / 2, H * 0.28 + 138, '— El Juego de Cartas Épico —', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize: '16px',
      fill: '#72737b',
    }).setOrigin(0.5).setAlpha(0);

    // Líneas decorativas
    const line1 = this.add.graphics().setAlpha(0);
    line1.lineStyle(2, 0x7f5af0, 0.7);
    line1.lineBetween(W / 2 - 200, H * 0.28 + 160, W / 2 + 200, H * 0.28 + 160);

    // Animación de entrada
    this.tweens.add({ targets: title,    alpha: 1, y: H * 0.25,       duration: 800, ease: 'Power2', delay: 200 });
    this.tweens.add({ targets: subtitle, alpha: 1, y: H * 0.25 + 80,  duration: 800, ease: 'Power2', delay: 400 });
    this.tweens.add({ targets: tagline,  alpha: 1,                     duration: 600, delay: 800 });
    this.tweens.add({ targets: line1,    alpha: 1,                     duration: 600, delay: 1000 });

    // Efecto de parpadeo en el título
    this.tweens.add({
      targets: title,
      strokeThickness: 6,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 1500,
    });
  }

  _buildButtons(W, H) {
    const btnY1 = H * 0.62;
    const btnY2 = H * 0.75;

    this._createButton(W / 2, btnY1, 'JUGAR vs BOT', 0x7f5af0, 0x5a3db8, () => {
      this._onPlayClick();
    }, 400, 60, 'btn-play');

    this._createButton(W / 2, btnY2, 'ARMAR MAZO', 0x2cb67d, 0x1a8055, () => {
      this.scene.start('DeckBuilderScene');
    }, 400, 60, 'btn-deck');
  }

  _createButton(x, y, label, color, hoverColor, onClick, w = 360, h = 55, id = '') {
    const container = this.add.container(x, y).setAlpha(0);

    // Sombra
    const shadow = this.add.graphics();
    shadow.fillStyle(color, 0.3);
    shadow.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w, h, 12);

    // Fondo del botón
    const bg = this.add.graphics();
    bg.fillStyle(0x16161e, 1);
    bg.lineStyle(2, color, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);

    // Brillo superior
    const shine = this.add.graphics();
    shine.fillStyle(0xffffff, 0.05);
    shine.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h / 2, 10);

    // Texto
    const txt = this.add.text(0, 0, label, {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      fill: '#ffffff',
    }).setOrigin(0.5);

    container.add([shadow, bg, shine, txt]);
    container.setSize(w, h);
    container.setInteractive({ useHandCursor: true });

    // Hover
    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(color, 1);
      bg.lineStyle(2, 0xffffff, 0.6);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
      this.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 100 });
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x16161e, 1);
      bg.lineStyle(2, color, 1);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 });
    });

    container.on('pointerdown', () => {
      this.tweens.add({ targets: container, scaleX: 0.96, scaleY: 0.96, duration: 80, yoyo: true, onComplete: onClick });
    });

    // Animación de entrada
    this.tweens.add({ targets: container, alpha: 1, y: y, duration: 600, ease: 'Power2', delay: 1200 });
  }

  _onPlayClick() {
    const hasDeck = localStorage.getItem('playerDeck');
    if (!hasDeck) {
      this._showModal('¡Sin mazo!', 'Debes armar tu mazo antes de jugar.\nVe al constructor de mazos.', () => {
        this.scene.start('DeckBuilderScene');
      });
      return;
    }
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene');
    });
  }

  _showModal(title, message, onConfirm) {
    const W = this.scale.width;
    const H = this.scale.height;
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, W, H);

    const box = this.add.graphics();
    box.fillStyle(0x12122a, 1);
    box.lineStyle(2, 0x7f5af0, 1);
    box.strokeRoundedRect(W / 2 - 230, H / 2 - 100, 460, 200, 16);
    box.fillRoundedRect(W / 2 - 230, H / 2 - 100, 460, 200, 16);

    this.add.text(W / 2, H / 2 - 60, title, {
      fontFamily: 'Orbitron, sans-serif', fontSize: '22px', fill: '#7f5af0', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(W / 2, H / 2 - 10, message, {
      fontFamily: '"Share Tech Mono", monospace', fontSize: '14px', fill: '#c8c8d0', align: 'center',
    }).setOrigin(0.5);

    this._createButton(W / 2, H / 2 + 65, 'ARMAR MAZO', 0x7f5af0, 0x5a3db8, () => {
      this.scene.start('DeckBuilderScene');
    }, 220, 44);
  }
}
