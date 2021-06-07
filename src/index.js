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
class Dog extends Creature{
    constructor(name, maxPower) {
        super(name, maxPower);
    }
    isDog(){
        return true;
    }
}

class Trasher extends Dog{
    constructor(name, maxPower) {
        super(name, maxPower);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => {continuation(value - 1)});
    };
}

class Gatling extends Creature{
    constructor(name, maxPower) {
        super(name, maxPower);
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();

        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;

        taskQueue.push(onDone => this.view.showAttack(onDone));
        const cards = gameContext.oppositePlayer.table;
        for (const card of cards) {
            if (cards) {
                taskQueue.push(onDone => {
                    this.dealDamageToCreature(2, card, gameContext, onDone);
                });
            } else {
                taskQueue.push(onDone => this.dealDamageToPlayer(1, gameContext, onDone));
            }
        }
        taskQueue.continueWith(continuation);
    }
}

class Lad extends Dog{
    constructor(name, maxPower) {
        super(name, maxPower);
    }

    static getInGameCount() { return Lad.inGameCount || 0; }

    static setInGameCount(value) { Lad.inGameCount = value; }

    static getBonus() { return Lad.getInGameCount() * (Lad.getInGameCount() + 1) / 2; }

    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.setInGameCount(Lad.getInGameCount() + 1);
        super.doAfterComingIntoPlay(gameContext, continuation);
    }

    doBeforeRemoving(continuation) {
        Lad.setInGameCount(Lad.getInGameCount() - 1);
        super.doBeforeRemoving(continuation);
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        super.modifyDealedDamageToCreature(value + Lad.getBonus(), toCard, gameContext, continuation);
    }

    modifyTakenDamage(value, toCard, gameContext, continuation) {
        super.modifyTakenDamage(value - Lad.getBonus(), toCard, gameContext, continuation);
    }
}

// Колода Шерифа, нижнего игрока.
const seriffStartDeck = [
    new Duck("Мирная утка", 2),
    new Duck("Мирная утка", 2),
    new Duck("Мирная утка", 2),
    new Gatling('Гатлинг', 6),
];

// Колода Бандита, верхнего игрока.
const banditStartDeck = [
    new Lad('Братки', 2),
    new Lad('Братки', 2),
];


// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
