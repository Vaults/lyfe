angular.module('life', []).controller('testCtrl', function ($scope, $timeout) {
    var s = 25;
    var maxCritterCount = 15;
    var moveChance = 0.10;
    var FPS = 60;

    var tile = (c, cl, x, y) => ({
        char: c, col: cl, x: x, y: y,
    });
    var critter = (c, cl, x, y)=> $.extend(tile(c, cl, x, y), {
        moveRandom: function () {
            var xfac = 0
            var yfac = 0;
            if (rand(1 / moveChance) < 1) {
                if (rand(1) > 0) {
                    xfac = randNeg(rand(1));
                } else {
                    yfac = randNeg(rand(1));
                }
            }
            return {x: xfac, y: yfac};
        },
        sequences: {
            currSequence: {
                state: false,
                sequence: '',
                phase: 0,
                maxPhase: -1
            },
            inSequence: function(){
                return this.currSequence.state;
            },
            startSequence: function(f){
                var p = this[f].maxPhase;
                this.currSequence = {
                    state: true,
                    sequence: f,
                    phase: 0,
                    maxPhase: p
                }
            },
            endSequence: function() {
                this.currSequence = {
                    state: false,
                    sequence: '',
                    phase: 0,
                    maxPhase: -1
                }
            },
            incPhase: function() {
                this.currSequence.phase++;
            },
            isDone: function() {
                return this.currSequence.phase == this.currSequence.maxPhase;
            },
            run: function() {
                var ret = this[this.currSequence.sequence].f(this.currSequence.phase);
                this.incPhase();
                if (this.isDone()) {
                    this.endSequence();
                }
                return ret;
            },

            moveBlock: {
                'f': (p) => {
                    var dirs = {
                        "0": {x: 1, y: 0},
                        "1": {x: 1, y: 0},
                        "2": {x: 0, y: 1},
                        "3": {x: 0, y: 1},
                        "4": {x: -1, y: 0},
                        "5": {x: -1, y: 0},
                        "6": {x: 0, y: -1},
                        "7": {x: 0, y: -1},
                    }
                    return dirs[p];
                }, maxPhase: 7
            },
            moveLine: {
                'f': (p) => {
                    var dirs = {
                        "0": {x: 1, y: 0},
                        "1": {x: 1, y: 0},
                        "2": {x: 1, y: 0},
                        "3": {x: 1, y: 0},
                        "4": {x: -1, y: 0},
                        "5": {x: -1, y: 0},
                        "6": {x: -1, y: 0},
                        "7": {x: -1, y: 0},
                    }
                    return dirs[p];
                }, maxPhase: 7
            },
        },


        move: function () {
            var mod = {x: 0, y: 0};
            if (!this.sequences.inSequence()) {
                if(rand(1000) < 1) {
                    this.sequences.startSequence('moveBlock');
                }else if(rand(1000) < 2) {
                    this.sequences.startSequence('moveLine');
                }else{
                    mod = this.moveRandom();
                }
            }else {
                mod = this.sequences.run();
            }

            return {
                'from': this,
                'to': {x: clamp(0, this.x + mod.x, s - 1), y: clamp(0, this.y + mod.y, s - 1)}
            };
        }
    });
    var emptyTile = (x, y) => tile(' ', 'light-green', x, y);
    var alpha = [
        {char: 'x', col: 'red'},
        {char: 'o', col: 'blue'},
        {char: 'a', col: 'purple'}];

    var objs = '';
    var initEngine = ()=> {
        objs = new Array(s).fill('').map(o => ({}));

        for (var i = 0; i < maxCritterCount; i++) {
            var a = pickRandom(alpha);
            var x = rand(s - 1);
            var y = rand(s - 1);
            objs[x][y] = critter(a.char, a.col, x, y);
        }
        $scope.field = new Array(s).fill('').map(
            (o, x) => new Array(s).fill('').map(
                (o, y) => {
                    return (objs[x][y]) ? objs[x][y] : emptyTile(x, y)
                }
            )
        );
    }


    var render = () => {

    }

    var doMoves = () => {
        var moves = [];
        objs.forEach(y => {
            for (key in y) {
                o = y[key];
                if (o) {
                    if (o.move) {
                        moves.push(o.move());
                    }
                }
            }
            ;
        });
        moves.forEach(o => {
            if (!eqCoords(o.to, o.from) && !objs[o.to.x][o.to.y]) {
                objs[o.to.x][o.to.y] = o.from;
                objs[o.from.x][o.from.y] = null;
                $scope.field[o.to.x][o.to.y] = o.from;
                $scope.field[o.from.x][o.from.y] = emptyTile(o.from.x, o.from.y);
                o.from.x = o.to.x;
                o.from.y = o.to.y;
            }
        });
    }

    var engineLoop = () => {
        doMoves();

        render();
        $timeout(engineLoop, 1000 / FPS);
    }


    initEngine();
    engineLoop();


})


/* var randomTile = (x, y) => {
 var x = Math.random();
 if(x > 0.3){
 return emptyTile(x,y);
 }else if(x > 0.1){
 return tile(' ', 'green', x, y);
 }else if(x > 0.05){
 return tile(' ', 'light-blue', x, y);
 }
 var a = pickRandom(alpha);
 return critter(a.char, a.col, x, y);
 };*/