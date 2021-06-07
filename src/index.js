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
    constructor(name, power) {
        super(name, power);
    }
    getDescriptions() {
        let first = getCreatureDescription(this);
        let second = super.getDescriptions();
        return [first, second];
    }
}
// Основа для утки.
class Duck extends Creature {
    constructor(name = 'Мирная утка', power = 2) {
        super(name, power);
    }
    quacks() {
        console.log('quack')
    }
    swims() {
        console.log('float: both;')
    }
}
// Основа для собаки.
class Dog extends Creature {
    constructor(name = 'Пес-бандит', power = 3) {
        super(name, power);
    }
}

//Громила
class Trasher extends Dog {
    constructor() {
        super('Громила', 5);
    }
        

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(value - 1));
    };

    getDescriptions() {
        return ['Получает на 1 меньше урона', super.getDescriptions()];
    }
};

//Гатлинг
class Gatling extends Creature {
    constructor() {
        super('Гатлинг', 6);
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();

        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;

        taskQueue.push(onDone => this.view.showAttack(onDone));

        let cards = gameContext.oppositePlayer.table;

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

//Братки
class Lad extends Dog {
    constructor() {
        super('Браток', 2);
    }

    static getInGameCount() { 
        return this.inGameCount || 0; 
    }

    static setInGameCount(value) { 
        this.inGameCount = value; 
    }

    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.setInGameCount(Lad.getInGameCount() + 1);
        continuation();
    }

    doBeforeRemoving(continuation) {
        Lad.setInGameCount(Lad.getInGameCount() - 1);
        continuation();
    }

    static getBonus() {
        return Lad.getInGameCount() * (Lad.getInGameCount() + 1) / 2;
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        return continuation(value + Lad.getBonus());
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        return continuation(value - Lad.getBonus());
    }

    getDescriptions() {
        if (Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature') || Lad.prototype.hasOwnProperty('modifyTakenDamage'))
            return ['Чем их больше, тем они сильнее', super.getDescriptions()];
        return super.getDescriptions();
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
    new Dog(),
    new Lad(),
    new Lad()
];


// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);
// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(1);
// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});


