angular.module('life', []).controller('testCtrl', function ($scope, $timeout) {
    var tile = (c, cl, x, y) => {
        var color = {};
        if(typeof cl == "string"){color.toString = () => cl;}
        else{ color = {hue: cl, sat: 80, br: 30, toString : function(){return 'hsl('+this.hue+','+this.sat+'%,'+this.br+'%);'}}}
        return {char: c, col: color, x:x, y:y};
    };
    var createCritter = function(x, y){
        var a = LIB.pickRandom(alpha);
        return critter(a, LIB.rand(0,360), x, y, 0);
    }
    var critter = (c, cl, x, y, rot)=> $.extend(true, tile(c, cl, x, y), {
        rotation: rot,
        sequences: LIB.entitySequences,
        senseSurroundings: function() {
             return LIB.getNeighbors(this, objs).filter(o=>o.move);
        },
        isThreat: function(c) {
            return Math.abs(this.col.hue - c.col.hue) + LIB.rand(30) > 150;
        },
        move: function (grid) {
            var mod = {x: 0, y: 0};
            var surr = this.senseSurroundings(this.x, this.y);

            if(surr.length > 0){
                //oh no run away
                if(this.isThreat(surr[0])) {
                    if(LIB.rand(10) > 5) {
                        var negNormal = (o) => (o>0)?1:-1;
                        this.sequences.startSequence('moveLine', {x: negNormal(surr[0].x), y: negNormal(surr[0].x)});
                    }else{
                        this.sequences.startSequence('moveZigzag', LIB.nsew(this, {x: surr[0].x, y: surr[0].y}));
                    }
                }
            }
            if(!this.sequences.inSequence()){
                this.sequences.startSequence('moveRandom'); var r = LIB.rand(1/CONF.seqChance);
                if(r < 1){
                    this.sequences.startSequence('moveBlock', LIB.rand(10) > 5);
                }else if(r < 2) {
                    this.sequences.startSequence('moveZigzag', LIB.pickRandom(['n','w','s','e']));
                }else if(r < 10) {
                    var par = {grid: $.extend(true, {}, grid), from: this, to:{x:LIB.rand(0,CONF.s-1),y:LIB.rand(0,CONF.s-1)}, 'objs':objs};
                    this.sequences.startSequence('moveTo', par);
                }
            }


            mod = this.sequences.run(this);


            try {
                if(Math.abs(mod.x) > 1 || Math.abs(mod.y) > 1){throw "Critter teleported!"}
                var ret = {
                    'from': this,
                    'to': {x: LIB.clamp(0, this.x + mod.x, CONF.s - 1), y: LIB.clamp(0, this.y + mod.y, CONF.s - 1)}
                };
            }catch(e){
                console.error('RUN BROKEN, EXCEPTION THROWN');
                console.error('mod', mod);
                throw e;
            }
            return ret;
        }
    });
    var emptyTile = (x, y) => tile(' ', 'lightgreen', x, y);
    var wallTile = (x,y) => tile(' ', 'steelblue',x,y);
    var alpha = ['x', 'a', 'o', 'c', 'e', 'u', 'z', 'n', 'w', 'v', '#', '@', '€', '^', '-', '+', '='];

    var objs = '';
    var grid;

    var generateLand= () => {
        
        var tempMap = new Array(CONF.s).fill('').map(o=>({}));
        for(var i = 0; i < CONF.s*CONF.wallFactor; i++){
            var x = LIB.rand(CONF.s - 1);
            var y = LIB.rand(CONF.s - 1);
            tempMap[x][y] = true;
        }

        for(x in tempMap){
            for(y in tempMap[x]) {
                for(var i = 0; i < 5; i++){
                    xmod = LIB.randNeg(LIB.rand(1));
                    ymod = LIB.randNeg(LIB.rand(1));
                    tempMap[+LIB.clamp(0, +x + xmod, CONF.s - 1)][+LIB.clamp(0, +y + ymod, CONF.s - 1)] = true;
                }
            }
        }

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
        objs = new Array(CONF.s).fill('').map(o => ({}));
        if(!CONF.noWalls) {
            generateLand();
        }
        if(!CONF.DEBUG){
            for (var i = 0; i < CONF.maxCritterCount; i++) {

                var x = LIB.rand(CONF.s - 1);
                var y = LIB.rand(CONF.s - 1);

                var ch = (a,b) => objs[LIB.clamp(0,a,CONF.s-1)][LIB.clamp(0,b,CONF.s-1)];
                while(ch(x-1,y) || ch(x+1,y) || ch(x,y-1) || ch(x,y+1)){
                    x = LIB.rand(CONF.s - 1);
                    y = LIB.rand(CONF.s - 1);
                }
                objs[x][y] = createCritter(x, y);
            }
        }else{
            var x = LIB.rand(0,CONF.s-1);
            var y = LIB.rand(0,CONF.s-1);
            var c = createCritter(x,y);
            objs[x][y] = c;
            var grid = new Array(CONF.s).fill('').map((o,x) =>
                new Array(CONF.s).fill('').map((o,y) =>
                    (objs[x][y])?null:{x: x, y: y, f:0, g:0, h:0, visited: false}
                )
            );
            c.sequences.startSequence('moveTo', {from: c, to:{x:LIB.rand(0,CONF.s-1),y:LIB.rand(0,CONF.s-1)}, 'objs':objs, grid: grid});
        }
        $scope.field = new Array(CONF.s).fill('').map(
            (o, x) => new Array(CONF.s).fill('').map(
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
        var grid = new Array(CONF.s).fill('').map((o,x) =>
            new Array(CONF.s).fill('').map((o,y) =>
                (objs[x][y])?null:{x: x, y: y, f:0, g:0, h:0, visited: false}
            )
        );
        objs.forEach(y => {
            for (key in y) {
                o = y[key];
                if (o) {
                    if (o.move) {
                        moves.push(o.move(grid));
                    }
                }
            }
            ;
        });
        moves.forEach(o => {
            if (!LIB.eqCoords(o.to, o.from) && !objs[o.to.x][o.to.y]) {
                objs[o.to.x][o.to.y] = o.from;
                o.from.rotation = {n:'0', e:'90', s:'180', w:'270'}[LIB.nsew(o.from, o.to)];
                objs[o.from.x][o.from.y] = null;
                $scope.field[o.to.x][o.to.y] = o.from;
                $scope.field[o.from.x][o.from.y] = emptyTile(o.from.x, o.from.y);
                o.from.x = o.to.x;
                o.from.y = o.to.y;
            }else{
                o.from.sequences.endSequence();
            }
        });
    }

    var engineLoop = () => {
        doMoves();

        render();
        $timeout(engineLoop, 1000 / CONF.FPS);
    }

    $timeout(() => {
        initEngine();
        engineLoop();
    }, 50);

})

