import Game from './Game.js';
import Card from './Card.js';
import TaskQueue from './TaskQueue.js';
import SpeedRate from './SpeedRate.js';

function isDuck(card) {
    return (card instanceof Duck || card instanceof PseudoDuck) && card.quacks && card.swims;
}

function isDog(card) {
    return card instanceof Dog;
}

function isTrasher(card) {
    return card instanceof Trasher;
}

function isGatling(card) {
    return card instanceof Gatling;
}

function isLad(card) {
    return card instanceof Lad;
}

function isRogue(card) {
    return card instanceof Rogue;
}

export default function getCreatureDescription(card) {
    if (isDuck(card) && isDog(card)) return 'Утка-Собака';
    if (isDuck(card)) return 'Утка';
    if (isDog(card)) return 'Собака';
    if (isTrasher(card)) return 'Громила';
    if (isGatling(card)) return 'Гатлинг';
    if (isLad(card)) return 'Браток';
    if (isRogue(card)) return 'Изгой';
    return 'Существо';
}

class Creature extends Card {
    constructor(name, maxPower) {
        super(name, maxPower);
        this._currentPower = maxPower;
    }

    get currentPower() {
        return this._currentPower;
    }

    set currentPower(value) {
        this._currentPower = value > this.maxPower ? this.maxPower : value;
    }

    getDescriptions() {
        return [getCreatureDescription(this), ...super.getDescriptions()];
    }
}

class Duck extends Creature {
    constructor(name = 'Мирная утка', maxPower = 2) {
        super(name, maxPower);
    }

    quacks() {
        console.log('quack');
    }

    swims() {
        console.log('float: both;');
    }
}

class Dog extends Creature {
    constructor(name = 'Пес-бандит', maxPower = 3) {
        super(name, maxPower);
    } 
}

class Trasher extends Dog {
    constructor(name = 'Громила', maxPower = 5) {
        super(name, maxPower);
    }
    
    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(value - 1));
    }

    getDescriptions() {
        return [...super.getDescriptions(), 'Для уток все становится плохо, когда он появляется в рядах бандитов'];
    }
}

class Gatling extends Creature {
    constructor(name = 'Гатлинг', maxPower = 6) {
        super(name, maxPower);
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();

        taskQueue.push(onDone => this.view.showAttack(onDone));
        for(let card of gameContext.oppositePlayer.table)
            taskQueue.push(onDone => this.dealDamageToCreature(2, card, gameContext, onDone));

        taskQueue.continueWith(continuation);
        game.updateView();
    }

    getDescriptions() {
        return [...super.getDescriptions(), 'Не утка, а просто пушка!'];
    }
}

class Lad extends Dog {
    constructor(name = 'Браток', maxPower = 2) {
        super(name, maxPower);
    }

    static getInGameCount() {
        return this.inGameCount || 0;        
    }

    static setInGameCount(value) {
        this.inGameCount = value;
    }

    static getCurrentBonus() {
        const count = this.getInGameCount();
        return count * (count + 1) / 2;
    }

    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.setInGameCount(Lad.getInGameCount() + 1);
        super.doAfterComingIntoPlay(gameContext, continuation);
    }

    doBeforeRemoving(continuation) {
        Lad.setInGameCount(Lad.getInGameCount() - 1);
        super.doBeforeRemoving(continuation);
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        super.modifyDealedDamageToCreature(value + Lad.getCurrentBonus(), toCard, gameContext, continuation);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        super.modifyTakenDamage(value - Lad.getCurrentBonus(), fromCard, gameContext, continuation);
    }

    getDescriptions() {
        if (Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature') || Lad.prototype.hasOwnProperty('modifyTakenDamage')) 
            return [...super.getDescriptions(), 'Чем их больше, тем они сильнее'];
        return super.getDescriptions();
    }
}

class Rogue extends Creature {
    constructor(name = 'Изгой', maxPower = 2) {
        super(name, maxPower);
    }

    doBeforeAttack(gameContext, continuation) {
        const {oppositePlayer, position, updateView} = gameContext;
        const properties = ['modifyDealedDamageToCreature', 'modifyDealedDamageToPlayer', 'modifyTakenDamage'];
        const card = Object.getPrototypeOf(oppositePlayer.table[position]);
        for (let property of properties)
            if (card.hasOwnProperty(property)) {
                this[property] = card[property];
                delete card[property];
            }
        updateView();
        continuation();
    }

    getDescriptions() {
        return [...super.getDescriptions(), 'От него все бегут, потому что он приходит и отнимает силы'];
    }
}

class Brewer extends Duck {
    constructor(name = 'Пивовар', maxPower = 2) {
        super(name, maxPower);
    }

    doBeforeAttack(gameContext, continuation) {
        const {currentPlayer, oppositePlayer, updateView} = gameContext;
        for (let card of currentPlayer.table.concat(oppositePlayer.table)) {
            if (isDuck(card)) {
                card.maxPower += 1;
                card.currentPower += 2;
            }
            this.view.signalHeal(continuation);
        }
        updateView();
        continuation();
    }

    getDescriptions() {
        return [...super.getDescriptions(), 'Губит уток не пиво, а его отсутствие'];
    }
}

class PseudoDuck extends Dog {
    constructor(name = 'Псевдоутка', maxPower = 3) {
        super(name, maxPower);
    }

    quacks() {
        console.log('quack');
    }

    swims() {
        console.log('float: both;');
    }

    getDescriptions() {
        return [...super.getDescriptions(), 'Уткопес, жаждущий пенного'];
    }
}

class Nemo extends Creature {
    constructor(name = 'Немо', maxPower = 4) {
        super(name, maxPower);
    }

    doBeforeAttack(gameContext, continuation) {
        const {oppositePlayer, position, updateView} = gameContext;
        Object.setPrototypeOf(this, Object.getPrototypeOf(oppositePlayer.table[position]));
        updateView();
        continuation(this.doBeforeAttack(gameContext, continuation));
    }

    getDescriptions() {
        return [...super.getDescriptions(), 'The one without a name without an honest heart as compass'];
    }
}

const seriffStartDeck = [
    new Nemo(),
];

const banditStartDeck = [
    new Brewer(),
    new Brewer(),

];

const game = new Game(seriffStartDeck, banditStartDeck);

SpeedRate.set(1);

game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
