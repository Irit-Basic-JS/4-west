import Card from "./Card.js";
import Game from "./Game.js";
import TaskQueue from "./TaskQueue.js";
import SpeedRate from "./SpeedRate.js";

class Creature extends Card {
	constructor(name, power) {
		super(name, power);
	}
	
	getDescriptions() {
		return [super.getDescriptions(), getCreatureDescription(this)];
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
		super(name ? name : "Пес-бандит", power ? power : 3);
	}
}

class Trasher extends Dog {
	constructor(name, power) {
		super(name ?? "Громила", power ?? 5);
	}
	
	modifyTakenDamage(value, fromCard, gameContext, continuation) {
		this.view.signalAbility(() => continuation(value - 1));
	}
	
	getDescriptions() {
		const result = super.getDescriptions();
		result.unshift("Громила");
		return result;
	}
}

class Gatling extends Creature {
	constructor(name, power) {
		super(name ?? "Гатлинг", power ?? 6);
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
		super(name ?? "Браток", power ?? 2);
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

class Rogue extends Creature {
	static toSteal = ["modifyDealedDamageToCreature", "modifyDealedDamageToPlayer", "modifyTakenDamage"];
	
	constructor(name, power) {
		super(name ?? "Изгой", power ?? 2);
	}
	
	modifyTakenDamage(value, fromCard, gameContext, continuation) {
		const prototype = Object.getPrototypeOf(fromCard);
		for (const property of Rogue.toSteal) {
			if (prototype.hasOwnProperty(property)) {
				this[property] = prototype[property];
				delete prototype[property];
			}
		}
		
		gameContext.updateView();
		super.modifyTakenDamage(value, fromCard, gameContext, continuation);
	}
}

function isDuck(card) {
	return card instanceof Duck;
}

function isDog(card) {
	return card instanceof Dog;
}

// Дает описание существа по схожести с утками и собаками
function getCreatureDescription(card) {
	if (isDuck(card) && isDog(card)) {
		return "Утка-Собака";
	}
	if (isDuck(card)) {
		return "Утка";
	}
	if (isDog(card)) {
		return "Собака";
	}
	return "Существо";
}


// Колода Шерифа, нижнего игрока.
const seriffStartDeck = [
	new Rogue(),
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
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
	alert("Победил " + winner.name);
});

