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
        super(name, maxPower);
    }
    getDescriptions(){
        return [getCreatureDescription(this), super.getDescriptions()]
    }
}

class Gatling extends Creature{
    constructor(name = "Гатлинг", maxPower = 6){
        super(name, maxPower);
    }
    attack(gameContext, continuation){
        const taskQueue = new TaskQueue();
        gameContext.oppositePlayer.table.forEach(card=>{
            if (card){
                taskQueue.push(onDone => this.view.showAttack(onDone));
                taskQueue.push(onDone => {
                    this.dealDamageToCreature(2, card, gameContext, onDone);
                });
            };
        });
        taskQueue.continueWith(continuation);
    }
}

class Rogue extends Creature{
    constructor(name = "Изгой", maxPower = 2){
        super(name, maxPower);
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation){
        Object.getOwnPropertyNames(Rogue.prototype).forEach(property => {
            if (Object.getPrototypeOf(toCard).hasOwnProperty(property) && property != 'constructor') {
                this[property] = Object.getPrototypeOf(toCard)[property];
                delete Object.getPrototypeOf(toCard)[property];
            }
        })
        gameContext.updateView();
        continuation(value);
    }

    modifyDealedDamageToPlayer(value, gameContext, continuation){
        continuation(value);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation){
        continuation(value);
    }
}

class Nemo extends Creature{
    constructor(name='Немо', maxPower = 4){
        super(name, maxPower);
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation){
        Object.setPrototypeOf(this, Object.getPrototypeOf(toCard))
        this.doBeforeAttack(gameContext, continuation);
        gameContext.updateView();
    }
}

class Duck extends Creature{
    constructor(name = 'Мирный житель', maxPower = 2) {
        super(name, maxPower);
    }

    quacks(){
        console.log('quack');
    }
    
    swims() {
        console.log('float: both;');
    }
    
}

class Brewer extends Duck{
    constructor(name = 'Пивовар', maxPower = 2){
        super(name, maxPower);
    }

    doBeforeAttack(gameContext, continuation){
        let {currentPlayer, oppositePlayer} = gameContext;
        currentPlayer.table.concat(oppositePlayer.table).filter(isDuck).forEach(card => {
            card.maxPower += 1;
            card.currentPower += 2;
            if (card.currentPower > card.maxPower)
                card.currentPower = card.maxPower;
            this.view.signalHeal(()=>{});
            card.updateView();
        })
        continuation();
    }
}

class Dog extends Creature{
    constructor(name = 'Бандит', maxPower = 3) {
        super(name, maxPower);
    }
}

class Trasher extends Dog{
    constructor(name = 'Громила', maxPower = 5) {
        super(name, maxPower);
    }
    modifyTakenDamage(value, fromCard, gameContext, continuation){
        this.view.signalAbility(() => continuation(value-1));
    }
    getDescriptions(){
        return [getCreatureDescription(this), 'Получает на 1 меньше урона']
    }
}

class Lad extends Dog{
    constructor(name = 'Браток', maxPower = 2){
        super(name, maxPower);
    };

    static getInGameCount() { return this.inGameCount || 0; };

    static setInGameCount(value) { this.inGameCount = value; };
    
    doAfterComingIntoPlay(gameContext, continuation){
        Lad.setInGameCount(Lad.getInGameCount() + 1);
        continuation();
    }

    doBeforeRemoving(continuation){
        Lad.setInGameCount(Lad.getInGameCount() - 1);
        continuation();
    }

    static getBonus(){
        const count = this.getInGameCount();
        return count*(count+1)/2;
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation){
        continuation(value + Lad.getBonus());
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation){
        continuation(value - Lad.getBonus());
    }

    getDescriptions(){
        let descriptions = Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature') || Lad.prototype.hasOwnProperty('modifyTakenDamage') 
        ? 'Чем их больше, тем они сильнее': super.getDescriptions();
        return [getCreatureDescription(this), descriptions]
    }
}

class PseudoDuck extends Dog{
    constructor(name = 'Псевдоутка', maxPower = 3) {
        super(name, maxPower);
    }

    quacks() {
        console.log('quack');
    }

    swims() {
        console.log('float: both;');
    }
}

const seriffStartDeck = [
    new Nemo(),
];
const banditStartDeck = [
    new Brewer(),
    new Brewer(),
    new Trasher()
];

// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});