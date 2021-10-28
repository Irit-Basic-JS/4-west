export default class TaskQueue {
    constructor() {
        this.tasks = [];
        this.running = false;
    }

    push = function(run, dispose, duration) {
        if (duration === undefined || duration === null) {
            this.tasks.push({runAndContinue: run, dispose});
        } else {
            this.tasks.push({
                runAndContinue: (continuation) => {
                    run();
                    setTimeout(() => {
                        continuation();
                    }, duration);
                },
                dispose
            });
        }
        this.#runNextTask();
    };

    continueWith = function(action) {
        this.push(action, null, 0);
    };

    #runNextTask() {
        if (this.running || this.tasks.length === 0) {
            return;
        }
        this.running = true;
        const task = this.tasks.shift();
    
        if (task.runAndContinue) {
            setTimeout(() => {
                task.runAndContinue(() => {
                    task.dispose && task.dispose();
                    this.running = false;
    
                    setTimeout(() => {
                        this.#runNextTask();
                    });
                });
            }, 0);
        }
        else {
            this.#runNextTask();
        }
    }
}