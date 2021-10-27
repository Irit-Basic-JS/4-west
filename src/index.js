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
    constructor(name, maxPower, image) {
        super(name, maxPower, image);
        //this._currentPower = maxPower;
    };
    get currentPower() {
        return this._currentPower;
    };
    set currentPower(value) {
        this._currentPower = Math.min(Math.max(value, 0), this.maxPower);
    };
    getDescriptions() {
        return [
            getCreatureDescription(this),
            ...super.getDescriptions(),
        ];
    };
};

// Основа для утки.
class Duck extends Creature {
    constructor(name = "Мирная утка", maxPower = 2, image) {
        super(name, maxPower, image)
    };
    quacks() { 
        console.log('quack') 
    };
    swims() { 
        console.log('float: both;') 
    };
};


// Основа для собаки.
class Dog extends Creature {
    constructor(name = "Пес-бандит", maxPower = 3, image) {
        super(name, maxPower, image);
    };
};

class Trasher extends Dog {
    constructor() {
        super("Громила", 5);
    }
    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(value - 1));
    }
    getDescriptions() {
        return [
            "Громила получает на 1 меньше урона",
            ...super.getDescriptions(),
        ];
    }
}

class Gatling extends Creature {
    constructor() {
        super("Гатлинг", 6);
    }
    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();

        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;

        for (let card of oppositePlayer.table) {
            if (!card) continue;
            taskQueue.push(onDone => this.view.showAttack(onDone));
            taskQueue.push(onDone => this.dealDamageToCreature(2, card, gameContext, onDone));
        };

        taskQueue.continueWith(continuation);
    }
    getDescriptions() {
        return [
            "При атаке наносит 2 урона всем картам противника",
            ...super.getDescriptions(),
        ]
    }
}

class Lad extends Dog {
    constructor() {
        super("Браток", 2);
    }
    static getInGameCount() {
        return this.inGameCount || 0;
    }
    static setInGameCount(value) {
        this.inGameCount = value;
    }
    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.setInGameCount(Lad.getInGameCount() + 1);
        continuation();
    }
    doBeforeRemoving(continuation) {
        Lad.setInGameCount(Lad.getInGameCount() - 1);
        continuation();
    }
    static getBonus() {
        return this.inGameCount * (this.inGameCount + 1) / 2;
    }
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
        const isLad = Lad.prototype.hasOwnProperty("modifyDealedDamageToCreature") &&
            Lad.prototype.hasOwnProperty("modifyDealedDamageToCreature");
        return isLad ? 
            ["Чем их больше, тем они сильнее", ...super.getDescriptions()] : 
            super.getDescriptions();
    }
}

class Rogue extends Creature {
    constructor() {
        super("Изгой", 2);
    }
    doBeforeAttack(gameContext, continuation) {
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        const taskQueue = new TaskQueue();

        const abilities = ["modifyDealedDamageToCreature", "modifyDealedDamageToPlayer", "modifyTakenDamage"];
        const toCard = oppositePlayer.table[position];
        const enemyCardProto = Object.getPrototypeOf(toCard);
        taskQueue.push(onDone => {
            abilities.forEach(ability => {
                if(enemyCardProto.hasOwnProperty(ability))
                    this[ability] = enemyCardProto[ability];
                    delete enemyCardProto[ability];
            });
            this.view.signalAbility(onDone);
            gameContext.updateView();
        });
        taskQueue.continueWith(continuation);
    }
}

class Brewer extends Duck {
    constructor() {
        super("Пивовар", 2);
    }
    doBeforeAttack(gameContext, continuation) {
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        const allCards = currentPlayer.table.concat(oppositePlayer.table);
        const allDucks = allCards.filter(card => isDuck(card));
        const taskQueue = new TaskQueue();
        allDucks.forEach(duck => {
            taskQueue.push(onDone => {
                duck.maxPower += 1;
                duck.currentPower += 2;
                duck.view.signalHeal(onDone);
                duck.updateView();
            });
        });
        taskQueue.continueWith(continuation);
    }  
}

class PseudoDuck extends Dog {
    constructor() {
        super("Псевдоутка", 3);
    }
    swims() {}
    quacks() {}
}

class Nemo extends Creature {
    constructor() {
        super("Немо", 4);
    }
    doBeforeAttack(gameContext, continuation) {
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        const taskQueue = new TaskQueue();
        taskQueue.push(onDone => {
            const toCard = oppositePlayer.table[position];
            Object.setPrototypeOf(this, Object.getPrototypeOf(toCard));
            this.doBeforeAttack(gameContext);
            this.view.signalAbility(onDone);
            gameContext.updateView();
        })
        taskQueue.continueWith(continuation);
    }
    getDescriptions() {
        return [
            "Перед атакой на карту Немо крадёт все её способности",
            ...super.getDescriptions(),
        ]
    }
}

// Колода Шерифа, нижнего игрока.
const seriffStartDeck = [
    new Nemo(),
]
// Колода Бандита, верхнего игрока.
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
    alert('Победил ' + winner.name);
});
