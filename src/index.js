import Card from './Card.js';
import Game from './Game.js';
import TaskQueue from './TaskQueue.js';
import SpeedRate from './SpeedRate.js';

function isDuck(card) {
    return card && card.quacks && card.swims;
}

function isDog(card) {
    return card instanceof Dog;
}

function getCreatureDescription(card) {
    if (isDuck(card) && isDog(card)) {
        return 'Утка-Собака';
    }
    if (isDuck(card)) {
        return 'Утка';
    }
    if (isDog(card)) {
        return 'Собака';
    }
    return 'Существо';
}

class Creature extends Card {
    constructor(name, maxPower) {
        super(name, maxPower);
    }

    get currentPower() {
        return this._currentPower;
    }

    set currentPower(value) {
        this._currentPower = Math.min(Math.max(value, 0), this.maxPower);
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
        console.log('quack')
    }

    swims() {
        console.log('float: both;')
    }
}

class Dog extends Creature {
    constructor(name = 'Пес-бандит', maxPower = 3) {
        super(name, maxPower);
    }
}

class Trasher extends Dog {
    constructor() {
        super('Громила', 5);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        const bonus = 1;
        if (value > bonus) {
            this.view.signalAbility(() => super.modifyTakenDamage(value - bonus, fromCard, gameContext, continuation));
        } else {
            this.view.signalAbility(continuation);
        }
    }

    getDescriptions() {
        const isTrasher = Trasher.prototype.hasOwnProperty('modifyTakenDamage');
        return isTrasher ? ['Получает на 1 меньше урона', ...super.getDescriptions()] : super.getDescriptions();
    }
}

class Gatling extends Creature {
    constructor(name = 'Гатлинг', maxPower = 6) {
        super(name, maxPower);
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();
        const oppositePlayer = gameContext.oppositePlayer;
        const oppositeTable = oppositePlayer.table

        oppositeTable.forEach(oppositeCard => {
            if (oppositeCard) {
                taskQueue.push(onDone => {
                    this.view.showAttack(() => this.dealDamageToCreature(2, oppositeCard, gameContext, onDone));
                });
            }
        });

        taskQueue.continueWith(continuation);
    }
}

class Lad extends Dog {
    static #inGameCount = 0;

    constructor() {
        super('Браток', 2);
    }

    static get inGameCount() {
        return this.#inGameCount;
    }

    static getBonus() {
        return 0.5 * this.#inGameCount * (this.#inGameCount + 1);
    }

    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.#inGameCount += 1;
        super.doAfterComingIntoPlay(gameContext, continuation);
    }

    doBeforeRemoving(continuation) {
        Lad.#inGameCount -= 1;
        super.doBeforeRemoving(continuation);
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        this.view.signalAbility(() => super.modifyDealedDamageToCreature(value + Lad.getBonus(), toCard, gameContext, continuation));
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        const bonus = Lad.getBonus();
        if (value >= bonus) {
            this.view.signalAbility(() => super.modifyTakenDamage(value - bonus, fromCard, gameContext, continuation));
        } else {
            this.view.signalAbility(continuation);
        }
    }

    getDescriptions() {
        const requiredAbilities = ['modifyDealedDamageToCreature', 'modifyDealedDamageToPlayer']
        const isLad = requiredAbilities.some(ability => Lad.prototype.hasOwnProperty(ability));
        return isLad
            ? ['Чем их больше, тем они сильнее', ...super.getDescriptions()]
            : super.getDescriptions();
    }
}

class Rogue extends Creature {
    constructor(name = 'Изгой', maxPower = 2) {
        super(name, maxPower);
    }

    doBeforeAttack(gameContext, continuation) {
        const taskQueue = new TaskQueue();
        const targetAbilities = ['modifyDealedDamageToCreature', 'modifyDealedDamageToPlayer', 'modifyTakenDamage'];

        const position = gameContext.position;
        const oppositePlayer = gameContext.oppositePlayer;
        const oppositeCard = oppositePlayer.table[position];

        if (oppositeCard) {
            taskQueue.push(onDone => {
                const oppositeCardPrototype = Object.getPrototypeOf(oppositeCard);
                targetAbilities.forEach(ability => {
                    if (oppositeCardPrototype.hasOwnProperty(ability)) {
                        this[ability] = oppositeCardPrototype[ability];
                        delete oppositeCardPrototype[ability]
                    }
                });
                this.view.signalAbility(onDone);
                gameContext.updateView();
            });
        }

        taskQueue.continueWith(continuation);
    }
}

class Brewer extends Duck {
    constructor() {
        super('Пивовар', 2);
    }

    doBeforeAttack(gameContext, continuation) {
        const taskQueue = new TaskQueue();

        const currentPlayer = gameContext.currentPlayer;
        const oppositePlayer = gameContext.oppositePlayer;
        const allCards = currentPlayer.table.concat(oppositePlayer.table);

        allCards.filter(isDuck).forEach(duck => {
            taskQueue.push(onDone => {
                duck.maxPower += 1;
                duck.currentPower += 2;
                duck.view.signalHeal(onDone);
                duck.updateView();
            });
        });

        taskQueue.continueWith(continuation);
    }
}

class PseudoDuck extends Dog {
    constructor() {
        super('Псевдоутка', 3);
    }

    quacks() {
    }

    swims() {
    }
}

class Nemo extends Creature {
    constructor(name = 'Немо', maxPower = 4) {
        super(name, maxPower);
    }

    doBeforeAttack(gameContext, continuation) {
        const taskQueue = new TaskQueue();

        const position = gameContext.position;
        const oppositePlayer = gameContext.oppositePlayer;
        const oppositeCard = oppositePlayer.table[position];

        if (oppositeCard) {
            taskQueue.push(onDone => {
                const oppositeCardPrototype = Object.getPrototypeOf(oppositeCard);
                Object.setPrototypeOf(this, oppositeCardPrototype);
                Object.setPrototypeOf(oppositeCard, Creature.prototype);
                this.view.signalAbility(() => this.doBeforeAttack(gameContext, onDone));
                gameContext.updateView();
            });
        }

        taskQueue.continueWith(continuation);
    }
}

const sheriffStartDeck = [
    new Duck(),
    new Gatling(),
    new Nemo(),
    new Rogue(),
    new Nemo(),
];
const banditStartDeck = [
    new Brewer(),
    new Lad(),
    new Nemo(),
    new Lad(),
    new PseudoDuck(),
];

const game = new Game(sheriffStartDeck, banditStartDeck);

SpeedRate.set(1);

game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
