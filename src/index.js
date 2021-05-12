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
    getDescriptions() {
        return [
            getCreatureDescription(this),
            ...super.getDescriptions(),
        ];
    }
}


class Duck extends Creature {
    constructor(name, maxPower) {
        super(name || 'Мирная утка', maxPower || 2);
    }

    quacks() {
        console.log('quack');
    }

    swims() {
        console.log('float: both');
    }
}


class Dog extends Creature {
    constructor(name, maxPower) {
        super(name || 'Пес-бандит', maxPower || 3);
    }
}


class Trasher extends Dog {
    constructor(name, maxPower) {
        super(name || 'Громила', maxPower || 5);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(value - 1));
    }

    getDescriptions() {
        return [
            'Если Громилу атакуют, то он получает на 1 меньше урона.',
            ...super.getDescriptions(),
        ];
    }
}


class Gatling extends Creature {
    constructor(name, maxPower) {
        super(name || 'Гатлинг', maxPower || 6);
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();

        const oppositeCards = gameContext.oppositePlayer.table;
        if (oppositeCards.length === 0) {
            taskQueue.push(onDone => this.view.showAttack(onDone));
            taskQueue.push(onDone => { 
                this.dealDamageToPlayer(1, gameContext, onDone);
            });
        } else {
            for (let position = 0; position < oppositeCards.length; position++) {
                taskQueue.push(onDone => this.view.showAttack(onDone));
                taskQueue.push(onDone => {
                    const oppositeCard = oppositeCards[position];
                    this.dealDamageToCreature(2, oppositeCard, gameContext, onDone);
                });
            }
        }

        taskQueue.continueWith(continuation);
    }
}


class Lad extends Dog {
    constructor(name, maxPower) {
        super(name || 'Браток', maxPower || 2);
    }

    static getInGameCount() {
        return this.inGameCount || 0;
    }

    static setInGameCount(value) {
        this.inGameCount = value;
    }

    static getBonus() {
        let count = this.getInGameCount();
        return count * (count + 1) / 2;
    }

    doAfterComingIntoPlay(gameContext, continuation) {
        let updatedCount = Lad.getInGameCount() + 1;
        Lad.setInGameCount(updatedCount);
        continuation();
    }

    doBeforeRemoving(continuation) {
        let updatedCount = Lad.getInGameCount() - 1;
        Lad.setInGameCount(updatedCount);
        continuation();
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        let damage = value + Lad.getBonus();
        continuation(damage);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        let damage = value > Lad.getBonus() ? value - Lad.getBonus() : 0;
        continuation(damage);
    }

    getDescriptions() {
        if (Lad.prototype.hasOwnProperty('modifyTakenDamage') &&
            Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature')) {
                return [
                    'Чем их больше, тем они сильнее',
                    ...super.getDescriptions(),
                ]
            } else {
                return [];
            }
    }
}


class Rogue extends Creature {
    constructor(name, maxPower) {
        super(name || 'Изгой', maxPower || 2);
    }

    doBeforeAttack(gameContext, continuation) {
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        const oppositeCard = oppositePlayer.table[position];
        const obj = Object.getPrototypeOf(oppositeCard);
        const properties = [
            'modifyDealedDamageToCreature',
            'modifyDealedDamageToPlayer',
            'modifyTakenDamage',
        ];

        for (let property of properties) {
            if (obj.hasOwnProperty(property)) {
                this[property] = obj[property];
                delete obj[property];
            }
        }

        updateView();
        continuation();
    }
}


// Колода Шерифа, нижнего игрока.
const seriffStartDeck = [
    new Duck(),
    new Duck(),
    new Duck(),
    new Rogue(),
];

// Колода Бандита, верхнего игрока.
const banditStartDeck = [
    new Lad(),
    new Lad(),
    new Lad(),
];


// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(2);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
