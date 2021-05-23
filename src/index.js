import Card from './Card.js';
import Game from './Game.js';
import TaskQueue from './TaskQueue.js';
import SpeedRate from './SpeedRate.js';

// Отвечает является ли карта уткой.
function isDuck(card) {
    return card instanceof Duck;
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
    constructor(name, power) {
        super(name, power);
    }

    getDescriptions() {
        return [getCreatureDescription(this), super.getDescriptions()];
    }
}

// Основа для утки.
class Duck extends Creature {
    constructor() {
        super("Мирная утка", 2);
    }
    
    quacks() { 
        console.log('quack');
    };

    swims() {
        console.log('float: both;');
    }

}


// Основа для собаки.
class Dog extends Creature {
    constructor(name = "Пёс бандит", power = 3) {
        super(name, power);
    }
}

class Trasher extends Dog {
    constructor() {
        super("Громила", 5);
    }

    getDescriptions() {
        const desc = "Получает на 1 меньше урона";

        return [desc, ...super.getDescriptions()]; 
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(value - 1));
    }
}

class Gatling extends Creature{
    constructor() {
        super("Гатлинг", 6);
    }

    getDescriptions() {
        const desc = "Атакует всех по очереди нанося 2 единицы урона"
        return [desc, ...super.getDescriptions()]; 
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();
        let oppositeCards = gameContext.oppositePlayer.table;

        for (let oppositeCard of oppositeCards) {
            taskQueue.push(onDone => this.view.showAttack(onDone));
            taskQueue.push(onDone => {
                    this.dealDamageToCreature(2, oppositeCard, gameContext, onDone);
            });
        }

        taskQueue.continueWith(continuation);
    }
}

class Lad extends Dog {
    constructor() {
        super("Браток", 2);
    }

    getDescriptions() {
        const isMethodsModified = Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature') || Lad.prototype.hasOwnProperty('modifyTakenDamage');
        const desc = isMethodsModified ? "Чем их больше, тем они сильнее!" : "";
        return [desc, super.getDescriptions()];
    }

    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.setInGameCount(Lad.getInGameCount() + 1);
        super.doAfterComingIntoPlay(gameContext, continuation);
    }

    doBeforeRemoving(continuation) {
        Lad.setInGameCount(Lad.getInGameCount() - 1);
        super.doBeforeRemoving(continuation);
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        const bonus = Lad.getBonus();
        continuation(value + bonus);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        const bonus = Lad.getBonus();
        continuation(value - bonus);
    }

    static getInGameCount() { 
        return this.inGameCount || 0;
    }

    static setInGameCount(value) 
    { 
        this.inGameCount = value; 
    }

    static getBonus() {
        const count = this.getInGameCount();
        return count * (count + 1) / 2;
    }
}


// Колода Шерифа, нижнего игрока.
const seriffStartDeck = [
    new Duck(),
    new Duck(),
    new Duck(),
];

// Колода Бандита, верхнего игрока.
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
