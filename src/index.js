import Card from './Card.js';
import Game from './Game.js';
import TaskQueue from './TaskQueue.js';
import SpeedRate from './SpeedRate.js';

// Отвечает является ли карта уткой.
function isDuck(card){
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
        super(name, maxPower, null);
    }

    getDescriptions() {
        return [getCreatureDescription(this), ...super.getDescriptions()];
    }
}

// Основа для утки.

class Duck extends Creature {
    constructor(name, maxPower) {
        super(name, maxPower);
    }
    quacks() { console.log('quack') };
    swims() { console.log('float: both;') };
    isDuck() {return true;}
}

// Основа для собаки.

class Dog extends Creature {
    constructor(name, maxPower) {
        super(name, maxPower); 
    }
    isDog() {return true;}
}

class Thrasher extends Dog {
    constructor(name, maxPower) {
        super(name, maxPower);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => {continuation(value - 1)});
    };
    
}

// Колода Шерифа, нижнего игрока.
const seriffStartDeck = [
    new Duck("Мирная утка", 2),
    new Duck("Мирная утка", 2),
    new Duck("Мирная утка", 2),
];

// Колода Бандита, верхнего игрока.
const banditStartDeck = [
    new Dog("Пёс-бандит", 3),
    new Thrasher("Громила", 5)
];


// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
