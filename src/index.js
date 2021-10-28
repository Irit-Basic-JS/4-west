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

    getDescriptions() {
        return [getCreatureDescription(this), ...super.getDescriptions()];
    }
}

// Основа для утки.
class Duck extends Creature {
    constructor(name = "Мирная утка", maxPower = 2, image) {
        super(name, maxPower, image);
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
        super(name, maxPower, image);
    }
}

class Trasher extends Dog {
    constructor(name = "Громила", maxPower = 5, image) {
        super(name, maxPower, image);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(value - 1));
    }

    getDescriptions() {
        let descriptions = [];
        if (Trasher.prototype.hasOwnProperty('modifyTakenDamage')) {
            descriptions = ["Получает на 1 меньше урона"];
        }
        return descriptions.concat([...super.getDescriptions()]);
    }
}

class Gatling extends Creature {
    constructor(name = "Гатлинг", maxPower = 6, image) {
        super(name, maxPower, image);
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();
        const oppositeCards = gameContext.oppositePlayer.table;
        console.log(oppositeCards.length);
        if (oppositeCards.length !== 0) {
            for (let oppositeCard of oppositeCards) {
                taskQueue.push(onDone => this.view.showAttack(onDone));
                taskQueue.push(onDone => {
                    this.dealDamageToCreature(2, oppositeCard, gameContext, onDone);
                });
            }
        } else {
            taskQueue.push(onDone => this.view.showAttack(onDone));
            taskQueue.push(onDone => {
                this.dealDamageToPlayer(1, gameContext, onDone);
            });
        }

        taskQueue.continueWith(continuation);
        game.updateView();
    };
}

class Lad extends Dog {
    constructor(name = "Браток", maxPower = 2, image) {
        super(name, maxPower, image);
        this.inGameCount = 0;
    }

    static getInGameCount() {
        return this.inGameCount || 0;
    }

    static setInGameCount(value) {
        this.inGameCount = value;
    }

    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.setInGameCount(Lad.getInGameCount() + 1);
        continuation();
    }

    doBeforeRemoving(gameContext, continuation) {
        Lad.setInGameCount(Lad.getInGameCount() - 1);
        continuation();
    }

    static getBonus() {
        return this.getInGameCount() * (this.getInGameCount() + 1) / 2;
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        continuation(value + Lad.getBonus());
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(value - Lad.getBonus()));
    }

    getDescriptions() {
        let descriptions = [];
        if (Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature') ||
            Lad.prototype.hasOwnProperty('modifyTakenDamage')) {
            descriptions = ["Чем их больше, тем они сильнее"];
        }
        return descriptions.concat([...super.getDescriptions()]);
    }
}

const seriffStartDeck = [
    new Duck(),
    new Duck(),
    new Duck(),
];
const banditStartDeck = [
    new Lad(),
    new Lad(),
];

// Создание игры.
const
    game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate
    .set(
        1
    )
;

// Запуск игры.
game
    .play(
        false
        , (
            winner
        ) => {
            alert(
                'Победил '
                +
                winner
                    .name
            )
            ;
        }
    )
;
