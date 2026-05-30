// ============================================================
//  BootScene.js — Precarga de assets
// ============================================================
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Barra de progreso
    const width  = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar  = this.add.graphics();
    const progressBox  = this.add.graphics();
    progressBox.fillStyle(0x1a1a2e, 0.9);
    progressBox.fillRect(width / 2 - 200, height / 2 - 20, 400, 40);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Cargando...', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '20px',
      fill: '#7f5af0',
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x7f5af0, 1);
      progressBar.fillRect(width / 2 - 196, height / 2 - 16, 392 * value, 32);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Cargar los assets de imagen (las imágenes van en /public/assets/images/)
    // Back de carta (dorso)
    this.load.image('card-back', 'assets/images/ui/card-back.png');
    this.load.image('card-frame-p', 'assets/images/ui/card-frame-p.png');
    this.load.image('card-frame-h', 'assets/images/ui/card-frame-h.png');
    this.load.image('bg-menu', 'assets/images/backgrounds/bg-menu.png');
    this.load.image('bg-game', 'assets/images/backgrounds/bg-game.png');

    // UI
    this.load.image('btn-play', 'assets/images/ui/btn-play.png');
    this.load.image('btn-deck', 'assets/images/ui/btn-deck.png');
    this.load.image('hp-bar-fill', 'assets/images/ui/hp-bar-fill.png');
    this.load.image('logo', 'assets/images/ui/logo.png');

    // Iconos de clase
    this.load.image('icon-guerrero',       'assets/images/ui/icon-guerrero.png');
    this.load.image('icon-mago',           'assets/images/ui/icon-mago.png');
    this.load.image('icon-spyware',        'assets/images/ui/icon-spyware.png');
    this.load.image('icon-invocador',      'assets/images/ui/icon-invocador.png');
    this.load.image('icon-dracodificador', 'assets/images/ui/icon-dracodificador.png');

    // Cartas — Guerrero
    ['g01','g02','g03','g04','g05','g06','g07','g08','g09','g10'].forEach(id => {
      this.load.image(id, `assets/images/cards/guerrero/${id}.png`);
    });
    // Cartas — Mago
    ['m01','m02','m03','m04','m05','m06','m07','m08','m09','m10'].forEach(id => {
      this.load.image(id, `assets/images/cards/mago/${id}.png`);
    });
    // Cartas — Spyware
    ['s02','s03','s04','s05','s06','s07','s08','s09','s10','s11'].forEach(id => {
      this.load.image(id, `assets/images/cards/spyware/${id}.png`);
    });
    // Cartas — Invocador
    ['i01','i02','i03','i04','i05','i06','i07','i08','i09','i10'].forEach(id => {
      this.load.image(id, `assets/images/cards/invocador/${id}.png`);
    });
    // Cartas — Dracodificador
    ['d01','d02','d03','d04','d05','d06','d07','d08','d09','d10'].forEach(id => {
      this.load.image(id, `assets/images/cards/dracodificador/${id}.png`);
    });
  }

  create() {
    // Pequeña pausa para que las imágenes terminen de procesarse
    this.time.delayedCall(200, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MenuScene');
      });
    });
  }
}
