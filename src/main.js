// ============================================================
//  main.js — Punto de entrada de Phaser + Código y Caos
// ============================================================
import Phaser from 'phaser';
import { BootScene }        from './scenes/BootScene.js';
import { MenuScene }        from './scenes/MenuScene.js';
import { DeckBuilderScene } from './scenes/DeckBuilderScene.js';
import { GameScene }        from './scenes/GameScene.js';
import './style.css';

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: '#0a0a14',
  parent: 'game-container',
  resolution: window.devicePixelRatio || 1,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, DeckBuilderScene, GameScene],
  dom: {
    createContainer: true,
  },
};

const game = new Phaser.Game(config);
export default game;
