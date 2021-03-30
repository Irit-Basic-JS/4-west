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

class Traher extends Dog {
    constructor(name = "Дядя Богдан Трахер", maxPower = 5, image) {
        super(name, maxPower, image);
    }

    modifyTakenDamage(value, toCard, gameContext, continuation) { // ХЗ КАК РАБОТАЕТ И РАБОТАЕТ ЛИ ВООБЩЕ
        this.view.signalAbility(() =>
            super.modifyTakenDamage(value - 1, toCard, gameContext, continuation));
    }

}

class Gatling extends Creature {
    constructor(name = "Большая пушка", maxPower = 6, image) {
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
    constructor(name = "Фраерки Чотка", maxPower = 2, image) {
        super(name, maxPower);
        Lad.#count++;
    }

    modifyTakenDamage(value, toCard, gameContext, continuation) { // ХЗ КАК РАБОТАЕТ И РАБОТАЕТ ЛИ ВООБЩЕ
        this.view.signalAbility(() =>
            super.modifyTakenDamage(value - Lad.getBonus(), toCard, gameContext, continuation));
    }

    doBeforeRemoving (gameContext, continuation) {
        Lad.#count--;
        super.doBeforeRemoving(gameContext, continuation);
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        super.modifyDealedDamageToCreature(value + Lad.getBonus(), toCard, gameContext, continuation)
    }

    getDescriptions() {
        return ["Бригада тутутуту " ,...super.getDescriptions()]
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
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
