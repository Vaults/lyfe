angular.module('life', []).controller('testCtrl', function ($scope, $timeout) {
    var s = 50;
    var maxCritterCount = s;
    var moveChance = 0.10;
    var FPS = 30;
    var noWalls = !true;
    var wallFactor = 0.6;
    var seqChance = 0.00069;

    var tile = (c, cl, x, y) => {
        var color = {};
        if(typeof cl == "string"){color.toString = () => cl;}
        else{ color = {hue: cl, sat: 60, br: 20, toString : function(){return 'hsl('+this.hue+','+this.sat+'%,'+this.br+'%);'}}}
        return {char: c, col: color, x:x, y:y};
    };
    var critter = (c, cl, x, y, rot)=> $.extend(tile(c, cl, x, y), {
        rotation: rot,
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
            startSequence: function(f, par){
                var p = this[f].maxPhase;
                this.currSequence = {
                    state: true,
                    sequence: f,
                    phase: 0,
                    maxPhase: p,
                    parameters: par
                };
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
                try {
                    var ret = this[this.currSequence.sequence].f(this.currSequence.phase, this.currSequence.parameters);
                    this.incPhase();
                    if (this.isDone()) {
                        this.endSequence();
                    }
                    return ret;
                }catch(e){
                    console.log('SEQUENCE BROKEN, EXCEPTION THROWN');
                    console.log('sequence',this.currSequence.sequence,'state', this.currSequence.state);
                    throw e;
                }
            },

            moveBlock: {
                'f': (p, par) => {
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
                    if(par){ return dirs[p]; }
                    return {x: -dirs[p].x, y: -dirs[p].y};
                }, maxPhase: 7
            },
            moveLine: {
                'f': (p, par) => {
                    return par;
                }, maxPhase: 5
            },
            moveRandom: {
                'f': (p, par) =>{
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
                }, maxPhase: 1
            },
            moveStill:{'f':(p,par)=>({x:0,y:0}),maxPhase:1},
            moveZigzag:{'f':(p,par)=>{
                var dirs=[
                    {x:-1, y:0},
                    {x:0, y:1},
                    {x:1, y:0},
                    {x:0, y:-1}
                    ];
                var winds = {'w':0,'n':1,'e':2,'s':3};
                var d = winds[par];
                if(p % 4 == 1 || p % 4 == 2){return dirs[d];}
                else{return (p % 4 == 0)?dirs[trueMod(d-1, 4)]:dirs[(d+1)%4]}
            }, maxPhase:8}
        },
        senseSurroundings: (x,y) => {
            var ret = [];
            for(var i = -1; i <= 1; i++){
                for(var j = -1; j <= 1; j++){
                    if(objs[x + i] && objs[x+i][y+j] && objs[x+i][y+j].move && Math.abs(i) != Math.abs(j)){
                        ret.push([i,j, objs[x+i][y+j]]);
                    }
                }
            }
          return ret;
        },
        isThreat: function(c) {
            return Math.abs(this.col.hue - c.col.hue) + rand(30) > 130;
        },
        move: function () {
            var mod = {x: 0, y: 0};
            var surr = this.senseSurroundings(this.x, this.y);

            if(surr.length > 0){
                //oh no run away
                if(this.isThreat(surr[0][2])) {
                    if(rand(10) > 5) {
                        this.sequences.startSequence('moveLine', {x: -(surr[0][0]), y: -(surr[0][1])});
                    }else{
                        var d;
                        if(surr[0][0] > this.x){
                            d = 'e';
                        }else if(surr[0][0] < this.x){
                            d = 'w';
                        }else if(surr[0][1] < this.y){
                            d = 'n';
                        }else{
                            d = 's';
                        }
                        this.sequences.startSequence('moveZigzag', d);
                    }
                }
            }
            if(!this.sequences.inSequence()){
                this.sequences.startSequence('moveRandom');
                var r = rand(1/seqChance);
                if(r < 2){
                    this.sequences.startSequence('moveBlock', rand(10) > 5);
                }else if(r < 4) {
                    this.sequences.startSequence('moveZigzag', pickRandom(['n','w','s','e']));
                }
            }


            mod = this.sequences.run();


            var ret = {
                'from': this,
                'to': {x: clamp(0, this.x + mod.x, s - 1), y: clamp(0, this.y + mod.y, s - 1)}
            };
            return ret;
        }
    });
    var emptyTile = (x, y) => tile(' ', 'lightgreen', x, y);
    var wallTile = (x,y) => tile(' ', 'steelblue',x,y);
    var alpha = ['x', 'a', 'o', 'c', 'e', 'u', 'z', 'n', 'w', 'v', '#', '@', '€', '^', '-', '+', '='];

    var objs = '';

    var generateLand= () => {
        var tempMap = new Array(s).fill('').map(o=>({}));
        for(var i = 0; i < s*wallFactor; i++){
            var x = rand(s - 1);
            var y = rand(s - 1);
            tempMap[x][y] = true;
        }

        for(x in tempMap){
            for(y in tempMap[x]) {
                for(var i = 0; i < 5; i++){
                    xmod = randNeg(rand(1));
                    ymod = randNeg(rand(1));
                    tempMap[+clamp(0, +x + xmod, s - 1)][+clamp(0, +y + ymod, s - 1)] = true;
                }
            }
        }

        /*var bfs = (x, y) => {
            var S = [];
            var Q = [[x,y]];
            while(Q.length > 0){
                var curr = Q.pop();
                for()
            }

        }*/

        for(x in tempMap){
            for(y in tempMap[x]){
                if(y){
                    objs[x][y] = wallTile(x,y);
                }
            }
        }
    }
    var initEngine = ()=> {
        $scope.ready = false;
        objs = new Array(s).fill('').map(o => ({}));
        if(!noWalls) {
            generateLand();
        }

        for (var i = 0; i < maxCritterCount; i++) {
            var a = pickRandom(alpha);
            var x = rand(s - 1);
            var y = rand(s - 1);

            var ch = (a,b) => objs[clamp(0,a,s-1)][clamp(0,b,s-1)];
            while(ch(x-1,y) || ch(x+1,y) || ch(x,y-1) || ch(x,y+1)){
                x = rand(s - 1);
                y = rand(s - 1);
            }
            objs[x][y] = critter(a, rand(0,360), x, y, pickRandom([90,180,270]));
        }

        $scope.field = new Array(s).fill('').map(
            (o, x) => new Array(s).fill('').map(
                (o, y) => {
                    return (objs[x][y]) ? objs[x][y] : emptyTile(x, y)
                }
            )
        );
        $scope.ready = true;
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

    $timeout(() => {
        initEngine();
        engineLoop();
    }, 50);



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