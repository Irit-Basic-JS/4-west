import Card from './Card.js';
import Game from './Game.js';
import TaskQueue from './TaskQueue.js';
import SpeedRate from './SpeedRate.js';

function isDuck(card) {
    return card && card.quacks && card.swims;
}

function isDog(card) {
    return card instanceof Dog;
}

function getCreatureDescription(card) {
    if (isDuck(card) && isDog(card)) return 'Утка-Собака';
    if (isDuck(card)) return 'Утка';
    if (isDog(card)) return 'Собака';
    return 'Существо';
}

class Creature extends Card {
    constructor(name, maxPower) {
        super(name, maxPower);
    }

    getDescriptions() {
        let first = getCreatureDescription(this);
        let second = super.getDescriptions();
        return [first, second];
    }
}

class Duck extends Creature {
    constructor(name = "Мирная утка", maxPower = 2) {
        super(name, maxPower);
    }

    quacks() {
        console.log("quack")
    }

    swims() {
        console.log("float: both;")
    }
}

function Dog() {

    class Dog extends Creature {
        constructor(name = "Пес-бандит", maxPower = 3) {
            super(name, maxPower);
        }
    }

    class Trasher extends Dog {
        constructor(name = "Громила", maxPower = 5) {
            super(name, maxPower);
        }

        modifyTakenDamage(value, fromCard, gameContext, continuation) {
            this.view.signalAbility(() => {
                super.modifyTakenDamage(value - 1, fromCard, gameContext, continuation);
            });
        }

        getDescriptions() {
            let first = "Получает на 1 меньше урона";
            return [first. super.getDescriptions()];
        }
    }

    class Gatling extends Creature {
        constructor(name = "Гатлинг", maxPower = 6) {
            super(name, maxPower);
        }

        attack(gameContext, continuation) {
            const taskQueue = new TaskQueue();
            const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
            taskQueue.push(onDone => this.view.showAttack(onDone));
            const cards = gameContext.oppositePlayer.table;
            for (const card of cards) {
                if (cards) {
                    taskQueue.push(onDone => {
                        this.dealDamageToCreature(2, card, gameContext, onDone);
                    });
                }
                else {
                    taskQueue.push(onDone => this.dealDamageToPlayer(1, gameContext, onDone));
                }
            }
            taskQueue.continueWith(continuation);
        }
    }

    class Lad extends Dog {
        constructor(name = "Братки", maxPower = 2) {
            super(name, maxPower);
        }

        static getInGameCount() {
            return Lad.inGameCount || 0;
        }

        static setInGameCount(value) {
            Lad.inGameCount = value;
        }

        static getBonus() {
            return Lad.getInGameCount() * (Lad.getInGameCount() + 1) / 2;
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

        modifyTakenDamage(value, toCard, gameContext, continuation) {
            super.modifyTakenDamage(value - Lad.getBonus(), toCard, gameContext, continuation);
        }
    }
}

class PseudoDuck extends Dog {
    constructor(name = "Псевдоутка", maxPower = 3) {
        super(name, maxPower);
    }

    quacks() {
        console.log("quack")
    }

    swims() {
        console.log("float: both;")
    }
}

const seriffStartDeck = [
    new Duck(),
    new Duck(),
    new Duck(),
];

const banditStartDeck = [
    new Lad(),
    new PseudoDuck(),
    new Lad()
];

const game = new Game(seriffStartDeck, banditStartDeck);

SpeedRate.set(1);

game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
