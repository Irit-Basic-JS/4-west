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
    constructor(name = "Существо", maxPower = 1) {
        super(name, maxPower);
    }

    get currentPower() {
        return this.power;
    };

    set currentPower(value) {
        this.power = Math.min(Math.max(value, 0), this.maxPower);
    };

    getDescriptions() {
        return [getCreatureDescription(this),
        ...super.getDescriptions()];
    }
}

class Duck extends Creature {
    constructor(name = "Мирная утка", maxPower = 2) {
        super(name, maxPower);
    }

    quacks = function () { console.log('quack') };
    swims = function () { console.log('float: both;') };
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
    };

    getDescriptions() {
        return ['Получает на 1 меньше урона.',
            ...super.getDescriptions()];
    }
}

class Gatling extends Creature {
    constructor(name = 'Гатлинг', maxPower = 6) {
        super(name, maxPower);
    }

    attack(gameContext, continuation) {
        gameContext.oppositePlayer.table.forEach(card => {
            this.dealDamageToCreature(2, card, gameContext, continuation);
        });
    }

    getDescriptions() {
        return ['Стреляет по вражеским картам очередью.',
            ...super.getDescriptions()];
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

    static getBonus() {
        return this.inGameCount * (this.inGameCount + 1) / 2;
    }

    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.setInGameCount(Lad.getInGameCount() + 1);
        continuation();
    }

    doBeforeRemoving(continuation) {
        Lad.setInGameCount(Lad.getInGameCount() - 1);
        continuation();
    };

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(value - Lad.getBonus()));
    };

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(value + Lad.getBonus()));
    }

    getDescriptions() {
        let isLad = Lad.prototype.hasOwnProperty("modifyDealedDamageToCreature") &&
            Lad.prototype.hasOwnProperty("modifyDealedDamageToCreature");
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
        const { currentPlayer, oppositePlayer, position, updateView } = gameContext;
        const taskQueue = new TaskQueue();
        const abilities = ['modifyDealedDamageToCreature',
            'modifyDealedDamageToPlayer',
            'modifyTakenDamage'];
        const toCard = oppositePlayer.table[position];
        const oppositePrototype = toCard !== undefined
            ? Object.getPrototypeOf(toCard)
            : null;
        if (oppositePrototype !== null)
            taskQueue.push(onDone => {
                abilities.forEach(ability => {
                    if (oppositePrototype.hasOwnProperty(ability))
                        this[ability] = oppositePrototype[ability];
                    delete oppositePrototype[ability];
                });
                this.view.signalAbility(onDone);
                gameContext.updateView();
            });

        taskQueue.continueWith(continuation);
    }

    getDescriptions() {
        return ['Отнимает бонусные характеристики у противоположной карты.',
            ...super.getDescriptions()];
    }
}

class Brewer extends Duck {
    constructor(name = 'Пивовар', maxPower = 2) {
        super(name, maxPower);
    }

    doBeforeAttack(gameContext, continuation) {
        const { currentPlayer, oppositePlayer, position, updateView } = gameContext;
        const ducksOnTable = currentPlayer.table
            .concat(oppositePlayer.table)
            .filter(card => isDuck(card));
        const taskQueue = new TaskQueue();

        ducksOnTable.forEach(duck => {
            taskQueue.push(onDone => {
                duck.maxPower++;
                duck.currentPower += 2;
                duck.view.signalHeal(onDone);
                duck.updateView();
            });
        });

        taskQueue.continueWith(continuation);
    }

    getDescriptions() {
        return ['Пивка для рывка!',
            ...super.getDescriptions()];
    }
}

class PseudoDuck extends Dog {
    constructor(name = 'Псевдоутка', maxPower = 3) {
        super(name, maxPower);
    }

    swims() { }
    quacks() { }

    getDescriptions() {
        return ['Точно не шпион.',
            ...super.getDescriptions()];
    }
}

class Nemo extends Creature {
    constructor(name = 'Немо', maxPower = 4) {
        super(name, maxPower);
    }

    doBeforeAttack(gameContext, continuation) {
        const { currentPlayer, oppositePlayer, position, updateView } = gameContext;
        const taskQueue = new TaskQueue();

        const toCard = oppositePlayer.table[position];
        const oppositePrototype = toCard !== undefined
            ? Object.getPrototypeOf(toCard)
            : null;

        if (oppositePrototype !== null)
            taskQueue.push(onDone => {
                Object.setPrototypeOf(this, oppositePrototype);
                this.doBeforeAttack(gameContext);
                this.view.signalAbility(onDone);
                gameContext.updateView();
            })

        taskQueue.continueWith(continuation);
    }

    getDescriptions() {
        return ["Перед атакой крадёт все способности противоположной карты.",
            ...super.getDescriptions()]
    }
}

const seriffStartDeck = [
    new Duck(),
    new Gatling(),
    new Rogue(),
    new Duck('Король королей', 10),
    new Brewer(),
    new Nemo(),
    new Nemo(),
    new Brewer(),
];

const banditStartDeck = [
    new Dog(),
    new Trasher(),
    new Lad(),
    new Lad(),
    new Dog(),
    new PseudoDuck(),
    new Brewer(),
    new Brewer(),
];

// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(5);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
