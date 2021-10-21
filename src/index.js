import Card from './Card.js';
import Game from './Game.js';
import TaskQueue from "./TaskQueue.js";
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
        this._currentPower = maxPower;
    }

    getDescriptions() {
        return [getCreatureDescription(this), super.getDescriptions()];
    }

    get currentPower() {
        return this._currentPower;
    }

    set currentPower(value) {
        value = Math.max(0, value);
        value = Math.min(this.maxPower, value);
        this._currentPower = value;
    }
}


class Duck extends Creature {
    constructor(name = 'Мирная утка', maxPower = 2) {
        super(name, maxPower);
    }

    quacks() {
        console.log('quack');
    };

    swims() {
        console.log('float: both;');
    };
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
        if (value > 1) {
            this.view.signalAbility(() =>
                super.modifyTakenDamage(value - 1, fromCard, gameContext, continuation));
        } else {
            this.view.signalAbility(continuation);
        }
    }

    getDescriptions() {
        const isTrasher = Trasher.prototype.hasOwnProperty('modifyTakenDamage');
        return isTrasher
            ? ['Получает на 1 меньше урона', ...super.getDescriptions()]
            : super.getDescriptions();
    }
}

class Gatling extends Creature {
    constructor(name = 'Гатлинг', maxPower = 6) {
        super(name, maxPower);
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();
        const oppositePlayer = gameContext.oppositePlayer;
        const table = oppositePlayer.table;

        for (let position = 0; position < table.length; position++) {
            const card = table[position];
            taskQueue.push(onDone => {
                this.view.showAttack(onDone);
                this.dealDamageToCreature(2, card, gameContext, onDone);
            });
        }

        taskQueue.continueWith(continuation);
    }
}

class Lad extends Dog {
    constructor(name = 'Браток', startPower = 2) {
        super(name, startPower);
    }

    static getInGameCount() {
        return this.inGameCount || 0;
    }

    static seInGameCount(value) {
        this.inGameCount = value;
    }

    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.seInGameCount(Lad.getInGameCount() + 1);
        super.doAfterComingIntoPlay(gameContext, continuation);

    }

    doBeforeRemoving(continuation) {
        Lad.seInGameCount(Lad.getInGameCount() - 1);
        super.doBeforeRemoving(continuation);
    }

    static getBonus() {
        return this.getInGameCount() * (this.getInGameCount() + 1) / 2;
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        super.modifyDealedDamageToCreature(value + Lad.getBonus(), toCard, gameContext, continuation);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        super.modifyTakenDamage(value - Lad.getBonus(), fromCard, gameContext, continuation);
    }

    getDescriptions() {
        const isLad = Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature') && Lad.prototype.hasOwnProperty(
            'modifyTakenDamage');
        return isLad
            ? ['Чем их больше, тем они сильнее', ...super.getDescriptions()]
            : super.getDescriptions();
    }
}

class Rogue extends Creature {
    constructor(name = 'Изгой', maxPower = 2) {
        super(name, maxPower);
    }


    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        const toSteal = ["modifyDealedDamageToCreature", "modifyDealedDamageToPlayer", "modifyTakenDamage"];
        const cardPrototype = Object.getPrototypeOf(toCard);
        for (const property of toSteal) {
            if (cardPrototype.hasOwnProperty(property)) {
                this[property] = cardPrototype[property];
                delete cardPrototype[property];
            }
        }

        gameContext.updateView();
        super.modifyDealedDamageToCreature(value, toCard, gameContext, continuation);
    }

}

class Brewer extends Duck {
    constructor(name = 'Пивовар', maxPower = 2) {
        super(name, maxPower);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        const {currentPlayer, oppositePlayer} = gameContext;
        const cards = currentPlayer.table.concat(oppositePlayer.table);

        const taskQueue = new TaskQueue();
        for (const card of cards.filter(card => isDuck(card))) {
            taskQueue.push(onDone => {
                card.maxPower += 1;
                card.currentPower += 2;
                card.updateView();
                card.view.signalHeal(onDone);
            });

        }

        taskQueue.continueWith(continuation);
    }

}

class PseudoDuck extends Dog {
    constructor(name = 'Псевдоутка', maxPower = 3) {
        super(name, maxPower);
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

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        Object.setPrototypeOf(this, Object.getPrototypeOf(toCard));
        this.doBeforeAttack(gameContext, continuation);
        gameContext.updateView();
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
