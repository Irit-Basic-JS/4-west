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
    constructor(name,power,image){
        super(name,power,image);
    }
    getDescriptions(){
        return [getCreatureDescription(this),...super.getDescriptions()]
    }
};



// Основа для утки.
class Duck extends Creature {
    constructor(name='Мирная утка', power=2, image=''){
        super(name,power,image)
    }
    quacks(){
        console.log('quack') 
    };
    swims () {
        console.log('float: both;') 
    };
};




// Основа для собаки.
class Dog extends Creature {
    constructor(name='Пес-Бандит',power=3,image=''){
        super(name,power,image);
    }

};

class Trasher extends Dog{
    constructor(){
        super('Громила', 5,'');
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation){
        this.view.signalAbility(() => continuation(value - 1));
    }

    getDescriptions(){
        return ['Получает на 1 урон меньше ', super.getDescriptions()] 
    }
};

class Gatling extends Creature{
    constructor(){
        super('Гатлинг',6,'');
    }

    attack (gameContext, continuation) {
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
};

class Lad extends Dog{
    static getInGameCount() { return this.inGameCount || 0; }
    static setInGameCount(value) { this.inGameCount = value; }
    static getBonus() { return this.getInGameCount() * (this.getInGameCount() + 1) / 2}
    constructor(){
        super('Браток',2,'');
    }
    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.setInGameCount(Lad.getInGameCount() + 1);
        continuation();
    }

    doBeforeRemoving(continuation) {
        Lad.setInGameCount(Lad.getInGameCount() - 1);
        continuation();
    };

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => continuation(value - Lad.getBonus()));
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        continuation(value + Lad.getBonus());
    }

    getDescriptions() {
        let descriptions = [];
        if (Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature') ||
            Lad.prototype.hasOwnProperty('modifyTakenDamage')) {
            descriptions = ["Чем их больше, тем они сильнее"];
        }
        return descriptions.concat([...super.getDescriptions()]);
    }

};

class Rogue extends Creature {
    constructor(name = "Изгой", maxPower = 2, image) {
        super(name, maxPower, image);
    }

    doBeforeAttack(gameContext, continuation){
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        //Изгой похищает эти способности: modifyDealedDamageToCreature, modifyDealedDamageToPlayer, modifyTakenDamage

        let cardOpponent = oppositePlayer.table[position];
        if (cardOpponent) {
            let prototype = Object.getPrototypeOf(cardOpponent);
            if (prototype.modifyDealedDamageToCreature) {
                this.modifyDealedDamageToCreature = prototype.modifyDealedDamageToCreature;
                delete prototype.modifyDealedDamageToCreature;
            }

            if (prototype.modifyDealedDamageToPlayer) {
                this.modifyDealedDamageToPlayer = prototype.modifyDealedDamageToPlayer;
                delete prototype.modifyDealedDamageToPlayer;
            }

            if (prototype.modifyTakenDamage) {
                this.modifyTakenDamage = prototype.modifyTakenDamage;
                delete prototype.modifyTakenDamage;
            }
        }

        updateView();
        continuation();
    }

    getDescriptions() {
        return ["Ворует силы", ...super.getDescriptions()];
    }
}

class Brewer extends Duck {
    constructor(name = "Пивовар", maxPower = 2) {
        super(name, maxPower);
    }

    doBeforeAttack(gameContext, continuation) {
        let taskQueue = new TaskQueue();
        const cards = gameContext.currentPlayer.table.concat(gameContext.oppositePlayer.table);

        for(let card of cards) {

            if(isDuck(card)) {
                card.view.signalHeal();
                card.maxPower += 1;
                card.currentPower += 2;
                card.updateView();
            }
        }

        taskQueue.continueWith(continuation);
    }
}


// Колода Шерифа, нижнего игрока.
const seriffStartDeck = [
    new Duck(),
    new Gatling(),
    new Brewer(),
    new Rogue()
    
];

// Колода Бандита, верхнего игрока.
const banditStartDeck = [
    new Trasher(),
    new Lad(),
    new Lad(),
    new Lad()
];


// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
