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
        super(name, maxPower);
        this._currentPower = maxPower;
    }

    getDescriptions() {
        return [getCreatureDescription(this), super.getDescriptions()];
    }
}

class Duck extends Creature {
    constructor(name = 'Мирная утка', maxPower = 2) {
        super(name, maxPower);
    }

    quacks() {
        console.log('quack');
    };

    swims() {
        console.log('float: both;');
    };
}

class Dog extends Creature {
    constructor(name = 'Пес-бандит', maxPower = 3) {
        super(name, maxPower);
    }
}

class Trasher extends Dog {
    constructor(name = 'Громила', maxPower = 5) {
        super(name, maxPower);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => 
            super.modifyTakenDamage(value - 1, fromCard, gameContext, continuation)); 
    }

    getDescriptions() {
        let descriptions = super.getDescriptions();
        descriptions.push('Получает меньше урона на 1');
        return descriptions;
    }
}

class Gatling extends Creature {
    constructor(name = 'Гатлинг', maxPower = 6) {
        super(name, maxPower);
    }

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

class Lad extends Dog {
    static getInGameCount() { return this.inGameCount || 0; }
    static setInGameCount(value) { this.inGameCount = value; }
    static getBonus() { return this.getInGameCount() * (this.getInGameCount() + 1) / 2; }
    constructor(name = 'Браток', maxPower = 2) {
        super(name, maxPower);
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

class Rogue extends Creature {
    static properties = [
        'modifyDealedDamageToCreature',
        'modifyDealedDamageToPlayer',
        'modifyTakenDamage',
    ];

    constructor(name = 'Изгой', maxPower = 2) {
        super(name, maxPower);
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
}

// Колода Шерифа, нижнего игрока.
const seriffStartDeck = [
    new Duck(),
    new Duck(),
    new Duck(),
    new Rogue(),
];
const banditStartDeck = [
    new Lad(),
    new Lad(),
    new Lad(),
];

// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(2);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
