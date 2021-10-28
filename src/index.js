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
    constructor(name, maxPower) {
        super(name, maxPower);
    }

    getDescriptions() {
        return [getCreatureDescription(this),
            ...super.getDescriptions()];
    }
}

// Основа для утки.
//class
class Duck extends Creature {
    constructor(name = 'Мирная утка', maxPower = 2) { super(name, maxPower); }

    quacks = function () { console.log('quack') };

    swims = function () { console.log('float: both;') };
}


// Основа для собаки.
class Dog extends Creature{
    constructor(name = 'Пес-бандит', maxPower = 3){ super(name, maxPower); }
}

class Trasher extends Dog {
    constructor(name = 'Громила', maxPower = 5) { super(name, maxPower); }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(value - 1));
    }

    getDescriptions() {
        return ['Получаемый урон уменьшен на 1',
            ...super.getDescriptions()];
    }
}

class Gatling extends Creature {
    constructor(name = 'Гатлинг', maxPower = 6) { super(name, maxPower); }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();
        const oppositeCards = gameContext.oppositePlayer.table;

        for(let oppositeCard of oppositeCards)
            taskQueue.push(onDone =>
                this.view.showAttack(() =>
                    this.dealDamageToCreature(2,oppositeCard, gameContext, onDone)));

        taskQueue.continueWith(continuation);
        game.updateView();
    }

    getDescriptions() {
        return ['При атаке наносит 2 урона по очереди всем картам противника на столе',
            ...super.getDescriptions()];
    }
}

class Lad extends Dog {
    constructor(name = 'Браток', maxPower = 2) { super(name, maxPower); }

    static getInGameCount() { return this.inGameCount || 0; }
    static setInGameCount(value) { this.inGameCount = value; }
    static getBonus() {return this.getInGameCount() * (this.getInGameCount() + 1) / 2;}

    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.setInGameCount(Lad.getInGameCount() + 1);
        continuation();
    }

    doBeforeRemoving(gameContext, continuation) {
        Lad.setInGameCount(Lad.getInGameCount() - 1);
        continuation();
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(value + Lad.getBonus()));
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(value - Lad.getBonus()));
    }

    getDescriptions() {
        if (Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature')
            || Lad.prototype.hasOwnProperty('modifyTakenDamage'))
            return [ 'Чем их больше, тем они сильнее',
                ...super.getDescriptions()];
        return super.getDescriptions();
    }
}

class Rogue extends Creature {
    constructor(name = 'Изгой', maxPower = 2) { super(name, maxPower); }

    doBeforeAttack(gameContext, continuation) {
        const {oppositePlayer, position, updateView} = gameContext;
        const abilities = ["modifyDealedDamageToCreature", "modifyDealedDamageToPlayer", "modifyTakenDamage"];
        const oppositeCard = Object.getPrototypeOf(oppositePlayer.table[position]);
        for (let ability of abilities)
            if (oppositeCard.hasOwnProperty(ability)) {
                this[ability] = oppositeCard[ability];
                delete oppositeCard[ability]
            }
        updateView();
        continuation();
    }

    getDescriptions() {
        return ["Перед атакой забирает у карты все способности к увеличению наносимого урона или уменьшению получаемого урона",
            ...super.getDescriptions()];
    }
}

class Brewer extends Duck {
    constructor(name = 'Пивовар', maxPower = 2) { super(name, maxPower); }

    doBeforeAttack(gameContext, continuation) {
        const {currentPlayer, oppositePlayer, updateView} = gameContext;

        for (let card of currentPlayer.table.concat(oppositePlayer.table)) {
            if (isDuck(card)) {
                card.view.signalHeal(() => {
                    card.maxPower += 1;
                    card.power += 2;
                });
            }
        }

        updateView();
        continuation();
    }

    getDescriptions() {
        return ['Перед атакой раздает пиво, увеличивающее силу карты на 1, а затем текущую силу на 2',
            ...super.getDescriptions()];
    }
}

class PseudoDuck extends Dog {
    constructor(name = 'Псевдоутка', maxPower = 3) { super(name, maxPower); }

    swims() {}
    quacks() {}

    getDescriptions() {
        return ['Собака, но утка',
            ...super.getDescriptions()];
    }
}

class Nemo extends Duck {
    constructor(name = 'Немо', maxPower = 4) { super(name, maxPower); }

    doBeforeAttack(gameContext, continuation) {
        const {oppositePlayer, position, updateView} = gameContext;
        const oppositeCard = oppositePlayer.table[position];

        if (oppositeCard) {
            Object.setPrototypeOf(this, Object.getPrototypeOf(oppositeCard));
            updateView();
            continuation();
        }
    }

    getDescriptions() {
        return [
            "Перед атакой крадет способности врага",
            ...super.getDescriptions(),
        ]
    }
}

// Колода Шерифа, нижнего игрока.
const seriffStartDeck = [
    new Nemo(),
    new Brewer(),
    new Duck(),
    new Duck(),

];

// Колода Бандита, верхнего игрока.
const banditStartDeck = [
    new Gatling(),
    new Gatling(),
    new Dog(),
];

// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
