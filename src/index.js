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
    constructor(name = "кто?", maxPower = 1) {
        super(name, maxPower);
    }

    getDescriptions() {
        return [getCreatureDescription(this),
        super.getDescriptions()]
    }

    get currentPower() {
        return this._power;
    };
    set currentPower(value) {
        this._power = Math.min(value, this.maxPower);
    };
}

// Основа для утки.
class Duck extends Creature {
    constructor(name = "Мирная утка", maxPower = 2) {
        super(name, maxPower);
    }

    quacks = function () { console.log('quack') };
    swims = function () { console.log('float: both;') };
}


// Основа для собаки.
class Dog extends Creature {
    constructor(name = 'Пес-бандит', maxPower = 3) {
        super(name, maxPower);
    }
}

//Громила
class Trasher extends Dog {
    constructor(name = 'Громила', maxPower = 5) {
        super(name, maxPower);
    }

    modifyTakenDamage(actualValue, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(actualValue - 1));
    }

    getDescriptions() {
        return ['Получает на 1 меньше урона',
            ...super.getDescriptions()]
    }
}

//Гатлинг
class Gatling extends Duck {
    constructor(name = 'Гатлинг', maxPower = 6) {
        super(name, maxPower);
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();

        const { currentPlayer, oppositePlayer, position, updateView } = gameContext;

        taskQueue.push(onDone => this.view.showAttack(onDone));

        for (let oppositeCard of oppositePlayer.table)
            taskQueue.push(onDone => this.dealDamageToCreature(2, oppositeCard, gameContext, onDone));

        taskQueue.continueWith(continuation);
    };

    getDescriptions() {
        return ['Наносит всем противникам 2 урона',
            ...super.getDescriptions()]
    }
}

//Браток
class Lad extends Dog {
    constructor(name = 'Браток', maxPower = 2) {
        super(name, maxPower);
    }

    static getInGameCount() { return this.inGameCount || 0; }
    static setInGameCount(value) { this.inGameCount = value; }
    static getBonus() { return this.inGameCount * (this.inGameCount + 1) / 2; }

    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.setInGameCount(Lad.getInGameCount() + 1);
        continuation();
    }

    doBeforeRemoving(continuation) {
        Lad.setInGameCount(Lad.getInGameCount() - 1);
        continuation();
    }

    modifyTakenDamage(actualValue, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(actualValue - Lad.getBonus()));
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        this.view.signalAbility(() =>
            super.modifyDealedDamageToCreature(value + Lad.getBonus(), toCard, gameContext, continuation)
        )
    }

    getDescriptions() {
        if (Lad.prototype.hasOwnProperty("modifyDealedDamageToCreature") && Lad.prototype.hasOwnProperty("modifyDealedDamageToCreature"))
            return ["Их больше - они сильнее", ...super.getDescriptions()]
        return super.getDescriptions();
    }
}

//Изгой
class Rogue extends Creature {
    constructor(name = 'Изгой', maxPower = 2) {
        super(name, maxPower);
    }

    doBeforeAttack(gameContext, continuation) {
        const taskQueue = new TaskQueue();
        const { currentPlayer, oppositePlayer, position, updateView } = gameContext;
        let proto = Object.getPrototypeOf(oppositePlayer.table[position]);

        taskQueue.push(onDone => {
            if (proto.hasOwnProperty('modifyDealedDamageToCreature'))
                this['modifyDealedDamageToCreature'] = proto['modifyDealedDamageToCreature'];
            delete proto['modifyDealedDamageToCreature'];
            if (proto.hasOwnProperty('modifyDealedDamageToPlayer'))
                this['modifyDealedDamageToPlayer'] = proto['modifyDealedDamageToPlayer'];
            delete proto['modifyDealedDamageToPlayer'];
            if (proto.hasOwnProperty('modifyTakenDamage'))
                this['modifyTakenDamage'] = proto['modifyTakenDamage'];
            delete proto['modifyTakenDamage'];

            this.view.signalAbility(onDone);
            gameContext.updateView();
        });

        taskQueue.continueWith(continuation);
    }

    getDescriptions() {
        return ['Крадёт способности',
            ...super.getDescriptions()]
    }
}

//Пивовар
class Brewer extends Duck {
    constructor(name = 'Пивовар', maxPower = 2) {
        super(name, maxPower);
    }

    doBeforeAttack(gameContext, continuation) {
        const taskQueue = new TaskQueue();
        const { currentPlayer, oppositePlayer, position, updateView } = gameContext;
        let ducks = currentPlayer.table.concat(oppositePlayer.table).filter(x => isDuck(x));

        for (let i of ducks) {
            taskQueue.push(onDone => {
                i.maxPower += 1;
                i.currentPower += 2;
                i.view.signalHeal(onDone);
                i.updateView();
            });
        }

        taskQueue.continueWith(continuation);
    }

    getDescriptions() {
        return ['Восстанавливает здоровье',
            ...super.getDescriptions()]
    }
}

//Псевдоутка
class PseudoDuck extends Dog {
    constructor(name = 'Уткопёс', maxPower = 3) {
        super(name, maxPower);
    }

    quacks = function () { console.log('Woof') };
    swims = function () { console.log('byl`k') };

    getDescriptions() {
        return ['Притворяется уткой',
            ...super.getDescriptions()]
    }
}

//Мимик
class Nemo extends Creature {
    constructor(name = 'Немо', maxPower = 4) {
        super(name, maxPower);
    }

    doBeforeAttack(gameContext, continuation) {
        const taskQueue = new TaskQueue();
        const { currentPlayer, oppositePlayer, position, updateView } = gameContext;

        taskQueue.push(onDone => {
            Object.setPrototypeOf(this, Object.getPrototypeOf(oppositePlayer.table[position]));
            this.doBeforeAttack(gameContext, continuation);
            this.view.signalAbility(onDone);
            gameContext.updateView();
        });

        taskQueue.continueWith(continuation);
    }

    getDescriptions() {
        return ['копирует прототип',
            ...super.getDescriptions()]
    }
}

const seriffStartDeck = [
    new Nemo(),
];
const banditStartDeck = [
    new PseudoDuck(),
];


// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
