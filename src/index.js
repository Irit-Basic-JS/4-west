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
    constructor(name, maxPower, image) {
        super(name, maxPower, image);
    }

    getDescriptions() {
        return [getCreatureDescription(this)].concat(super.getDescriptions());
    }

    getCurrentPower() {
        return this.currentPower;
    }

    setCurrentPower(value) {
        this.currentPower = Math.min(this.maxPower, this.currentPower + value);
    }
}

class Duck extends Creature {
    constructor(name='Мирная утка', maxPower=2, image = 'duck.jpg'){
        super(name, maxPower, image)
    }

    quacks() { console.log('quack') };
    swims() { console.log('float: both;') };
}

class Dog extends Creature {
    constructor(name='Пес-бандит', maxPower=3, image = 'doggo.jpg'){
        super(name, maxPower, image)
    }
}

class Trasher extends Dog{
    constructor(name='Громила', maxPower=5, image='trasher.jpg') {
        super(name, maxPower, image);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(value - 1));
    }

    getDescriptions() {
        return ['Урон снижен на 1'].concat(super.getDescriptions());
    }
}

class Gatling extends Creature{
    constructor(name='Гатлинг', maxPower=6, image='ratata.jpg'){
        super(name, maxPower, image)
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();
        const oppositeCards = gameContext.oppositePlayer.table;
        if (oppositeCards) {
            for (let oppositeCard of oppositeCards) {
                taskQueue.push(onDone => this.view.showAttack(onDone));
                taskQueue.push(onDone => {
                    this.dealDamageToCreature(2, oppositeCard, gameContext, onDone);
                });
            }
        }

        taskQueue.continueWith(continuation);
        game.updateView();
    };

    getDescriptions() {
        return ['РА-ТА-ТА по всем врагам противника'].concat(super.getDescriptions());
    };
}

class Lad extends Dog{
    static getInGameCount() { return this.inGameCount || 0; }
    static setInGameCount(value) { this.inGameCount = value; }
    static getBonus() { return this.getInGameCount() * (this.getInGameCount() + 1) / 2; }

    constructor(name='Браток', maxPower=2, image='lads.jpg') {
        super(name, maxPower, image);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(value - Lad.getBonus()));
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(value + Lad.getBonus()));
    }

    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.setInGameCount(Lad.getInGameCount() + 1);
        continuation();
    }

    doBeforeRemoving(continuation) {
        Lad.setInGameCount(Lad.getInGameCount() - 1);
        continuation();
    };

    getDescriptions() {
        let descriptions = [];
        if (Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature') ||
            Lad.prototype.hasOwnProperty('modifyTakenDamage')) {
            descriptions = ["Чем их больше, тем они сильнее"];
        }
        return descriptions.concat(super.getDescriptions());
    }
}

class Rogue extends Creature{
    constructor(name='Изгой', maxPower=2, image='rogue.png') {
        super(name, maxPower, image);
    }

    doBeforeAttack(gameContext, continuation) {
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        const oppositeCard = oppositePlayer.table[position];

        if (oppositeCard) {
            const obj = Object.getPrototypeOf(oppositeCard);
            if (obj.hasOwnProperty('modifyDealedDamageToCreature')) {
                this.modifyDealedDamageToCreature = obj.modifyDealedDamageToCreature;
                delete obj['modifyDealedDamageToCreature'];
            }
            if (obj.hasOwnProperty('modifyDealedDamageToPlayer')) {
                this.modifyDealedDamageToPlayer = obj.modifyDealedDamageToPlayer;
                delete obj['modifyDealedDamageToPlayer'];
            }
            if (obj.hasOwnProperty('modifyTakenDamage')) {
                this.modifyTakenDamage = obj.modifyTakenDamage;
                delete obj['modifyTakenDamage'];
            }
        }
        updateView();
        continuation();
    }

    getDescriptions() {
        return ["Ворует способности врагов на увеличение урона или защиты"].concat(super.getDescriptions());
    }
}

class Brewer extends Duck{
    constructor(name = "Пивовар", maxPower = 2, image='brewer.jpg') {
        super(name, maxPower, image);
    }

    doBeforeAttack(gameContext, continuation) {
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        const cards = currentPlayer.table.concat(oppositePlayer.table);
        for (let card of cards) {
            if (isDuck(card)) {
                card.view.signalHeal(() => {
                    card.maxPower += 1;
                    card.power += 2;
                    card.updateView();
                });
            }
        }
        continuation();

    }

    getDescriptions() {
        return ["Пивка для рывка (только уткам)"].concat(super.getDescriptions());
    }
}

class PseudoDuck extends Dog {
    constructor(name = "Псевдоутка", maxPower = 3, image='pseudo.jpg' ) {
        super(name, maxPower, image);
    }
    quacks() {
        console.log('кря')
    };
    swims() {
        console.log('float: both;')
    };
    getDescriptions() {
        return ["Кря! Пива мне, бармен"].concat(super.getDescriptions());
    }
}

class Nemo extends Creature {
    constructor(name = "Немо", maxPower = 4, image='noname.png') {
        super(name, maxPower, image);
    }

    doBeforeAttack(gameContext, continuation) {
        this.view.signalAbility(() => {
            const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
            const oppositeCard = oppositePlayer.table[position];

            if (oppositeCard) {
                Object.setPrototypeOf(this, Object.getPrototypeOf(oppositeCard));
                gameContext.updateView();
                continuation();
            }
        });
    }

    getDescriptions() {
        return ["Крадет все способности врага"].concat(super.getDescriptions());
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
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
