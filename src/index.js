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
    constructor(name, maxPower) {
        super(name, maxPower)
    }
    getDescriptions() {
        let res = [];
        res.push(getCreatureDescription(this));
        res.push(super.getDescriptions())
        return res;
    }
}

// Основа для утки.
class Duck extends Creature{
    constructor(name = 'Мирная утка', maxPower = 2) {
        super(name, maxPower);
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
    constructor(name = 'Пес-бандит', maxPower = 3) {
        super(name, maxPower);
    }
}

class Trasher extends Dog {
    constructor() {
        super('Громила', 5);
    }

    
    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        if (value > 1) {
            this.view.signalAbility(() => super.modifyTakenDamage(value - 1, fromCard, gameContext, continuation));
        } else {
            this.view.signalAbility(continuation);
        }        
    }

    getDescriptions() {
        return [
            "Громила получает на 1 меньше урона",
            ...super.getDescriptions(),
        ];
    }
}

class Gatling extends Creature{
    constructor() {
        super('Гатлинг', 6);        
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();

        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;        
        for(let e of oppositePlayer.table) {
            if(e) {
                taskQueue.push(onDone => this.view.showAttack(onDone));
                taskQueue.push(onDone => this.dealDamageToCreature(2, e, gameContext, onDone));
            }            
        }
        taskQueue.continueWith(continuation);
        console.log(Lad.countLad)
    }
}

class Lad extends Dog {
    constructor() {
        super('Браток', 2);
    }

    static get InGameCount() { return this.inGameCount || 0; }

    static set InGameCount(value) { this.inGameCount = value; }

    static getBonus() {
        return this.InGameCount * (this.InGameCount + 1) / 2;
    }

    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.InGameCount++;
        continuation();
    }

    doBeforeRemoving(continuation) {
        Lad.InGameCount--;
        continuation();
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        this.view.signalAbility(() => {
            continuation(value + Lad.getBonus());
        })
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => {
            continuation(value - Lad.getBonus());
        })
    }

    getDescriptions() {
        let description = super.getDescriptions();
        if (Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature') && Lad.prototype.hasOwnProperty('modifyTakenDamage')) {
            description.unshift('Чем больше братков находится в игре, тем больше урона без потерь поглощается' +
                                ' и больше урона по картам наносится каждым из них');
        }
        return description;
    }
}

class Rogue extends Creature {
    constructor() {
        super('Изгой', 2);
    }
}

class Brewer extends Duck {
    constructor() {
        super('Пивозавр', 2);
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
