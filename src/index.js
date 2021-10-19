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
    constructor(name, power, image) {
        super(name, power, image);
    }

    get power() {
        return this.currentPower;
    }

    set power(value) {
        this.currentPower = Math.min(this.maxPower, this.currentPower + value);
    }

    getDescriptions() {
        return [getCreatureDescription(this)].concat(super.getDescriptions());
    }
}

class Duck extends Creature {
    constructor(name = 'Мирная утка', power = 2, image = 'duck.png') {
        super(name, power, image);
    }

    quacks() {
        console.log('quack');
    }

    swims() {
        console.log('float: both;');
    }
}

class Dog extends Creature {
    constructor(name = 'Пес-бандит', power = 3, image = 'dog.png') {
        super(name, power, image);
    }
}

class Trasher extends Dog {
    constructor() {
        super('Громила', 5, 'trasher.png');
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
        super('Гатлинг', 6, 'gatling.png');
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();

        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;

        for (let oppositeCard of oppositePlayer.table) {
            if (oppositeCard) {
                taskQueue.push(onDone => this.view.showAttack(onDone));
                taskQueue.push(onDone =>
                    this.dealDamageToCreature(2, oppositeCard, gameContext, onDone)
                );
            }
        }

        taskQueue.continueWith(continuation);
    }

    getDescriptions() {
        return ['При атаке наносит 2 урона по очереди всем картам противника на столе'].concat(super.getDescriptions());
    }
}

class Lad extends Dog {
    constructor() {
        super('Браток', 2, 'lad.png');
    }

    static get InGameCount() {
        return this._inGameCount || 0;
    }

    static set InGameCount(value) {
        this._inGameCount = value;
    }

    static getBonus() {
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

class Rogue extends Creature {
    constructor() {
        super('Изгой', 2, 'rogue.png');
    }

    doBeforeAttack(gameContext, continuation) {
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        this.view.signalAbility(() => {
            let cardPrototype = Object.getPrototypeOf(oppositePlayer.table[position]);
            let stolenAbilities = ['modifyDealedDamageToCreature', 'modifyDealedDamageToPlayer', 'modifyTakenDamage']
                .filter(a => cardPrototype.hasOwnProperty(a));
            stolenAbilities.forEach(a => this[a] = cardPrototype[a]);
            stolenAbilities.forEach(a => delete cardPrototype[a]);
            updateView();
            continuation();
        });
    }

    getDescriptions() {
        return ['Перед атакой на карту забирает у нее все способности к увеличению наносимого урона или уменьшению получаемого урона']
            .concat(super.getDescriptions());
    }

}

class Brewer extends Duck {
    constructor() {
        super('Пивозавр', 2, 'beerzaur.png');
    }

    doBeforeAttack(gameContext, continuation) {
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        let cards = currentPlayer.table.concat(oppositePlayer.table);
        this.view.signalAbility(() => {
            for (let card of cards) {
                if (isDuck(card))
                    card.view.signalHeal(() => {
                        card.maxPower += 1;
                        card.power += 2;
                        card.updateView();
                    });
            }
            continuation();
        });
    }

    getDescriptions() {
        return ['Перед атакой на карту Пивозавр раздает пиво, которое изменяет максимальную силу утки на +1, а текущую силу на +2']
            .concat(super.getDescriptions());
    }
}

class PseudoDuck extends Dog {
    constructor() {
        super('Псевдоутка', 3, 'pseudoduck.png');
    }

    quacks() {
        console.log('woack');
    }

    swims() {
        console.log('float: both;');
    }
}

class Nemo extends Creature {
    constructor() {
        super('Немо', 4, 'nemo.png');
    }

    doBeforeAttack(gameContext, continuation) {
        this.view.signalAbility(() => {
            const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
            let oppositeCard = oppositePlayer.table[position];
            let cardPrototype = Object.getPrototypeOf(oppositeCard);
            Object.setPrototypeOf(this, cardPrototype);
            Object.setPrototypeOf(oppositeCard, new Creature(oppositeCard.name, oppositeCard.currentPower));
            this.updateView();
            oppositeCard.updateView();
            this.doBeforeAttack(gameContext, continuation)
            continuation();
        });
    }

    getDescriptions() {
        return ['Перед атакой на карту Немо крадет все ее способности']
            .concat(super.getDescriptions());
    }
}

const seriffStartDeck = [
    new Duck(),
    new Gatling(),
    new Rogue(),
    new Brewer(),
    new Nemo()
];
const banditStartDeck = [
    new Dog(),
    new Trasher(),
    new Lad(),
    new Lad(),
    new PseudoDuck()
];

// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
