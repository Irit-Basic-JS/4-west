import Card from './Card.js';
import Game from './Game.js';
import TaskQueue from './TaskQueue.js';
import SpeedRate from './SpeedRate.js';

class Creature extends Card {
    _currentPower;

    constructor(name, power) {
        super(name, power);
        this._currentPower = power;
    }

    get currentPower() {
        return this._currentPower;
    }

    set currentPower(value) {
        if (value > this.maxPower) {
            this._currentPower = this.maxPower;
        } else {
            this._currentPower = value;
        }
    }

    getDescriptions() {
        let first = getCreatureDescription(this);
        let second = super.getDescriptions();
        let arr = [];
        arr.push(first);
        arr.push(second);
        return arr;
    }
}

class Duck extends Creature {
    constructor(name, power) {
        super(name ?? "Мирная утка", power ?? 2);
    }
    quacks() {
        console.log("quack");
    }
    swims() {
        console.log("float: both;");
    }
}

class Dog extends Creature {
    constructor(name, power) {
        super(name ?? "Пес-бандит", power ?? 3);
    }
}

class Trasher extends Dog {
    constructor(name = "Громила", power = 5) {
        super(name, power);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(value - 1));
    }

    getDescriptions() {
        let arr = super.getDescriptions();
        arr.push("aka Denis Шадрин");
        arr.push("если Громилу атакуют, то он получает на 1 меньше урона");

        return arr;
    }
}

class Gatling extends Creature {
    constructor(name, power) {
        super(name ?? "Гатлинг", (power = 6));
    }

    attack(gameContext, continuation) {
        let taskQueue = new TaskQueue();

        let oppositePlayer = gameContext.oppositePlayer;

        for (let card of oppositePlayer.table) {
            taskQueue.push((onDone) => this.view.showAttack(onDone));
            taskQueue.push((onDone) =>
                this.dealDamageToCreature(2, card, gameContext, onDone)
            );
        }
        taskQueue.continueWith(continuation);
    }
}

class Lad extends Dog {
    static getInGameCount() { return this.inGameCount || 0; }
    static setInGameCount(value) { this.inGameCount = value; }
    static getBonus() { return this.getInGameCount() * (this.getInGameCount() + 1) / 2}

    constructor(name = "Браток Макара", maxPower = 3) {
        super(name, maxPower);
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
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        continuation(value + Lad.getBonus());
    }

    getDescriptions() {
        let descriptions = [];
        if (Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature') ||
            Lad.prototype.hasOwnProperty('modifyTakenDamage')) {
            descriptions = ["Чем их больше, тем они сильнее"];
        }
        return descriptions.concat([...super.getDescriptions()]);
    }
}

class Rogue extends Creature {
    constructor(name = "Вор трусов", maxPower = 2, image) {
        super(name, maxPower, image);
    }

    doBeforeAttack(gameContext, continuation){
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        //Изгой похищает эти способности: modifyDealedDamageToCreature, modifyDealedDamageToPlayer, modifyTakenDamage

        let cardOpponent = oppositePlayer.table[position];
        if (cardOpponent) {
            let prototype = Object.getPrototypeOf(cardOpponent);
            if (prototype.modifyDealedDamageToCreature) {
                this.modifyDealedDamageToCreature = prototype.modifyDealedDamageToCreature;
                delete prototype.modifyDealedDamageToCreature;
            }

            if (prototype.modifyDealedDamageToPlayer) {
                this.modifyDealedDamageToPlayer = prototype.modifyDealedDamageToPlayer;
                delete prototype.modifyDealedDamageToPlayer;
            }

            if (prototype.modifyTakenDamage) {
                this.modifyTakenDamage = prototype.modifyTakenDamage;
                delete prototype.modifyTakenDamage;
            }
        }
        updateView();
        continuation();
    }

    getDescriptions() {
        return ["Сворует и не заметишь", ...super.getDescriptions()];
    }
}

class Brewer extends Duck {
    constructor(name = "Виновар", maxPower = 2) {
        super(name, maxPower);
    }

    doBeforeAttack(gameContext, continuation) {
        let taskQueue = new TaskQueue();
        const cards = gameContext.currentPlayer.table.concat(gameContext.oppositePlayer.table);

        for(let card of cards) {
            if(isDuck(card)) {
                card.view.signalHeal();
                card.maxPower += 1;
                card.currentPower += 2;
                card.updateView();
            }
        }

        taskQueue.continueWith(continuation);
    }
}

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

// Колода Шерифа, нижнего игрока.
const seriffStartDeck = [
    new Duck(),
    new Brewer(),
];

// Колода Бандита, верхнего игрока.
const banditStartDeck = [
    new Dog(),
    new Dog(),
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
