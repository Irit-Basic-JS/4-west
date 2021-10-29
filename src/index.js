import Card from "./Card.js";
import Game from "./Game.js";
import TaskQueue from "./TaskQueue.js";
import SpeedRate from "./SpeedRate.js";
class Creature extends Card {
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
        super(name ?? "Пес-бандит", power ?? 3);
    }
}

class Trasher extends Dog {
    constructor(name, power) {
        super(name ?? "Громила", power ?? 5);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
    }
    this.view.signalAbility(function () {
        super.modifyTakenDamage(value - 1, fromCard, gameContext, continuation);
    });
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
        if (Lad.prototype.hasOwnProperty("modifyDealedDamageToCreature")
            && Lad.prototype.hasOwnProperty("modifyTakenDamage")) {
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

class Brewer extends Duck {

    constructor(name, power) {
        super(name ?? "Пивовар", power ?? 2);
        this._currentPower = power ?? 2;
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        const cards = gameContext.currentPlayer.table.concat(gameContext.oppositePlayer.table);
        for (const card of cards) {
            if (isDuck(card)) {
                card.view.signalHeal(function () {
                    card.maxPower += 1;
                    card.currentPower += 2;
                    card.updateView();
                });
            }
        }
        super.modifyDealedDamageToCreature(value, toCard, gameContext, continuation);
    }
}

class PseudoDuck extends Dog {
    constructor(name, power) {
        super(name ?? "Псевдоутка", power ?? 3);
    }

    quacks() {
        console.log("quack");
    }

    swims() {
        console.log("float: both;");
    }
}

class Nemo extends Creature {
    constructor(name, power) {
        super(name ?? "Немо", power ?? 4);
    }

    doBeforeAttack(gameContext, continuation) {
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        const oppositeCard = oppositePlayer.table[position];
        const prototype = Object.getPrototypeOf(oppositeCard);
        Object.setPrototypeOf(this, prototype);
        gameContext.updateView();
        this.doBeforeAttack(gameContext, continuation);
    }
}
function isDuck(card) {
    return card && card.quacks && card.swims;
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
    alert("Победил " + winner.name);
});