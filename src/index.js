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


// Колода Шерифа, нижнего игрока.
const seriffStartDeck = [
    new Duck(),
    new Duck(),
    new Duck(),
    new Gatling(),
];

// Колода Бандита, верхнего игрока.
const banditStartDeck = [
    new Trasher(),
    new Dog(),
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
