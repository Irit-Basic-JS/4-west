import Card from './Card.js';
import Game from './Game.js';
import SpeedRate from './SpeedRate.js';
import TaskQueue from "./TaskQueue.js";

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
    constructor(name, power) {
        super(name, power);
    }

    getDescriptions() {
        return [getCreatureDescription(this)].concat(super.getDescriptions());
    }
}

class Duck extends Creature {
    constructor() {
        super('Мирная утка', 2);
    }

    quacks() {
        console.log('quack');
    }

    swims() {
        console.log('float: both;');
    }
}

class Dog extends Creature {
    constructor(name = 'Пес-бандит', power = 3) {
        super(name, power);
    }
}

class Trasher extends Dog {
    constructor() {
        super('Громила', 5);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() =>
            continuation(value - 1));
    }

    getDescriptions() {
        return ['Если Громилу атакуют, то он получает на 1 меньше урона'].concat(super.getDescriptions());
    }
}

class Gatling extends Creature {
    constructor() {
        super('Гатлинг', 6);
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();

        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;

        for (let oppositeCard of oppositePlayer.table) {
            taskQueue.push(onDone => this.view.showAttack(onDone));
            taskQueue.push(onDone =>
                this.dealDamageToCreature(2, oppositeCard, gameContext, onDone));
        }

        taskQueue.continueWith(continuation);
    }
}

class Lad extends Dog {
    constructor() {
        super('Браток', 2);
    }

    static get InGameCount() {
        return this._inGameCount || 0;
    }

    static set InGameCount(value) {
        this._inGameCount = value;
    }

    static getBonus() {
        console.log(this.InGameCount * (this.InGameCount + 1) / 2)
        return this.InGameCount * (this.InGameCount + 1) / 2
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        this.view.signalAbility(() =>
            continuation(value + Lad.getBonus()));
    }

    modifyTakenDamage(value, toCard, gameContext, continuation) {
        this.view.signalAbility(() =>
            continuation(value - Lad.getBonus()));
    }

    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.InGameCount += 1;
        continuation();
    }

    doBeforeRemoving(continuation) {
        Lad.InGameCount -= 1;
        continuation();
    }

    getDescriptions() {
        let description = super.getDescriptions();
        if (Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature')
            && Lad.prototype.hasOwnProperty('modifyTakenDamage'))
            description.unshift('Чем больше братков находится в игре, тем больше урона без потерь поглощается' +
                ' и больше урона по картам наносится каждым из них');
        return description;
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
