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

//3.1 Создай новый тип Creature и унаследуй его от Card.
class Creature extends Card {
    constructor(name, maxPower) {
        super(name, maxPower);
        this._currentPower = maxPower;
    }

    get currentPower() {
        return this._currentPower;
    }

    set currentPower(value) {
        this._currentPower = value > this.maxPower ? this.maxPower : value;
    }
//3.0 «Утка или собака?»
//3.3
    getDescriptions() {
        return [getCreatureDescription(this), ...super.getDescriptions()];
    }
}

// Основа для утки.
//3.2 Duck наследовались от Creature.
class Duck extends Creature {
    constructor() {
        super('Мирная утка', 2);      //2. Duck с именем «Мирная утка» и силой 2
    }

    quacks() {
        console.log('quack');
    };

    swims() {
        console.log('float: both;');
    };
}

// Основа для собаки.
//3.2 Dog наследовались от Creature.
class Dog extends Creature {
    constructor() {
        super('Пес-бандит', 3);   //2. Dog с именем «Пес-бандит» и силой 3
    }
}

// 4.1 Добавь карту Trasher: называется Громила, сила 5, наследуется от Dog.
class Trasher extends Dog {
    constructor() {
        super('Громила',5);
    }
// 4.2 если Громилу атакуют, то он получает на 1 меньше урона.
    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => 
            super.modifyTakenDamage(value - 1, fromCard, gameContext, continuation)); 
    }

    getDescriptions() {
        return ["Получает на 1 меньше урона", super.getDescriptions()];
    }
}

//5.1 Добавь карту Gatling
class Gatling extends Creature {
    constructor(name = 'Гатлинг', maxPower = 6) {
        super(name, maxPower);
    }
    //5.2 переопредели метод attack так, чтобы урон наносился всем картам противника
    //список карт противника можно получить через gameContext.oppositePlayer.table
    //в качестве примера выполнения действий над несколькими картами можешь использовать applyCards из Player.js
    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();

        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        taskQueue.push(onDone => this.view.showAttack(onDone));
        oppositePlayer.table.forEach(card => {
            taskQueue.push(onDone => {
                if (card) {
                    this.dealDamageToCreature(2, card, gameContext, onDone);
                }
            });
        });
        taskQueue.continueWith(continuation);
    };

    getDescriptions() {
        let descriptions = super.getDescriptions();
        descriptions.push('Наносит 2 урона всем противникам');
        return descriptions;
    }
}

//6 Реализация карты Lad
class Lad extends Dog {
    static getInGameCount() { return this.inGameCount || 0; }
    static setInGameCount(value) { this.inGameCount = value; }
    static getBonus() { return this.getInGameCount() * (this.getInGameCount() + 1) / 2; }
    constructor() {
        super('Браток', 2);
    }

    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.setInGameCount(Lad.getInGameCount() + 1);
        continuation();
    }

    doBeforeRemoving(continuation) {
        Lad.setInGameCount(Lad.getInGameCount() - 1);
        continuation();
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        continuation(value + Lad.getBonus());
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        continuation(value - Lad.getBonus());
    }

    getDescriptions() {
		let descriptions = super.getDescriptions();
		if (Lad.prototype.hasOwnProperty("modifyDealedDamageToCreature") && Lad.prototype.hasOwnProperty("modifyTakenDamage")) {
			descriptions.push("Чем их больше, тем они сильнее");
		}
		return descriptions;
	}
}

//7* Реализация карты Rogue
class Rogue extends Creature {
    static properties = [
        'modifyDealedDamageToCreature',
        'modifyDealedDamageToPlayer',
        'modifyTakenDamage',
    ];

    constructor() {
        super('Изгой',2);
    }

    doBeforeAttack(gameContext, continuation) {
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        const oppositeCard = oppositePlayer.table[position];
        const obj = Object.getPrototypeOf(oppositeCard);

        Rogue.properties.forEach(property => {
            if (obj.hasOwnProperty(property)) {
                this[property] = obj[property];
                delete obj[property];
            }
        });
        continuation();
        updateView();
    }

    getDescriptions() {
        let descriptions = super.getDescriptions();
        descriptions.push('Крадет способности');
        return descriptions;
    }
}

//8* Реализация карты Brewer
class Brewer extends Duck {
    constructor(name = "Пивовар", maxPower = 2) {
        super(name, maxPower);
    }

    doBeforeAttack(gameContext, continuation) {
        let taskQueue = new TaskQueue();
        const cards = gameContext.currentPlayer.table.concat(gameContext.oppositePlayer.table);

        for(let card of cards.filter(card => isDuck(card))) {
            card.view.signalHeal();
            card.maxPower += 1;
            card.currentPower += 2;
            card.updateView();
        }

        taskQueue.continueWith(continuation);
        
    }

    getDescriptions() {
        let descriptions = super.getDescriptions();
        descriptions.push('Раздает живительное пиво');
        return descriptions;
    }
}

//9* Реализация карты PseudoDuck
class PseudoDuck extends Dog {
    constructor() {
        super("Псевдоутка", 3);
    }
    swims() {}
    quacks() {}
}

//10* Реализация карты Nemo
class Nemo extends Creature {
    constructor() {
        super('Немо', 4);
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        Object.setPrototypeOf(this, Object.getPrototypeOf(toCard));
        this.doBeforeAttack(gameContext, continuation);
        gameContext.updateView();
    }

    getDescriptions() {
        let descriptions = super.getDescriptions();
        descriptions.push('The one without a name without an honest heart as compass');
        return descriptions;
    }
}

//Колоды для проверки:
/*
const seriffStartDeck = [
    new Duck(),
    new Duck(),
    new Duck(),
    new Gatling(),
    new Rogue(),
    new Brewer(),
    new Nemo(),
];
const banditStartDeck = [
    new Dog(),
];

const banditStartDeck = [
    new Trasher(),
];

const banditStartDeck = [
    new Trasher(),
    new Dog(),
    new Dog(),
];

const banditStartDeck = [
    new Lad(),
    new Lad(),
];

const banditStartDeck = [
    new Lad(),
    new Lad(),
    new Lad(),
];

const banditStartDeck = [
    new Dog(),
    new Dog(),
    new Dog(),
    new Dog(),
];

const banditStartDeck = [
    new Dog(),
    new PseudoDuck(),
    new Dog(),
];

const banditStartDeck = [
    new Brewer(),
    new Brewer(),
];
*/


const seriffStartDeck = [
    new Nemo(),
];
const banditStartDeck = [
    new Brewer(),
    new Brewer(),
];

// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(3);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});