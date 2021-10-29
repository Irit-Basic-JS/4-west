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

class Creature extends Card{
    constructor(name,maxPower){
        super(name,maxPower);
    }
    getDescriptions() {
       return [
            getCreatureDescription(this),
            super.getDescriptions()
       ];
   }
}

// Основа для утки.
//class
class Duck extends Creature {
    constructor(name = "Мирная утка", maxPower = 2) {
        super(name, maxPower);
    }

    quacks = function () { console.log('quack') };

    swims = function () { console.log('float: both;') };
}


// Основа для собаки.
class Dog extends Creature{
    constructor(name = 'Пес-бандит', maxPower = 3){
        super(name, maxPower);
    }
}

class Trasher extends Dog{
    constructor(name = 'Громила', maxPower = 5){
        super(name, maxPower);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(value - 1));
    }

    getDescriptions(){
        return [
            "Громила получает на 1 меньше урона",
            ...super.getDescriptions(),
        ];
    }
}

class Gatling extends Creature{
    constructor(name = 'Гатлинг', maxPower = 6){
        super(name, maxPower);
    }
    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();
        let cards = gameContext.oppositePlayer.table;
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;

        for (let card of cards) {
            if (!card) continue;
            taskQueue.push(onDone => this.view.showAttack(onDone));
            taskQueue.push(onDone => this.dealDamageToCreature(1, card, gameContext, onDone));
        }

        taskQueue.continueWith(continuation);
    }

    getDescriptions(){
        return [
            "наносит 2 урона по очереди всем картам противника",
            ...super.getDescriptions(),
        ];
    }
}

class Lad extends Dog{
    constructor(name = 'Браток', maxPower = 2){
        super(name, maxPower);
    }
    static getInGameCount() { return this.inGameCount || 0; };
    static setInGameCount(value) { this.inGameCount = value; };
    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.setInGameCount(Lad.getInGameCount() + 1);
        continuation();
    }
    doBeforeRemoving(continuation) {
        Lad.setInGameCount(Lad.getInGameCount() - 1);
        continuation();
    }
    static getBonus() { return this.inGameCount * (this.inGameCount + 1) / 2; }
    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        this.view.signalAbility(() => 
            super.modifyDealedDamageToCreature(value + Lad.getBonus(), toCard, gameContext, continuation)
        )
    }
    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => 
            super.modifyTakenDamage(value - Lad.getBonus(), fromCard, gameContext, continuation)
        )
    }
    getDescriptions() { 
        if(Lad.prototype.hasOwnProperty("modifyDealedDamageToCreature") &&
            Lad.prototype.hasOwnProperty("modifyDealedDamageToCreature"))
        return ["Чем их больше, тем они сильнее", ...super.getDescriptions()];
        else return super.getDescriptions();
    }
}

class Rogue extends Creature {
    constructor(name = 'Изгой', maxPower = 2) { super(name, maxPower); }

    doBeforeAttack(gameContext, continuation) {
        const {oppositePlayer, position, updateView} = gameContext;
        const abilities = ["modifyDealedDamageToCreature", "modifyDealedDamageToPlayer", "modifyTakenDamage"];
        const oppCardProto = Object.getPrototypeOf(oppositePlayer.table[position]);
        for (let ability of abilities)
            if (oppCardProto.hasOwnProperty(ability)) {
                this[ability] = oppCardProto[ability];
                delete oppCardProto[ability]
            }
        updateView();
        continuation();
    }

    getDescriptions() {
        return ["Перед атакой забирает у карты все способности",
            ...super.getDescriptions()];
    }
}

class Brewer extends Duck {
    constructor(name = 'Пивовар', maxPower = 2) { 
        super(name, maxPower); }

    doBeforeAttack(gameContext, continuation) {
        const {currentPlayer, oppositePlayer, updateView} = gameContext;
        const cards = currentPlayer.table.concat(oppositePlayer.table);
        for (let card of cards) {
            if (isDuck(card)) {
                card.view.signalHeal(() => {
                    card.maxPower += 1;
                    card.power += 2;
                });
            }
        }

        updateView();
        continuation();
    }

    getDescriptions() {
        return ['раздает пиво',
            ...super.getDescriptions()];
    }
}

class PseudoDuck extends Dog {
    constructor(name = 'Псевдоутка', maxPower = 3) { super(name, maxPower); }

    swims() {}
    quacks() {}

    getDescriptions() {
        return ['Песоутка',
            ...super.getDescriptions()];
    }
}

class Nemo extends Duck {
    constructor(name = 'Немо', maxPower = 4) { super(name, maxPower); }

    doBeforeAttack(gameContext, continuation) {
        const {oppositePlayer, position, updateView} = gameContext;
        const oppCardProto = oppositePlayer.table[position];

        if (oppCardProto) {
            Object.setPrototypeOf(this, Object.getPrototypeOf(oppCardProto));
            updateView();
            continuation();
        }
    }

    getDescriptions() {
        return [
            "Перед атакой крадет способности врага",
            ...super.getDescriptions(),
        ]
    }
}

// Колода Шерифа, нижнего игрока.
const seriffStartDeck = [
    new Rogue(),
    new Brewer(),
    new Nemo(),
];

// Колода Бандита, верхнего игрока.
const banditStartDeck = [
    new Lad(),
    new PseudoDuck(),
];


// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
