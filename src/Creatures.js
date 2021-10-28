import Card from "./Card.js";
import TaskQueue from './TaskQueue.js';

export class Creature extends Card {
    constructor(name = 'существо', maxPower = 1) {
        super(name, maxPower);
    }

    getDescriptions() {
        return [getCreatureDescription(this), ...super.getDescriptions()];
    };
}

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



// Основа для утки.
//class
export class Duck extends Creature {
    constructor(name = "Мирная утка", maxPower = 2) {
        super(name, maxPower);
    }

    quacks = function () { console.log('quack') };

    swims = function () { console.log('float: both;') };
}

export class Dog extends Creature{
    constructor(name = 'Пес-бандит', maxPower = 3){
        super(name, maxPower);
    }
}

export class Trasher extends Dog {
    constructor(name = 'Громила', maxPower = 5) {
        super(name, maxPower)
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        let resultValue = value - 1;
        this.view.signalAbility(() => {super.modifyTakenDamage(resultValue, fromCard, gameContext, continuation)});
    }
}

export class Gatling extends Creature {
    constructor(name = 'Гатлинг', maxPower = 6) {
        super(name, maxPower)
    }

    attack (gameContext, continuation) {
        const taskQueue = new TaskQueue();

        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        const cards = oppositePlayer.table;

        cards.forEach(card => {
            taskQueue.push(onDone => {
                this.dealDamageToCreature(2, card, gameContext, onDone);
            });
        });

        taskQueue.continueWith(continuation);
    };

    getDescriptions() {
        return ["Нехорошо нападать на мирных жителей. Это еще может быть опасно, если в сарае припрятан Гатлинг.", ...super.getDescriptions()];
    };
}

export class Lad extends Dog {
    constructor(name = 'Браток', maxPower = 2) {
        super(name, maxPower)
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        let resultValue = value - this.getBonus(gameContext, true);
        if (resultValue < 0)
            resultValue = 0;
        
        this.view.signalAbility(() => {super.modifyTakenDamage(resultValue, fromCard, gameContext, continuation)});
    }

    getBonus(gameContext, swap_players = false) {
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        let ladCount = 0;

        let currentDeck = currentPlayer.table;
        if (swap_players)
            currentDeck = oppositePlayer.table;

        currentDeck.forEach(card => {
            if (card instanceof Lad)
                ladCount++;
        });

        return ladCount * (ladCount + 1) / 2;
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        let resultValue = value + this.getBonus(gameContext);
        continuation(resultValue)
    }

    getDescriptions() {
        if (Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature')
        || Lad.prototype.hasOwnProperty('modifyTakenDamage'))
        return ["Чем их больше, тем они сильнее", ...super.getDescriptions()];
        else return super.getDescriptions();
    };
}

export class Rogue extends Creature {
    constructor(name = 'Изгой', maxPower = 2) {
        super(name, maxPower)
    }

    doBeforeAttack (gameContext, continuation) {
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        const oppositeCard = oppositePlayer.table[position];
        
        let props = ['modifyDealedDamageToCreature', 'modifyDealedDamageToPlayer', 'modifyTakenDamage', 'getBonus'];
        let cardPrototype = Object.getPrototypeOf(oppositeCard);
        let gained = props.filter(a => cardPrototype.hasOwnProperty(a));
        gained.forEach(a => this[a] = cardPrototype[a]);
        gained.forEach(a => delete cardPrototype[a]);

        oppositeCard.updateView();
        continuation();
    };
}