import Card from './Card.js';
import Game from './Game.js';
import TaskQueue from './TaskQueue.js';
import SpeedRate from './SpeedRate.js';

// Отвечает является ли карта уткой.
function isDuck(card) {
    return card && card.quacks && card.swims;
}

// Отвечает является ли карта собакой.
function isDog(card) {
    return card instanceof Dog;
}

// Дает описание существа по схожести с утками и собаками
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
    constructor(name, maxPower, image) {
        super(name, maxPower, image);
    }

    get power() {
        return this.currentPower;
    }

    set power(value) {
        this.currentPower = Math.min(this.maxPower, this.currentPower + value);
    }

    getDescriptions() {
        return [getCreatureDescription(this), super.getDescriptions()]
    }
}

// Основа для утки.
class Duck extends Creature {
    constructor(name = "Мирная утка", maxPower = 2, image) {
        super(name, maxPower);
    }

    quacks() {
        console.log('quack')
    };

    swims() {
        console.log('float: both;')
    };
}

// Основа для собаки.
class Dog extends Creature {
    constructor(name = "Пес-бандит", maxPower = 3, image) {
        super(name, maxPower);
    }
}

class Trasher extends Dog {
    constructor(name = "Большой злой дядя", maxPower = 5, image) {
        super(name, maxPower, image);
    }

    modifyTakenDamage(value, toCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(value - 1))
    }

}

class Gatling extends Creature {
    constructor(name = "Рембо с БОЛЬШОЙ пушкой", maxPower = 6, image) {
        super(name, maxPower);
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();

        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;

        taskQueue.push(onDone => this.view.showAttack(onDone));
        const enemies = gameContext.oppositePlayer.table;
        for (const enemy of gameContext.oppositePlayer.table) {
            if (enemies) {
                taskQueue.push(onDone => {
                    this.dealDamageToCreature(this.currentPower, enemy, gameContext, onDone);
                });
            } else {
                taskQueue.push(onDone => this.dealDamageToPlayer(1, gameContext, onDone));
            }
        }

        taskQueue.continueWith(continuation);
    }
}

class Lad extends Dog {
    static #count = 0;

    static getBonus() {
        return Lad.#count * (Lad.#count + 1) / 2;
    }

    constructor(name = "Бригада, туудуду", maxPower = 2, image) {
        super(name, maxPower, image);
    }

    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.#count++;
        super.doAfterComingIntoPlay(gameContext, continuation);
    }

    modifyTakenDamage(value, toCard, gameContext, continuation) {
        this.view.signalAbility(() =>
            super.modifyTakenDamage(value - Lad.getBonus(), toCard, gameContext, continuation));
    }

    doBeforeRemoving(gameContext, continuation) {
        Lad.#count--;
        super.doBeforeRemoving(gameContext, continuation);
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        super.modifyDealedDamageToCreature(value + Lad.getBonus(), toCard, gameContext, continuation)
    }

    getDescriptions() {
        if (Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature'))
            return ["Бригада, вместе мы сильнее ", ...super.getDescriptions()];
        return super.getDescriptions();
    }
}

class Rogue extends Creature {
    constructor(name = "Воришка Баллов", maxPower = 2, image) {
        super(name, maxPower, image);
    }

    doBeforeAttack (gameContext, continuation) {
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;

        if(oppositePlayer.table[position]) {
            let cardOpponent = Object.getPrototypeOf(oppositePlayer.table[position]);
            if (cardOpponent.modifyDealedDamageToCreature) {
                this["modifyDealedDamageToCreature"] = cardOpponent["modifyDealedDamageToCreature"];
                delete cardOpponent["modifyDealedDamageToCreature"];
            }
            if (cardOpponent.modifyTakenDamage) {
                this["modifyTakenDamage"] = cardOpponent["modifyTakenDamage"];
                delete cardOpponent["modifyTakenDamage"];
            }
            if (cardOpponent.modifyDealedDamageToPlayer) {
                this["modifyDealedDamageToPlayer"] = cardOpponent["modifyDealedDamageToPlayer"];
                delete cardOpponent["modifyDealedDamageToPlayer"];
            }
        }

        updateView();
        continuation();
    };
}

class Brewer extends Duck {
    constructor(name = "Пивовар Жигуля", maxPower = 2, image) {
        super(name, maxPower);
    }

    doBeforeAttack (gameContext, continuation) {
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        let allCards = currentPlayer.table.concat(oppositePlayer.table)

        for (let card of allCards) {
            if (isDuck(card)) {
                card.maxPower += 1;
                card.power += 2;
            }
        }

        this.view.signalHeal(continuation)

        updateView();
    };
}

class PseudoDuck extends Dog {
    constructor(name = "Псайдак", maxPower = 3, image) {
        super(name, maxPower);
    }

    quacks() {
        console.log('quack')
    };

    swims() {
        console.log('float: both;')
    };
}

class Nemo extends Creature {
    constructor(name = "Немо", maxPower = 4, image) {
        super(name, maxPower);
    }

    getDescriptions() {
        return ["The one without a name without an honest heart as compass", ...super.getDescriptions()];
    }

    doBeforeAttack (gameContext, continuation) {
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;

        if(oppositePlayer.table[position]) {
            let cardOpponent = Object.getPrototypeOf(oppositePlayer.table[position]);
            Object.setPrototypeOf(this, cardOpponent);
        }

        updateView();
        continuation( this.doBeforeAttack(gameContext, continuation));

    };
}

const seriffStartDeck = [
    new Nemo(),
];
const banditStartDeck = [
    new Brewer(),
    new Brewer(),
];

// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(1.5);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});