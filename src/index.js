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

class Creature extends Card {
    constructor(name, maxPower, image) {
        super(name, maxPower, image);
    }

    getCurrentPower() {
        return this.currentPower;
    }

    setCurrentPower(value) {
        this.currentPower = Math.min(this.maxPower, this.currentPower + value);
    }

    getDescriptions() {
        return [getCreatureDescription(this),
            ...super.getDescriptions()]
    }
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



// Основа для утки.
class Duck extends Creature {
    constructor(name = "Мирная утка", maxPower = 2, image = 'Duck.jpg') {
        super(name, maxPower, image);
    }
    quacks() {
        console.log('quack')
    };
    swims() {
        console.log('float: both;')
    };
}


// Основа для собаки.
class Dog extends Creature{
    constructor(name = "Собака поменьше", maxPower = 3, image = 'Dog.jpg') {
        super(name, maxPower, image);
    }
}

class Trasher extends Dog{
    constructor(name = "Собака побольше", maxPower = 5, image = 'Trasher.jpg') {
        super(name, maxPower, image);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(value - 1));
    }

    getDescriptions() {
        let descriptions = [];
        if (Trasher.prototype.hasOwnProperty('modifyTakenDamage')) {
            descriptions = ["Получает на 1 меньше урона"];
        }
        return descriptions.concat([...super.getDescriptions()]);
    }
}

class Gatling extends Creature{
    constructor(name = "Гаубица Макара", maxPower = 6, image = 'Gatling.jpg') {
        super(name, maxPower, image);
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();
        const oppositeCards = gameContext.oppositePlayer.table;
        console.log(oppositeCards.length);
        if (oppositeCards.length !== 0) {
            for (let oppositeCard of oppositeCards) {
                taskQueue.push(onDone => this.view.showAttack(onDone));
                taskQueue.push(onDone => {
                    this.dealDamageToCreature(2, oppositeCard, gameContext, onDone);
                });
            }
        } else {
            taskQueue.push(onDone => this.view.showAttack(onDone));
            taskQueue.push(onDone => {
                this.dealDamageToPlayer(1, gameContext, onDone);
            });
        }

        taskQueue.continueWith(continuation);
        game.updateView();
    };
}

class Lad extends Dog{
    static getInGameCount() { return this.inGameCount || 0; }
    static setInGameCount(value) { this.inGameCount = value; }
    static getBonus() { return this.getInGameCount() * (this.getInGameCount() + 1) / 2; }

    constructor(name = "Братки Макара", maxPower = 2, image = false) {
        if (!image) {
            image = 'Lad' + (Math.floor(Math.random() * 3) + 1) + '.jpg';
        }
        super(name, maxPower, image);
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
    constructor(name = "Вор носков", maxPower = 2, image = 'Rogue.jpg') {
        super(name, maxPower, image);
    }

    doBeforeAttack(gameContext, continuation) {
        const taskQueue = new TaskQueue();
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        const oppositeCard = oppositePlayer.table[position];

        if (oppositeCard) {
            const obj = Object.getPrototypeOf(oppositeCard);
            if (obj.hasOwnProperty('modifyDealedDamageToCreature')) {
                this.modifyDealedDamageToCreature = obj.modifyDealedDamageToCreature;
                delete obj['modifyDealedDamageToCreature'];
            }
            if (obj.hasOwnProperty('modifyDealedDamageToPlayer')) {
                this.modifyDealedDamageToPlayer = obj.modifyDealedDamageToPlayer;
                delete obj['modifyDealedDamageToPlayer'];
            }
            if (obj.hasOwnProperty('modifyTakenDamage')) {
                this.modifyTakenDamage = obj.modifyTakenDamage;
                delete obj['modifyTakenDamage'];
            }
            gameContext.updateView();
        }
        taskQueue.continueWith(continuation);
    }

    getDescriptions() {
        let descriptions = ["Ворует способности своих врагов"];
        return descriptions.concat([...super.getDescriptions()]);
    }
}

class Brewer extends Duck{
    constructor(name = "Пивовар", maxPower = 2, image = 'Brewer.jpg') {
        super(name, maxPower, image);
    }

    doBeforeAttack(gameContext, continuation) {
        const taskQueue = new TaskQueue();
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        const cards = currentPlayer.table.concat(oppositePlayer.table);
        for (let card of cards) {
            if (isDuck(card)) {
                card.maxPower += 1;
                card.setCurrentPower(2);
                taskQueue.push(onDone => card.view.signalHeal(onDone));
                card.updateView();
            }
        }
        taskQueue.continueWith(continuation);
    }
}

class PseudoDuck extends Dog {
    constructor(name = "Уткапёс", maxPower = 3, image = 'PseudoDuck.jpg') {
        super(name, maxPower, image);
    }
    quacks() {
        console.log('quack')
    };
    swims() {
        console.log('float: both;')
    };
}

class Nemo extends Creature {
    constructor(name = "Немо", maxPower = 4, image = 'Nemo.jpg') {
        super(name, maxPower, image);
    }

    doBeforeAttack(gameContext, continuation) {
        const taskQueue = new TaskQueue();
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        const oppositeCard = oppositePlayer.table[position];

        if (oppositeCard) {
            Object.setPrototypeOf(this, Object.getPrototypeOf(oppositeCard));
            gameContext.updateView();
        }
        taskQueue.continueWith(continuation);
    }
}

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
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
