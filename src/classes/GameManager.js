// ============================================================
//  CLASE GameManager — Código y Caos
//  Máquina de estados del turno: DRAW→VERIFY→PLACEMENT→REVEAL→RESOLUTION→CLEANUP
// ============================================================

export const PHASES = {
  DRAW:       'DRAW',
  VERIFY:     'VERIFY',
  PLACEMENT:  'PLACEMENT',
  REVEAL:     'REVEAL',
  RESOLUTION: 'RESOLUTION',
  CLEANUP:    'CLEANUP',
  GAME_OVER:  'GAME_OVER',
};

export class GameManager {
  constructor(player, bot, onStateChange) {
    this.player       = player;
    this.bot          = bot;
    this.phase        = PHASES.DRAW;
    this.turn         = 1;
    this.log          = [];            // historial de eventos del turno
    this.onStateChange = onStateChange || (() => {}); // callback para la UI

    // Contexto del turno
    this.turnCtx = {
      playerCard:   null,  // carta P del jugador
      playerSpells: [],    // cartas H del jugador
      botCard:      null,  // carta P del bot
      botSpells:    [],    // cartas H del bot
      totalCardsPlayed: 0, // para S10
    };
  }

  // ─── Log interno ─────────────────────────────────────────
  addLog(msg, type = 'info') {
    const entry = { msg, type, turn: this.turn, phase: this.phase };
    this.log.push(entry);
    console.log(`[T${this.turn}][${this.phase}] ${msg}`);
    return entry;
  }

  // ─── Avance de fase ──────────────────────────────────────
  setPhase(phase) {
    this.phase = phase;
    this.onStateChange(phase, this.getSnapshot());
  }

  // ─── FASE 1: DRAW ─────────────────────────────────────────
  phaseDraw() {
    this.setPhase(PHASES.DRAW);
    this.turnCtx = { playerCard: null, playerSpells: [], botCard: null, botSpells: [], totalCardsPlayed: 0 };

    const playerDrawn = this.player.drawCards(2);
    const botDrawn    = this.bot.drawCards(2);

    this.addLog(`Jugador roba ${playerDrawn.length} carta(s). Mano: ${this.player.hand.length}`);
    this.addLog(`Bot roba ${botDrawn.length} carta(s). Mano: ${this.bot.hand.length}`);

    return { playerDrawn, botDrawn };
  }

  // ─── FASE 2: VERIFY ───────────────────────────────────────
  /**
   * checkPlayability: si un jugador no tiene P en mano → pierde el turno.
   * Retorna { playerCanPlay, botCanPlay }
   */
  phaseVerify() {
    this.setPhase(PHASES.VERIFY);

    const playerCanPlay = this.checkPlayability(this.player);
    const botCanPlay    = this.checkPlayability(this.bot);

    if (!playerCanPlay) {
      this.player.skippedTurn = true;
      this.addLog('¡El jugador no tiene cartas P! Pierde su turno.', 'warning');
    }
    if (!botCanPlay) {
      this.bot.skippedTurn = true;
      this.addLog('¡El Bot no tiene cartas P! Pierde su turno.', 'warning');
    }

    return { playerCanPlay, botCanPlay };
  }

  checkPlayability(player) {
    return player.hand.some(c => c.cardType === 'P');
  }

  // ─── FASE 3: PLACEMENT ────────────────────────────────────
  /**
   * El bot ejecuta su decisión aquí.
   * El jugador ya eligió sus cartas desde la UI (setPlayerPlay).
   */
  phasePlacement() {
    this.setPhase(PHASES.PLACEMENT);

    // Bot decide
    if (!this.bot.skippedTurn) {
      const botPlay = this.bot.executePlay();
      if (botPlay) {
        this.turnCtx.botCard   = botPlay.pCard;
        this.turnCtx.botSpells = botPlay.hCards;
        this.addLog(`Bot juega: ${botPlay.pCard.name} + [${botPlay.hCards.map(h => h.name).join(', ')}]`);
      }
    }
  }

  /** La UI llama a este método cuando el jugador confirma sus cartas */
  setPlayerPlay(pCard, hCards = []) {
    this.turnCtx.playerCard   = pCard;
    this.turnCtx.playerSpells = hCards;
    this.addLog(`Jugador juega: ${pCard.name} + [${hCards.map(h => h.name).join(', ')}]`);
  }

  // ─── FASE 4: REVEAL ───────────────────────────────────────
  phaseReveal() {
    this.setPhase(PHASES.REVEAL);
    // La animación de flip se maneja en la GameScene
    // Este método solo notifica el cambio de estado
    return {
      playerCard: this.turnCtx.playerCard,
      botCard:    this.turnCtx.botCard,
    };
  }

  // ─── FASE 5: RESOLUTION ───────────────────────────────────
  phaseResolution() {
    this.setPhase(PHASES.RESOLUTION);
    const ctx = this.turnCtx;

    // 1. Efectos persistentes del turno anterior (veneno, criaturas en campo)
    this._processPersistedEffects();

    // 2. Si nadie jugó, fin
    if (!ctx.playerCard && !ctx.botCard) {
      this.addLog('Ambos jugadores pasan el turno.');
      return { events: [] };
    }

    const events = [];
    const playerHigh = ctx.playerCard?.highPriority;
    const botHigh    = ctx.botCard?.highPriority;

    if (playerHigh && !botHigh) {
      // Prioridad del jugador: resuelve primero
      if (ctx.playerCard) events.push(...this._resolveCard(ctx.playerCard, ctx.playerSpells, this.player, this.bot, 'player'));
      if (ctx.botCard)    events.push(...this._resolveCard(ctx.botCard,    ctx.botSpells,    this.bot,    this.player, 'bot'));
    } else if (botHigh && !playerHigh) {
      // Prioridad del bot
      if (ctx.botCard)    events.push(...this._resolveCard(ctx.botCard,    ctx.botSpells,    this.bot,    this.player, 'bot'));
      if (ctx.playerCard) events.push(...this._resolveCard(ctx.playerCard, ctx.playerSpells, this.player, this.bot,    'player'));
    } else {
      // Resolución simultánea
      events.push(...this._resolveSimultaneous());
    }

    // 3. Hechizos que resuelven al final (Mercado Negro S06)
    events.push(...this._resolveEndSpells());

    return { events };
  }

  _resolveCard(pCard, hSpells, caster, target, who, precalcDamage = null) {
    if (!pCard) return [];
    const events = [];
    // Si se pasó precalcDamage, usarlo; de lo contrario acumular desde los efectos
    let totalDamage = precalcDamage !== null ? precalcDamage : 0;
    let healAmount  = 0;
    let blocked     = false;

    // Contar cartas jugadas para S10
    this.turnCtx.totalCardsPlayed += 1 + hSpells.length;

    // ── Hechizos previos al combate ──
    for (const h of hSpells) {
      if (h.effect === 'DESTROY_BLOCK') {
        target.removeBlock();
        events.push(this._evt(who, 'DESTROY_BLOCK', `${h.name} destruye el bloqueo de ${target.name}`));
      }
      if (h.effect === 'INDESTRUCTIBLE_IF_DEFENSIVE' && pCard.isDefensive()) {
        pCard._indestructible = true;
      }
      if (h.effect === 'BOOST_OFFENSIVE_DAMAGE' && pCard.isOffensive()) {
        // Solo sumar si NO viene de precalcDamage (que ya lo incluye)
        if (precalcDamage === null) totalDamage += h.bonusDamage;
        events.push(this._evt(who, 'BOOST', `+${h.bonusDamage} daño de ${h.name}`));
      }
      if (h.effect === 'HEAL') {
        healAmount += h.heal;
      }
      if (h.effect === 'POISON') {
        // Reduce curación si el objetivo se estaba curando este turno
        const opHeal = this.turnCtx[who === 'player' ? 'botHeal' : 'playerHeal'] || 0;
        target.applyPoison(h.damage, h.poisonTurns);
        if (opHeal > 0) {
          // reducir curación del oponente en 40
          this.turnCtx[who === 'player' ? 'botHealReduction' : 'playerHealReduction'] = 40;
        }
        events.push(this._evt(who, 'POISON', `${h.name} envenena a ${target.name} por ${h.poisonTurns} turnos`));
      }
    }

    // ── Carta P ──
    switch (pCard.effect) {
      case 'DAMAGE':
        if (precalcDamage === null) totalDamage += pCard.damage;
        break;

      case 'DAMAGE_AFILAR_BONUS': {
        if (precalcDamage === null) totalDamage += pCard.damage;
        const afilar = hSpells.find(h => h.effect === 'BOOST_OFFENSIVE_DAMAGE');
        if (afilar && precalcDamage === null) totalDamage += 10;
        break;
      }

      case 'FIREBALL_CETRO_BONUS':
        if (precalcDamage === null) totalDamage += pCard.damage;
        if (caster.cetroUsed && precalcDamage === null) totalDamage += pCard.bonusDamage;
        break;

      case 'BREAK_BLOCK_BONUS':
        if (precalcDamage === null) totalDamage += pCard.damage;
        if (target.isBlocking()) {
          if (!target.statusEffects.block?.indestructible || pCard._bypasses_indestructible) {
            totalDamage += pCard.bonusDamage;
            target.removeBlock();
            events.push(this._evt(who, 'BREAK_BLOCK', `${pCard.name} rompe el bloqueo y causa +${pCard.bonusDamage}`));
          }
        }
        break;

      case 'BLOCK_AND_FORCE_CHANGE':
        caster.applyBlock(pCard._indestructible);
        events.push(this._evt(who, 'BLOCK', `${caster.name} bloquea con ${pCard.name}`));
        // La lógica de forzar cambio se verifica en CLEANUP
        blocked = true;
        break;

      case 'EVADE':
        caster.applyEvade();
        events.push(this._evt(who, 'EVADE', `${caster.name} evade con ${pCard.name}`));
        blocked = true;
        break;

      case 'DAMAGE_PER_HACKED': {
        const hackedCount = caster.hackedCount;
        totalDamage = Math.min(pCard.maxDamage, pCard.damage * hackedCount);
        events.push(this._evt(who, 'DAMAGE', `${pCard.name}: ${hackedCount} hackeadas × ${pCard.damage} = ${totalDamage}`));
        break;
      }

      case 'HACK_TOP_DECK': {
        const topCard = target.deck.peekTop();
        if (topCard) {
          target.deck.draw(); // extraer del tope
          caster.hackCard(topCard);
          events.push(this._evt(who, 'HACK', `${pCard.name} hackea: ${topCard.name}`));
        }
        break;
      }

      case 'HACK_PLAYED_CARD': {
        // hackea la carta principal del oponente
        const opCard = this.turnCtx[who === 'player' ? 'botCard' : 'playerCard'];
        if (opCard) {
          caster.hackCard(opCard);
          events.push(this._evt(who, 'HACK', `${pCard.name} hackea la carta jugada: ${opCard.name}`));
        }
        break;
      }

      case 'BIG_DAMAGE_REDUCIBLE': {
        const hacked3 = caster.hackedCount >= 3;
        if (hacked3) {
          totalDamage = pCard.damage;
        } else {
          const reduction = this.turnCtx.totalCardsPlayed * pCard.damageReducePerCard;
          totalDamage = Math.max(0, pCard.damage - reduction);
        }
        break;
      }

      case 'HACK_AND_DAMAGE_PER_HACKED': {
        const topCard2 = target.deck.draw();
        if (topCard2) caster.hackCard(topCard2);
        totalDamage = pCard.damage * caster.hackedCount;
        events.push(this._evt(who, 'HACK', `${pCard.name}: hackea y causa ${totalDamage}`));
        break;
      }

      case 'CYBER_BLOCK': {
        const indestructible = caster.hackedCount >= 3;
        caster.applyBlock(indestructible);
        events.push(this._evt(who, 'BLOCK', `Barrera Cibernética${indestructible ? ' (indestructible)' : ''}`));
        blocked = true;
        break;
      }

      // Invocador — persistentes
      case 'PERSIST_DAMAGE':
      case 'PERSIST_DAMAGE_PER_SUMMON':
      case 'PERSIST_DAMAGE_BOTH':
      case 'PERSIST_TAUNT':
      case 'PERSIST_REFLECT':
      case 'PERSIST_HEAL':
      case 'DELAY_SUMMON_CODEX':
        caster.addToField(pCard);
        events.push(this._evt(who, 'SUMMON', `${pCard.name} entra al campo`));
        break;

      // Dracodificador — delay
      case 'DELAY_DAMAGE_DESTROY_SPELLS':
      case 'DELAY_MULTI_SHIELD':
      case 'DELAY_DRAW_CARDS':
        caster.addToField(pCard);
        events.push(this._evt(who, 'DELAYED', `${pCard.name} entra en retardo (${pCard.currentDelay} turnos)`));
        break;

      default:
        if (pCard.damage > 0) totalDamage += pCard.damage;
        break;
    }

    // ── Heal acumulado ──
    if (healAmount > 0) {
      const reduction = this.turnCtx[who === 'player' ? 'playerHealReduction' : 'botHealReduction'] || 0;
      const actualHeal = Math.max(0, healAmount - reduction);
      caster.heal(actualHeal);
      events.push(this._evt(who, 'HEAL', `${caster.name} se cura ${actualHeal} HP`));
    }

    // ── Aplicar daño (verificando evasión y bloqueo) ──
    if (totalDamage > 0 && !blocked) {
      if (target.isEvading()) {
        target.removeEvade();
        events.push(this._evt(who, 'EVADED', `${target.name} evadió el ataque`));
      } else if (target.isBlocking()) {
        if (!target.statusEffects.block?.indestructible) {
          target.removeBlock();
          events.push(this._evt(who, 'BLOCKED', `El bloqueo de ${target.name} absorbe ${totalDamage}`));
        } else {
          events.push(this._evt(who, 'BLOCKED', `Bloqueo indestructible de ${target.name} resiste`));
        }
      } else {
        // Reflejar daño (Espíritu Vengativo)
        const reflectors = target.field.filter(c => c.effect === 'PERSIST_REFLECT');
        let reflectTotal = reflectors.reduce((sum, c) => sum + c.reflectDamage, 0);

        const actual = target.takeDamage(totalDamage);
        events.push(this._evt(who, 'DAMAGE', `${target.name} recibe ${actual} de daño (HP: ${target.hp})`));

        if (reflectTotal > 0) {
          const reflectActual = caster.takeDamage(reflectTotal);
          events.push(this._evt(who, 'REFLECT', `${caster.name} recibe ${reflectActual} de daño reflejado`));
        }
      }
    }

    return events;
  }

  // ─── Resolución simultánea ───────────────────────────────
  /**
   * Para cartas ofensivas simples (sin delay, sin efectos especiales),
   * calculamos el daño de AMBOS jugadores ANTES de aplicarlo para que
   * no haya ventaja por orden de resolución.
   * Para cartas con efectos especiales (delay, block, evade, etc.),
   * delegamos a _resolveCard directamente.
   */
  _resolveSimultaneous() {
    const ctx    = this.turnCtx;
    const events = [];

    // Pre-calcular daño de cada jugador antes de aplicarlo
    const pDmgPrecalc = this._precalcDamage(ctx.playerCard, ctx.playerSpells);
    const bDmgPrecalc = this._precalcDamage(ctx.botCard,    ctx.botSpells);

    // Resolver cartas del jugador (todos los efectos, incluyendo delay/block/evade)
    if (ctx.playerCard) {
      const evts = this._resolveCard(
        ctx.playerCard, ctx.playerSpells, this.player, this.bot, 'player',
        pDmgPrecalc  // daño ya pre-calculado para aplicar simultáneamente
      );
      events.push(...evts);
    }

    // Resolver cartas del bot
    if (ctx.botCard) {
      const evts = this._resolveCard(
        ctx.botCard, ctx.botSpells, this.bot, this.player, 'bot',
        bDmgPrecalc
      );
      events.push(...evts);
    }

    return events;
  }

  /**
   * Pre-calcula el daño bruto de una carta ofensiva SIN delay.
   * Retorna 0 si la carta tiene delay o no es ofensiva simple.
   */
  _precalcDamage(pCard, hSpells) {
    if (!pCard) return 0;
    // Las cartas con delay o efectos especiales no tienen "daño inmediato"
    const skipEffects = [
      'DELAY_DAMAGE_DESTROY_SPELLS', 'DELAY_MULTI_SHIELD', 'DELAY_DRAW_CARDS',
      'DELAY_SUMMON_CODEX', 'PERSIST_DAMAGE', 'PERSIST_DAMAGE_PER_SUMMON',
      'PERSIST_DAMAGE_BOTH', 'PERSIST_TAUNT', 'PERSIST_REFLECT', 'PERSIST_HEAL',
      'BLOCK_AND_FORCE_CHANGE', 'EVADE', 'CYBER_BLOCK',
    ];
    if (skipEffects.includes(pCard.effect)) return 0;
    if (!pCard.isOffensive?.()) return 0;

    let dmg = pCard.damage || 0;
    for (const h of hSpells) {
      if (h.effect === 'BOOST_OFFENSIVE_DAMAGE') dmg += (h.bonusDamage || 0);
      if (h.effect === 'DESTROY_BLOCK') {} // se procesa en _resolveCard
    }
    return dmg;
  }

  _resolveEndSpells() {
    const events = [];
    // Mercado Negro S06 — resuelve al final
    const playerMercado = this.turnCtx.playerSpells.find(h => h.effect === 'HEAL_PER_HACKED');
    const botMercado    = this.turnCtx.botSpells.find(h => h.effect === 'HEAL_PER_HACKED');

    if (playerMercado) {
      const heal = this.player.hackedCount * playerMercado.healPerHacked;
      this.player.heal(heal);
      events.push(this._evt('player', 'HEAL', `Mercado Negro: +${heal} HP`));
    }
    if (botMercado) {
      const heal = this.bot.hackedCount * botMercado.healPerHacked;
      this.bot.heal(heal);
      events.push(this._evt('bot', 'HEAL', `Mercado Negro Bot: +${heal} HP`));
    }
    return events;
  }

  // ─── Efectos persistentes ────────────────────────────────
  _processPersistedEffects() {
    for (const who of ['player', 'bot']) {
      const actor  = this[who];
      const target = who === 'player' ? this.bot : this.player;

      // Veneno / quemadura
      if (actor.statusEffects.poison) {
        const p = actor.statusEffects.poison;
        actor.takeDamage(p.damage);
        this.addLog(`${actor.name} recibe ${p.damage} de veneno. Quedan ${p.turns - 1} turnos.`);
        p.turns--;
        if (p.turns <= 0) delete actor.statusEffects.poison;
      }

      // Criaturas persistentes en campo
      const toRemove = [];
      for (const c of actor.field) {
        if (c.delay !== undefined && c.currentDelay > 0) {
          c.currentDelay--;
          if (c.currentDelay === 0) {
            // Resolver efecto del Dracodificador
            this._resolveDelayedCard(c, actor, target);
          }
          continue;
        }

        // Daño por turno
        if (c.effect === 'PERSIST_DAMAGE') {
          target.takeDamage(c.damage);
          this.addLog(`${c.name} inflige ${c.damage} a ${target.name}`);
        }
        if (c.effect === 'PERSIST_DAMAGE_PER_SUMMON') {
          const summons = actor.getFieldSummons().length - 1; // excluir esta
          const dmg = c.damage * Math.max(1, summons);
          target.takeDamage(dmg);
        }
        if (c.effect === 'PERSIST_DAMAGE_BOTH') {
          target.takeDamage(c.damage);
          actor.takeDamage(c.selfDamage || c.damage);
        }
        if (c.effect === 'PERSIST_HEAL') {
          actor.heal(c.heal);
          this.addLog(`Portal Curador: ${actor.name} se cura ${c.heal}`);
        }

        c.turnsRemaining--;
        if (c.turnsRemaining <= 0) toRemove.push(c.id);
      }
      toRemove.forEach(id => actor.removeFromField(id));
    }
  }

  _resolveDelayedCard(card, caster, target) {
    switch (card.effect) {
      case 'DELAY_DAMAGE_DESTROY_SPELLS': {
        let dmg = card.damage + (card.coupledCards?.length || 0) * card.bonusDamagePerCouple;
        target.takeDamage(dmg);
        // Destruir 2 hechizos del oponente
        const destroyed = target.field.filter(c => c.cardType === 'H').slice(0, 2);
        destroyed.forEach(c => target.removeFromField(c.id));
        this.addLog(`Aliento Compilado resuelve: ${dmg} daño + destruye ${destroyed.length} hechizos`);
        break;
      }
      case 'DELAY_MULTI_SHIELD':
        caster.applyBlock(false);
        caster.statusEffects.block.hits = card.shieldHits;
        this.addLog(`Nido de Firewall resuelve: escudo x${card.shieldHits}`);
        break;
      case 'DELAY_DRAW_CARDS': {
        const extraCards = (card.coupledCards?.length || 0);
        caster.drawCards(card.draw + extraCards);
        caster.takeDamage(extraCards * (card.selfDamagePerCouple || 10));
        this.addLog(`Sobrecarga Estructural: roba ${card.draw + extraCards} cartas`);
        break;
      }
      case 'DELAY_SUMMON_CODEX': {
        const baseDmg = (card.delay || 3) * (card.damagePerDelayTurn || 20);
        target.takeDamage(baseDmg);
        this.addLog(`Guardián de Códice: ${baseDmg} daño`);
        break;
      }
    }
    caster.removeFromField(card.id);
  }

  // ─── FASE 6: CLEANUP ──────────────────────────────────────
  phaseCleanup() {
    this.setPhase(PHASES.CLEANUP);

    // Verificar victoria
    const playerDead = this.player.isDead();
    const botDead    = this.bot.isDead();

    if (playerDead || botDead) {
      this.setPhase(PHASES.GAME_OVER);
      const winner = botDead ? 'player' : playerDead ? 'bot' : 'draw';
      this.addLog(`¡FIN DEL JUEGO! Ganador: ${winner}`, 'result');
      return { gameOver: true, winner };
    }

    // Reset turno
    this.player.resetTurn();
    this.bot.resetTurn();
    this.turn++;

    this.addLog(`--- Inicio del turno ${this.turn} ---`);
    return { gameOver: false };
  }

  // ─── Helper de eventos ───────────────────────────────────
  _evt(who, type, msg) {
    return { who, type, msg, turn: this.turn };
  }

  // ─── Snapshot del estado (para la UI) ───────────────────
  getSnapshot() {
    return {
      turn:        this.turn,
      phase:       this.phase,
      playerHp:    this.player.hp,
      botHp:       this.bot.hp,
      playerHand:  this.player.hand.length,
      botHand:     this.bot.hand.length,
      playerDeck:  this.player.deck.size,
      botDeck:     this.bot.deck.size,
      playerField: this.player.field.map(c => ({ id: c.id, name: c.name, turns: c.turnsRemaining })),
      botField:    this.bot.field.map(c => ({ id: c.id, name: c.name, turns: c.turnsRemaining })),
      playerEffects: this.player.statusEffects,
      botEffects:    this.bot.statusEffects,
      hackedCards:   this.player.hackedCount,
      log:           this.log.slice(-10),
    };
  }

  // ─── Iniciar partida ─────────────────────────────────────
  startGame() {
    this.player.deck.shuffle();
    this.bot.deck.shuffle();

    // Robo inicial: 5 cartas cada uno
    this.player.fillHand(5);
    this.bot.fillHand(5);

    this.addLog('=== ¡Partida iniciada! ===');
    this.setPhase(PHASES.VERIFY);
  }
}
