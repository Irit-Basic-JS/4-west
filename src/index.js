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
    constructor(name, maxPower){
        super(name, maxPower)
    };
    getDescriptions(){
        return [getCreatureDescription(this), ...super.getDescriptions()];
    };
}

class Duck extends Creature{
    constructor(name = 'Мирная утка', maxPower = 2){
        super(name, maxPower)
    }
    quacks = function () { console.log('quack') };
    swims = function () { console.log('float: both;') };
}

class Dog extends Creature{
    constructor(name = 'Пес-бандит', maxPower = 3){
        super(name, maxPower)
    }
}

class Trasher extends Dog{
    constructor(name = 'Громила', maxPower=5){
        super(name, maxPower)
    };
    modifyTakenDamage(actualValue, fromCard, gameContext, continuation){
        this.view.signalAbility(() => continuation(actualValue-1));
    }
    getDescriptions(){
        return ['Получает на один меньше урона', ...super.getDescriptions()];
    };
}

class Gatling extends Creature{
    constructor(name = 'Гатлинг', maxPower = 6){
        super(name, maxPower)
    }
    attack(gameContext, continuation){
        gameContext.oppositePlayer.table.forEach(element => {
            this.dealDamageToCreature(2, element, gameContext, continuation)
        });
    }
    getDescriptions(){
        return ['Наносит 2 урона всем картам противника', ...super.getDescriptions()];
    }
}

class Lad extends Dog{
    constructor(name='Браток', maxPower=2){
        super(name, maxPower)
    }
    static getInGameCount() { return this.inGameCount || 0; }
    static setInGameCount(value) { this.inGameCount = value; }
    
    doAfterComingIntoPlay(gameContext, continuation){
        Lad.setInGameCount(Lad.getInGameCount() + 1);
        continuation();
    }
    doBeforeRemoving(continuation){
        Lad.setInGameCount(Lad.getInGameCount() - 1);
        continuation();
    }

    static getBonus(){
        return this.inGameCount*(this.inGameCount+1)/2;
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation){
        this.view.signalAbility(()=>
        super.modifyTakenDamage(value + Lad.getBonus(), toCard, gameContext, continuation))
    }
    modifyTakenDamage(value, fromCard, gameContext, continuation){
        this.view.signalAbility(() =>
         super.modifyTakenDamage(value - Lad.getBonus(), fromCard, gameContext, continuation));
    }
    getDescriptions(){
        if (Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature') 
            || Lad.prototype.hasOwnProperty('modifyTakenDamage'))
            return ['Чем их больше, тем они сильнее', ...super.getDescriptions()];
        return super.getDescriptions();
    }
}
// Колода Шерифа, нижнего игрока.
const seriffStartDeck = [
    new Duck(),
    new Duck(),
    new Duck(),
    new Gatling(),
];

// Колода Бандита, верхнего игрока.
const banditStartDeck = [
    new Lad(),
    new Lad(),
];


// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(5);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
