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

class Duck extends Creature{
    constructor(name, maxPower){
        super(name, maxPower)
    }

    quacks() { console.log('quack') };
    swims() { console.log('float: both;') };
    isDuck() {return true;}
}

class Dog extends Creature{
    constructor(name, maxPower){
        super(name, maxPower)
    }

    isDog() {return true;}
}

class Thrasher extends Dog {
    constructor(name, maxPower) {
        super(name, maxPower);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => {continuation(value - 1)});
    };
}

class Gatling extends Creature {
    constructor(name, power) {
		super(name, power);
	}

	attack(gameContext, continuation) {
		let taskQueue = new TaskQueue();

		let oppositePlayer = gameContext.oppositePlayer;

		for (let card of oppositePlayer.table) {
			taskQueue.push((onDone) => this.view.showAttack(onDone));
			taskQueue.push((onDone) =>
				this.dealDamageToCreature(2, card, gameContext, onDone),
			);
		}

		taskQueue.continueWith(continuation);
	}
}

class Lad extends Dog {
	constructor(name, power) {
		super(name, power);
	}

	static getInGameCount() {
		return this.inGameCount || 0;
	}

	static setInGameCount(value) {
		if (value) {
			this.inGameCount = value;
		}
	}

	static getBonus() {
		const count = this.getInGameCount();
		return count * (count + 1) / 2;
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
		const descriptions = super.getDescriptions();
		if (Lad.prototype.hasOwnProperty("modifyDealedDamageToCreature") && Lad.prototype.hasOwnProperty("modifyTakenDamage")) {
			descriptions.push("Чем их больше, тем они сильнее");
		}
		return descriptions;
	}

}

// Колода Шерифа, нижнего игрока.
const seriffStartDeck = [
    new Duck('Утка',2),
    new Duck('Утка',2),
    new Duck('Утка',2),
];

// Колода Бандита, верхнего игрока.
const banditStartDeck = [
    new Lad('Братишка браток',2),
    new Lad('Братишка браток',2),
];


// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
