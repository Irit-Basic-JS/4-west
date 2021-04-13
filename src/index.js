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

class Gatling extends Creature {
    constructor(name, maxPower) {
        super(name ?? "Гатлинг", maxPower ?? 6);
    }

    attack(gameContext, continuation) {
		const taskQueue = new TaskQueue();

        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;

        taskQueue.push(onDone => this.view.showAttack(onDone));
        taskQueue.push(onDone => {
            for (let oppositeCard of oppositePlayer.table) {
                if (oppositeCard) {
                    this.dealDamageToCreature(2, oppositeCard, gameContext, onDone);
                }
            }
        });

        taskQueue.continueWith(continuation);
	}
}

// Основа для утки.

class Duck extends Creature {
    constructor(name, maxPower) {
        super(name ?? "Мирная утка", maxPower ?? 2);
    }
    quacks() { console.log('quack') };
    swims() { console.log('float: both;') };
    isDuck() {return true;}
}

// Основа для собаки.

class Dog extends Creature {
    constructor(name, maxPower) {
        super(name ?? "Пёс-бандит", maxPower ?? 3); 
    }
    isDog() {return true;}
}

class Thrasher extends Dog {
    constructor(name, maxPower) {
        super(name ?? "Громила", maxPower ?? 5);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => {continuation(value - 1)});
    };
    
}

class Lad extends Dog {
    constructor(name, maxPower) {
        super(name ?? "Браток", maxPower ?? 2)
    }

    static getInGameCount() { return this.inGameCount || 0; }

    static setInGameCount(value) { this.inGameCount = value; }

    static getBonus() {
		return this.getInGameCount() * (this.getInGameCount() + 1) / 2;
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
		super.modifyDealedDamageToCreature(value + Lad.getBonus(), toCard, gameContext, continuation);
	}

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
		super.modifyTakenDamage(value - Lad.getBonus(), fromCard, gameContext, continuation);
	}

    getDescriptions() {
		if (Lad.prototype.hasOwnProperty("modifyDealedDamageToCreature") || Lad.prototype.hasOwnProperty("modifyTakenDamage")) {
			return super.getDescriptions().concat("Чем их больше, тем они сильнее");
		}
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
