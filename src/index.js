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

class Trasher extends Dog{
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
                this.dealDamageToCreature(2, card, gameContext, onDone)
            );
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
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
	alert("Победил " + winner.name);
});

