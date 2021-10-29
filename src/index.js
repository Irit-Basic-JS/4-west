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

class Creature extends Card {
	constructor(name, power) {
		super(name, power);
		this._currentPower = power;
	}

	get currentPower(){
		return this._currentPower;
	}

	set currentPower(value){
		if (value > this.maxPower){
			this._currentPower = this.maxPower;
		} else{
			this._currentPower = value;
		}
	}
    
	getDescriptions() {
		return [super.getDescriptions(), getCreatureDescription(this)];
	}
}

class Duck extends Creature{
    constructor(name = "Мирная утка", power = 2) {
        super(name, power);
    }

    quacks() {
        console.log('quack');
    }
    
    swims() {
        console.log('float: both;');
    }
}

class Dog extends Creature{
    constructor(name = "Генерал-гавс из бравл старс", power = 3) {
        super(name, power);
    }
}

class Trasher extends Dog{
    constructor(name = "Громила", power = 5) {
        super(name, power);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(value - 1));
    }
}

class Gatling extends Creature {
    constructor(name = "Гатлинг", power = 6) {
        super(name, power);
    }

    attack(gameContext, continuation) {
        let taskQueue = new TaskQueue();

        let oppositePlayer = gameContext.oppositePlayer;

        taskQueue.push((onDone) => 
                this.view.showAttack(onDone));

        for (let card of oppositePlayer.table) {          
            taskQueue.push((onDone) =>
                this.dealDamageToCreature(2, card, gameContext, onDone)
            );
        }

        taskQueue.continueWith(continuation);
    }
}

class Lad extends Dog {
	constructor(name = "Браток", power = 2) {
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

	static getCurrentBonus() {
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
		super.modifyDealedDamageToCreature(value + Lad.getCurrentBonus(), toCard, gameContext, continuation);
	}

	modifyTakenDamage(value, fromCard, gameContext, continuation) {
		super.modifyTakenDamage(value - Lad.getCurrentBonus(), fromCard, gameContext, continuation);
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
	constructor(name = "Изгой", power = 2) {
		super(name, power);
	}

	modifyTakenDamage(value, fromCard, gameContext, continuation) {
		const prototype = Object.getPrototypeOf(fromCard);
		for (const property of ["modifyDealedDamageToCreature", 
        "modifyDealedDamageToPlayer", "modifyTakenDamage"]) {
			if (prototype.hasOwnProperty(property)) {
				this[property] = prototype[property];
				delete prototype[property];
			}
		}

		gameContext.updateView();
		super.modifyTakenDamage(value, fromCard, gameContext, continuation);
	}
}

class Brewer extends Duck{

	constructor(name = "Пивовар", power = 2) {
		super(name, power);
		this._currentPower = power;
	}

	modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
		for (const card of gameContext.currentPlayer.table
            .concat(gameContext.oppositePlayer.table)){
			if (isDuck(card)){
				card.view.signalHeal(function (){
					card.maxPower += 1;
					card.currentPower += 2;
					card.updateView();
				});
			}
		}
		super.modifyDealedDamageToCreature(value, toCard, gameContext, continuation);
	}
}

class PseudoDuck extends Dog{
	constructor(name = "Псевдоутка", power = 3) {
		super(name, power);
	}

	quacks() {
		console.log("quack");
	}

	swims() {
		console.log("float: both;");
	}
}

class Nemo extends Creature{
	constructor(name = "Немо", power = 4) {
		super(name, power);
	}
	
    doBeforeAttack (gameContext, continuation){
		const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
		Object.setPrototypeOf(this, 
            Object.getPrototypeOf(oppositePlayer.table[position]));
		gameContext.updateView();
		this.doBeforeAttack(gameContext, continuation);
	}
}

const seriffStartDeck = [
    new Duck(),
    new Duck(),
    new Duck(),
    new Gatling(),
];
const banditStartDeck = [
    new Trasher(),
    new Dog(),
    new Dog(),
];

// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(4);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
