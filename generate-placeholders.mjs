// generate-placeholders.mjs
// Genera imágenes PNG placeholder para todas las cartas
// Ejecutar: node generate-placeholders.mjs

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const CARD_W = 200;
const CARD_H = 280;

const CLASS_COLORS = {
  guerrero:       { bg: '#1a0808', border: '#C0392B', text: '#ff6b6b' },
  mago:           { bg: '#0e0a1a', border: '#8E44AD', text: '#cb6ce6' },
  spyware:        { bg: '#081a0e', border: '#27AE60', text: '#6bff9e' },
  invocador:      { bg: '#08121a', border: '#2980B9', text: '#4fc3f7' },
  dracodificador: { bg: '#1a0d04', border: '#E67E22', text: '#ffa040' },
};

const CARDS = [
  // Guerrero
  { id: 'g01', name: 'Escudo Impecable',    class: 'guerrero',       type: 'H' },
  { id: 'g02', name: '¡No Escaparás!',       class: 'guerrero',       type: 'P' },
  { id: 'g03', name: '¡Atrévete!',           class: 'guerrero',       type: 'P' },
  { id: 'g04', name: 'Banquete Real',         class: 'guerrero',       type: 'H' },
  { id: 'g05', name: 'Evasión Caballerosa',  class: 'guerrero',       type: 'P' },
  { id: 'g06', name: 'Último Recurso',        class: 'guerrero',       type: 'H' },
  { id: 'g07', name: 'Juicio Final',          class: 'guerrero',       type: 'P' },
  { id: 'g08', name: 'Fuerza Devastadora',   class: 'guerrero',       type: 'H' },
  { id: 'g09', name: 'No es Personal..',      class: 'guerrero',       type: 'P' },
  { id: 'g10', name: 'Afilar',               class: 'guerrero',       type: 'H' },
  // Mago
  { id: 'm01', name: 'Cetro Maligno',        class: 'mago',           type: 'H' },
  { id: 'm02', name: 'Bola de Fuego',        class: 'mago',           type: 'P' },
  { id: 'm03', name: 'Libro Magos Vol.4',    class: 'mago',           type: 'H' },
  { id: 'm04', name: 'Espectro de Bucle',    class: 'mago',           type: 'P' },
  { id: 'm05', name: 'Protección Divina',    class: 'mago',           type: 'P' },
  { id: 'm06', name: 'Prototipo Curativo',   class: 'mago',           type: 'H' },
  { id: 'm07', name: 'Muro Cortafuego',      class: 'mago',           type: 'P' },
  { id: 'm08', name: 'Chasquido Incendiario',class: 'mago',           type: 'H' },
  { id: 'm09', name: 'Golem de Algoritmo',   class: 'mago',           type: 'P' },
  { id: 'm10', name: 'Tormenta Oscura',      class: 'mago',           type: 'H' },
  // Spyware
  { id: 's02', name: 'Sería una Pena...',    class: 'spyware',        type: 'P' },
  { id: 's03', name: 'No Importa si...',     class: 'spyware',        type: 'P' },
  { id: 's04', name: 'Sistema Comprometido', class: 'spyware',        type: 'H' },
  { id: 's05', name: 'Déjame Aportar...',    class: 'spyware',        type: 'H' },
  { id: 's06', name: 'Mercado Negro',        class: 'spyware',        type: 'H' },
  { id: 's07', name: 'Respetamos Privacidad',class: 'spyware',        type: 'H' },
  { id: 's08', name: 'Barrera Cibernética',  class: 'spyware',        type: 'P' },
  { id: 's09', name: 'Yo No Haría Eso...',   class: 'spyware',        type: 'P' },
  { id: 's10', name: 'Un Pequeño Juguetito', class: 'spyware',        type: 'P' },
  { id: 's11', name: '¡En Serio?... ¡Ha!',   class: 'spyware',        type: 'P' },
  // Invocador
  { id: 'i01', name: 'Esquirla de Eco',      class: 'invocador',      type: 'P' },
  { id: 'i02', name: 'Vigía del Nexo',       class: 'invocador',      type: 'P' },
  { id: 'i03', name: 'Titán Inestable',      class: 'invocador',      type: 'P' },
  { id: 'i04', name: 'Guardián Rúnico',      class: 'invocador',      type: 'P' },
  { id: 'i05', name: 'Espíritu Vengativo',   class: 'invocador',      type: 'P' },
  { id: 'i06', name: 'Infundir Poder',       class: 'invocador',      type: 'H' },
  { id: 'i07', name: 'Pacto Aniquilación',   class: 'invocador',      type: 'H' },
  { id: 'i08', name: 'Metamorfosis Forzada', class: 'invocador',      type: 'H' },
  { id: 'i09', name: 'Vínculo Mental',       class: 'invocador',      type: 'H' },
  { id: 'i10', name: 'Portal Curador',       class: 'invocador',      type: 'H' },
  // Dracodificador
  { id: 'd01', name: 'Aliento Compilado',    class: 'dracodificador', type: 'P' },
  { id: 'd02', name: 'Nido de Firewall',     class: 'dracodificador', type: 'P' },
  { id: 'd03', name: 'Sobrecarga Estructural',class: 'dracodificador', type: 'P' },
  { id: 'd04', name: 'Guardián de Códice',   class: 'dracodificador', type: 'P' },
  { id: 'd05', name: 'Módulo Aceleración',   class: 'dracodificador', type: 'H' },
  { id: 'd06', name: 'Parche de Seguridad',  class: 'dracodificador', type: 'H' },
  { id: 'd07', name: 'Inyección Deps.',      class: 'dracodificador', type: 'H' },
  { id: 'd08', name: 'Ráfaga de Scripts',    class: 'dracodificador', type: 'H' },
  { id: 'd09', name: 'Depuración Emergencia',class: 'dracodificador', type: 'H' },
  { id: 'd10', name: 'Optimización Código',  class: 'dracodificador', type: 'H' },
];

// UI placeholders
const UI_IMAGES = [
  { name: 'card-frame-p', dir: 'ui' },
  { name: 'card-frame-h', dir: 'ui' },
  { name: 'btn-play',     dir: 'ui' },
  { name: 'btn-deck',     dir: 'ui' },
  { name: 'hp-bar-fill',  dir: 'ui' },
  { name: 'logo',         dir: 'ui' },
  { name: 'icon-guerrero',       dir: 'ui' },
  { name: 'icon-mago',           dir: 'ui' },
  { name: 'icon-spyware',        dir: 'ui' },
  { name: 'icon-invocador',      dir: 'ui' },
  { name: 'icon-dracodificador', dir: 'ui' },
];

const BASE = './public/assets/images';

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function generateCardImage(card) {
  const canvas = createCanvas(CARD_W, CARD_H);
  const ctx    = canvas.getContext('2d');
  const colors = CLASS_COLORS[card.class];

  // Fondo
  ctx.fillStyle = colors.bg;
  ctx.roundRect(0, 0, CARD_W, CARD_H, 14);
  ctx.fill();

  // Borde
  ctx.strokeStyle = colors.border;
  ctx.lineWidth   = 3;
  ctx.roundRect(2, 2, CARD_W - 4, CARD_H - 4, 12);
  ctx.stroke();

  // Cabecera
  ctx.fillStyle = colors.border + '66';
  ctx.roundRect(4, 4, CARD_W - 8, 36, [10, 10, 0, 0]);
  ctx.fill();

  // Badge tipo
  ctx.fillStyle  = card.type === 'P' ? '#f5a62388' : '#4fc3f788';
  ctx.fillRect(8, 8, 24, 20);
  ctx.fillStyle  = card.type === 'P' ? '#f5a623' : '#4fc3f7';
  ctx.font       = 'bold 12px monospace';
  ctx.textAlign  = 'center';
  ctx.fillText(card.type, 20, 23);

  // Nombre
  ctx.fillStyle  = '#ffffff';
  ctx.font       = 'bold 11px sans-serif';
  ctx.textAlign  = 'center';
  const words    = card.name.split(' ');
  let line       = '';
  let lineY      = 56;
  words.forEach(w => {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > CARD_W - 16) {
      ctx.fillText(line.trim(), CARD_W / 2, lineY);
      line  = w + ' ';
      lineY += 14;
    } else {
      line = test;
    }
  });
  ctx.fillText(line.trim(), CARD_W / 2, lineY);

  // Símbolo de clase en el centro
  const symbols = { guerrero: '⚔', mago: '✦', spyware: '◈', invocador: '★', dracodificador: '◎' };
  ctx.fillStyle  = colors.border + 'aa';
  ctx.font       = '64px sans-serif';
  ctx.textAlign  = 'center';
  ctx.fillText(symbols[card.class] || '?', CARD_W / 2, CARD_H / 2 + 28);

  // Borde inferior con clase
  ctx.fillStyle  = colors.border + '44';
  ctx.fillRect(4, CARD_H - 28, CARD_W - 8, 22);
  ctx.fillStyle  = colors.text;
  ctx.font       = '9px monospace';
  ctx.textAlign  = 'center';
  ctx.fillText(card.class.toUpperCase(), CARD_W / 2, CARD_H - 12);

  return canvas.toBuffer('image/png');
}

function generateUIPlaceholder(name, w = 200, h = 60) {
  const canvas = createCanvas(w, h);
  const ctx    = canvas.getContext('2d');
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#7f5af0';
  ctx.lineWidth   = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.fillStyle   = '#7f5af0';
  ctx.font        = '12px monospace';
  ctx.textAlign   = 'center';
  ctx.fillText(name, w / 2, h / 2 + 4);
  return canvas.toBuffer('image/png');
}

// Generar cartas
let count = 0;
CARDS.forEach(card => {
  const dir  = join(BASE, 'cards', card.class);
  ensureDir(dir);
  const path = join(dir, `${card.id}.png`);
  if (!existsSync(path)) {
    writeFileSync(path, generateCardImage(card));
    count++;
  }
});

// Generar UI
UI_IMAGES.forEach(ui => {
  const dir  = join(BASE, ui.dir);
  ensureDir(dir);
  const path = join(dir, `${ui.name}.png`);
  if (!existsSync(path)) {
    writeFileSync(path, generateUIPlaceholder(ui.name));
    count++;
  }
});

console.log(`✅ Generados ${count} placeholders de imágenes.`);
