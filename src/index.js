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

    getDescriptions() {
        return [getCreatureDescription(this), super.getDescriptions()];
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



// Колода Шерифа, нижнего игрока.
const seriffStartDeck = [
    new Duck('General Kenobi', 10),
    new Duck(),
    new Duck(),
    new Duck(),
    new Duck(),
    new Duck(),
    new Duck(),
];

// Колода Бандита, верхнего игрока.
const banditStartDeck = [
    new Dog(),
    new Dog('Giga Chad', 13),
    new Dog('What da dog doin\'', 1),
];


// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(5);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
