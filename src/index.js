import Card from './Card.js';
import { Dog, Duck, Trasher, Gatling, Lad, Rogue } from './Creatures.js';
import Game from './Game.js';
import TaskQueue from './TaskQueue.js';
import SpeedRate from './SpeedRate.js';

// Колода Шерифа, нижнего игрока.
const seriffStartDeck = [
    new Rogue(),
];
const banditStartDeck = [
    new Lad(),
];

// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});