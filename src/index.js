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

//Класс Creature
class Creature extends Card
{   constructor(name, maxPower, image)
    {
        super (name, maxPower, image);
        this._currentPower = maxPower;
    }

    getDescriptions() {
        return [getCreatureDescription(this), super.getDescriptions()];
    } 
 
    set currentPower(value) {
        value > this.maxPower ? this._currentPower = this.maxPower : this._currentPower = value;
    }
    
    get currentPower() {return this._currentPower;}
};

// Основа для утки.
/*function Duck() {
    this.quacks = function () { console.log('quack') };
    this.swims = function () { console.log('float: both;') };
}*/
// Класс Duck
class Duck extends Creature 
{
    constructor(name, maxPower, image)
    {
        super(name||'Мирная утка', maxPower||2, image);
    }
    quacks() { console.log('quack') };
    swims() { console.log('float: both;') };
};

// Основа для собаки.
/*function Dog() {
}*/
// Класс Dog
class Dog extends Creature 
{
    constructor(name, maxPower, image)
    {
        super(name||'Пес-бандит', maxPower||3, image);
    }
};

// Класс Trasher
class Trasher extends Dog 
{
    constructor(name, maxPower, image)
    {
        super(name||'Громила', maxPower||5, image);
    }

    quacks() { console.log('quack') };
    swims() { console.log('float: both;') };
    
    modifyTakenDamage(value, fromCard, gameContext, continuation)
    {
        this.view.signalAbility(() => {
           super.modifyTakenDamage(value - 1, fromCard, gameContext, continuation); 
        });
    };

    getDescriptions()
    {
        if (Trasher.prototype.hasOwnProperty('modifyTakenDamage')) 
        {
            const rez = super.getDescriptions();
            rez.unshift('Урон на 1 меньше', '<br><br>');
            return rez;
        } else
        {
            return super.getDescriptions();   
        }
    };
}

// Класс Gatling
class Gatling extends Creature 
{
    constructor(name, maxPower, image)
    {
        super(name||'Гатлинг', maxPower||6, image);
    }

    modifyDealedDamageToCreature (value, toCard, gameContext, continuation) 
    {
        this.view.signalAbility(() => {
            super.modifyDealedDamageToCreature (2, toCard, gameContext, continuation); 
        });
    }
 
    attack (gameContext, continuation)
    {   
        const taskQueue = new TaskQueue();
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        taskQueue.push(onDone => this.view.showAttack(onDone));
        for(let pos = 0; pos < oppositePlayer.table.length; pos++)
        {
            //taskQueue.push(onDone => this.view.showAttack(onDone));
            taskQueue.push(onDone => {
                const oppositeCard = oppositePlayer.table[pos];
                if (oppositeCard) {
                    this.dealDamageToCreature(this.currentPower, oppositeCard, gameContext, onDone);
                } 
            });
        }

        taskQueue.continueWith(continuation);
    };
}

// Класс Lad
class Lad extends Dog 
{
    constructor(name, maxPower, image)
    {
        super(name||'Браток', maxPower||2, image);
    }

    static getInGameCount() { return this.inGameCount || 0; }
    static setInGameCount(value) { this.inGameCount = value; }

    doAfterComingIntoPlay(gameContext, continuation) 
    {
        Lad.setInGameCount(Lad.getInGameCount() + 1);
        super.doAfterComingIntoPlay(gameContext, continuation);
    };

    doBeforeRemoving(continuation) 
    {
        Lad.setInGameCount(Lad.getInGameCount() - 1);
        super.doBeforeRemoving(continuation);
    };

    static getBonus() 
    {
        let countLad = this.getInGameCount();
        return Math.round(countLad * (countLad + 1) / 2);
    }
    
    modifyTakenDamage(value, fromCard, gameContext, continuation)
    {
        this.view.signalAbility(() => {
           super.modifyTakenDamage(value - Lad.getBonus(), fromCard, gameContext, continuation); 
        });
    };

    modifyDealedDamageToCreature (value, toCard, gameContext, continuation) 
    {
        this.view.signalAbility(() => {
            super.modifyDealedDamageToCreature (value + Lad.getBonus(), toCard, gameContext, continuation);
        }); 
    } 
    
    getDescriptions()
    {
        if (Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature') || Lad.prototype.hasOwnProperty('modifyTakenDamage'))
        {
            const rez = super.getDescriptions();
            rez.unshift('Чем их больше, тем они сильнее', '<br><br>');
            return rez;
        } 
        else
        {
            return super.getDescriptions();   
        }
    };
};

// Класс Rogue
class Rogue extends Creature 
{
    constructor(name, maxPower, image)
    {
        super(name||'Изгой', maxPower||2, image);
    }

    // Забирает способности у типа карты противника
    doBeforeAttack(gameContext, continuation) 
    {
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        if (position < oppositePlayer.table.length)
        {
            let objPrototype = Object.getPrototypeOf(oppositePlayer.table[position]);
            let arrPr = ['modifyDealedDamageToCreature', 'modifyDealedDamageToPlayer', 'modifyTakenDamage'];
            for (let i = 0; i < arrPr.length; i++)
                if (objPrototype.hasOwnProperty(arrPr[i]))
                { 
                    // добавляем способность изгою, но не в прототип, чтобы не наследовалась
                    currentPlayer.table[position][arrPr[i]] = objPrototype[arrPr[i]];
                    // удаляем способность у класса карты соперника
                    delete objPrototype[arrPr[i]];
                    // запоминаем, у кого отняли способности
                    currentPlayer.table[position].takeAway = oppositePlayer.table[position].name;    
                }       
            updateView();
        }
        continuation();
    };

    getDescriptions()
    {
        let str = 'Отнимаю способности'
        if (this.takeAway) str = 'Отнял способности у карты \"' + this.takeAway + '\"';
        const rez = super.getDescriptions();
        rez.unshift(str, '<br><br>');
        return rez;
    };
}

// Класс Brewer
class Brewer extends Duck 
{
    constructor(name, maxPower, image)
    {
        super(name||'Пивовар', maxPower||2, image);
    }
    
    // Раздача "пива"
    doBeforeAttack(gameContext, continuation) 
    {
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        let arrCard = currentPlayer.table.concat(oppositePlayer.table);
        for (let i = 0; i < arrCard.length; i++)
            if (isDuck(arrCard[i])) 
                arrCard[i].view.signalHeal (() => {
                    arrCard[i].maxPower++; 
                    arrCard[i].currentPower += 2;  
                    arrCard[i].updateView();
                });         
        continuation();
    };

    getDescriptions()
    {
        const rez = super.getDescriptions();
        rez.unshift('Раздаю уткам способности', '<br><br>');
        return rez;
    };
    
};

// Класс PseudoDuck
class PseudoDuck extends Dog 
{
    constructor(name, maxPower, image)
    {
        super(name||'Псевдоутка', maxPower||3, image);
    }

    quacks() { console.log('quack') };
    swims() { console.log('float: both;') };
}

// Класс Nemo
class Nemo extends Creature 
{
    constructor(name, maxPower, image)
    {
        super(name||'Немо', maxPower||4, image);
    }

    // Крадет прототип у карты противника, и теряет свою способность воровать
    doBeforeAttack(gameContext, continuation) 
    {
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        if (position < oppositePlayer.table.length)
        {
            let proto = Object.getPrototypeOf(oppositePlayer.table[position]);
            Object.setPrototypeOf(this, proto);
            updateView();
            this.doBeforeAttack(gameContext, continuation);
        } else continuation();
    };
}


// Колода Шерифа, нижнего игрока.
const seriffStartDeck = [
    new Duck(),
    new Duck(),
    new Rogue(),
    new Rogue(),
    new Brewer(),
    new Brewer(),
    new Nemo(),
];

// Колода Бандита, верхнего игрока.
const banditStartDeck = [
    new Lad(),
    new Lad(),
    new Lad(),
    new Dog(),
    new Dog(),
    new PseudoDuck(),
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
