var KEYS_DOWN = {};
$(document).keydown(function (e) {
    if(e.which == 32) {
        e.preventDefault();
    }
    KEYS_DOWN[e.which] = true;
});
$(document).keyup(function (e) {
    KEYS_DOWN[e.which] = false;
});
$(document).mousedown(function (e) {
    console.log('wat');
    KEYS_DOWN['mouse'] = true;
});
$(document).mouseup(function (e) {
    KEYS_DOWN['mouse'] = false;
});

angular.module('life', []).controller('testCtrl', function ($scope, $timeout) {
    var tile = (c, cl, x, y, par) => {
        var color = {};
        if (typeof cl == "string") {
            color.toString = () => cl;
        }
        else {
            color = {
                hue: cl, sat: 80, br: 50, toString: function () {
                    return 'hsl(' + this.hue + ',' + this.sat + '%,' + this.br + '%);'
                }
            }
        }
        var t = $.extend({char: c, col: color, x: x, y: y, opacity:0.5}, par);
        t.printParam = function(){
            var p = {};
            for(key in par){
                if(typeof t[key] != "function") {
                    p[key] = t[key];
                }
            }
            return $.extend({x: t.x, y: t.y}, p);
        }
        return t;
    };
    var createCritter = function (x, y) {
        var a = LIB.pickRandom(alpha);
        var maxHunger = LIB.rand(100,200);
        var parameters = {
            fearLevel: LIB.rand(50),
            perception: LIB.rand(4,6),
            maxHunger: maxHunger,
            hunger: maxHunger +1-1, //lazy new value
            hungriness: LIB.rand(1,10),
            eating: false,
            rotation: 0,
            opacity: 0.6,
            type: 'critter'
        }
        return critter(a, LIB.rand(360), x, y, parameters);// LIB.rand(2, 8));
    }
    var critter = (c, cl, x, y, parameters)=> $.extend(true, tile(c, cl, x, y, parameters), {
        sequences: LIB.entitySequences,

        senseSurroundings: function () {
            return LIB.getNeighbors(this, $scope.objs, this.perception);
        },
        calcFearScore: function (c) {
            return Math.abs(this.col.hue - c.col.hue);
        },
        isThreat: function (c) {
            if (c.move) {
                var par = this.calcFearScore(c) + LIB.rand(this.fearLevel);
                return par > 120 && LIB.euclideanDistance(this, c) < this.perception;
            }
            return false;
        },
        findClosestFood: function (surr) {
            return surr.filter(o=>o.type == "food").sort((a, b)=>LIB.euclideanDistance(this, a) - LIB.euclideanDistance(this, b))[0];
        },
        reactToSurroundings: function (grid) {
            var surr = this.senseSurroundings(this.x, this.y);

            if (surr.filter(o=>o.type=="critter").sort((a, b) => this.calcFearScore(a) - this.calcFearScore(b)).length > 0) {
                if (this.isThreat(surr[0])) {
                    //oh no run away
                    if (LIB.flipCoin()) {
                        var negNormal = (o) => (o > 0) ? 1 : -1;
                        var par = {x: negNormal(surr[0].x - this.x), y: negNormal(surr[0].y - this.y)};
                        if (LIB.flipCoin()) {
                            par.x = 0;
                        } else {
                            par.y = 0;
                        }
                        this.sequences.startSequence('moveLine', par);
                    } else {
                        this.sequences.startSequence('moveZigzag', LIB.nsew(this, surr[0]));
                    }
                } else {
                    var f = this.findClosestFood(surr);
                    if(f) {
                        if (this.hunger < this.maxHunger * 0.75 && !this.eating) {
                            this.foodTime(f, grid);
                        } else if(this.hunger < this.maxHunger * 0.9 && this.eating){
                            this.sequences.startSequence('moveStill');
                            this.hunger += this.hungriness;
                            f.food -= this.hungriness;
                            if(f.food < 0){
                                f.die();
                            }
                        } else{
                            this.eating = false;
                        }
                    }
                }
            }
        },
        foodTime: function(f, grid){
            if(LIB.euclideanDistance(this, f) == 1){this.eating = true;}
            else{
                var grid = $.extend(true, {}, grid);
                grid[f.x][f.y] = {x: f.x, y: f.y};
                var par = {grid: grid, from: this, to: {x: f.x, y: f.y}};
                this.sequences.startSequence('moveTo', par)
            }
        },
        bored: function (grid) {
            this.sequences.startSequence('moveRandom');
            var r = LIB.rand(1 / CONF.seqChance);
            if (r < 1) {
                this.sequences.startSequence('moveBlock', LIB.flipCoin());
            } else if (r < 2) {
                this.sequences.startSequence('moveZigzag', LIB.pickRandom(['n', 'w', 's', 'e']));
            } else if (r < 10) {
                var par = {
                    grid: $.extend(true, {}, grid),
                    from: this,
                    to: {x: LIB.rand(CONF.s - 1), y: LIB.rand(CONF.s - 1)}
                };
                this.sequences.startSequence('moveTo', par);
            }
        },
        move: function (grid) {
            var mod = this.sequences.run(this);

            try {
                if (Math.abs(mod.x) + Math.abs(mod.y) > 1) {
                    throw "Critter teleported!"
                }
                return {
                    'from': this,
                    'to': {x: LIB.clamp(0, this.x + mod.x, CONF.s - 1), y: LIB.clamp(0, this.y + mod.y, CONF.s - 1)}
                };
            } catch (e) {
                console.error('RUN BROKEN, EXCEPTION THROWN');
                console.error('mod', mod, 'sequence', this.sequences.currSequence);
                throw e;
            }
        },
        be: function(grid){
            this.reactToSurroundings(grid);
            this.hunger -= this.hungriness/10;
            if(this.hunger <= 0){
                this.die();
            }
            if (!this.sequences.inSequence()) {
                this.bored(grid);
            }

            return this.move(grid);
        },
        die: function(){
            $scope.objs[this.x][this.y] = null;
        },
        status: function(){
            return ~~((this.hunger/this.maxHunger)*100);
        }
    });

    var emptyTile = (x, y) => tile(' ', 'lightgreen', x, y);
    var foodTile = (x, y) => tile(LIB.pickRandom(['🍏','🍊','🍌','🍉','🍇','🍓','🌽','🍖']), '#fffbd3', x, y, {type:'food', paintable: true, food: 1000, die: function(){$scope.objs[this.x][this.y] = null;}, status: function(){return ~~(this.food/10)}});
    var wallTile = (x, y) => tile((LIB.randOutOf(1,10))?' ':LIB.pickRandom(['🌾','🌱']), 'steelblue', x, y, {type:'wall', paintable: true});
    var alpha = ['😎', '🙈', '🙊', '🐶', '🐺', '🐱', '🐴', '🐷', '🐹', '🐰', '🐼', '🐻'];
    //['x', 'a', 'o', 'c', 'e', 'u', 'z', 'n', 'w', 'v', '#', '@', '€', '^', '-', '+', '='];

    $scope.objs = '';
    $scope.help = [
        {'key':'W', 'f':'Brush: Wall'},
        {'key':'F', 'f':'Brush: Food'},
        {'key':'A', 'f':'Brush: Animal'},
        {'key':'C', 'f':'Clear'},
        {'key':'N', 'f':'Generate Land'},
        {'key':'SPACE', 'f':'Draw'},
    ]
    tileQueue = [];
    var clearMap = ()=> {
        $scope.objs.forEach((o, x) => {
            if (o) {
                for (y in o) {
                    if (o[y] && !o[y].be) {
                        $scope.objs[x][y] = null;
                    }
                }
            }
        })
    };
    var generateLand = () => {

        var tempMap = new Array(CONF.s).fill('').map(o=>({}));
        for (var i = 0; i < CONF.s * CONF.wallFactor; i++) {
            var x = LIB.rand(CONF.s - 1);
            var y = LIB.rand(CONF.s - 1);
            tempMap[x][y] = true;
        }

        for (x in tempMap) {
            for (y in tempMap[x]) {
                for (var i = 0; i < LIB.rand(3, 9); i++) {
                    xmod = LIB.randNeg(LIB.rand(1));
                    ymod = LIB.randNeg(LIB.rand(1));
                    tempMap[+LIB.clamp(0, +x + xmod, CONF.s - 1)][+LIB.clamp(0, +y + ymod, CONF.s - 1)] = true;
                }
            }
        }

        for (x in tempMap) {
            for (y in tempMap[x]) {
                if (y) {
                    if (!$scope.objs[x][y]) {
                        $scope.objs[x][y] = wallTile(x, y);
                    }
                }
            }
        }
    };
    var generateCritters = () => {
        for (var i = 0; i < CONF.maxCritterCount; i++) {

            var x = LIB.rand(CONF.s - 1);
            var y = LIB.rand(CONF.s - 1);

            var ch = (a, b) => $scope.objs[LIB.clamp(0, a, CONF.s - 1)][LIB.clamp(0, b, CONF.s - 1)];
            while (ch(x - 1, y) || ch(x + 1, y) || ch(x, y - 1) || ch(x, y + 1)) {
                x = LIB.rand(CONF.s - 1);
                y = LIB.rand(CONF.s - 1);
            }
            $scope.objs[x][y] = createCritter(x, y);
        }
    }
    var initEngine = ()=> {
        $scope.ready = false;
        $scope.objs = new Array(CONF.s).fill('').map(o => ({}));

        generateLand();
        generateCritters();

        /*
         Angular DOM rendering is kinda slow and dunno how to delay it
         Circumventing by doing loading slower
         */
        $scope.field = new Array(CONF.s).fill('').map(o=>([]));
        function doTimeout(x, i) {
            $timeout(function () {
                for (var y = 0; y < $scope.field.length; y++) {
                    $scope.field[x][y] = ($scope.objs[x][y]) ? $scope.objs[x][y] : emptyTile(x, y);
                }
            }, i * CONF.rowCalcTime);
        }

        var order = new Array(CONF.s).fill('').map((o, i)=>i);
        var l = order.length;
        var ordBeg = order.slice(0, ~~(l / 2)).reverse();
        var ordEnd = order.slice(~~(l / 2));
        var ch = [];
        for(var i = 0; i < Math.max(ordBeg.length, ordEnd.length); i++){
            if(ordBeg[i] !== undefined){doTimeout(ordBeg[i], i); ch.push(ordBeg[i]);}
            if(ordEnd[i] !== undefined){doTimeout(ordEnd[i], i+0.5); ch.push(ordEnd[i]);}
        }
        if(JSON.stringify(ch.sort((a,b)=>a-b)) != JSON.stringify(order)){
            console.error(order, ordBeg, ordEnd, ch);
            throw "SOMETHAN AINT RITE";
        }

    }
    var render = () => {

        $scope.field.forEach((xo, x)=>xo.forEach((yo, y)=> {
            if ($scope.objs[x][y]) {
                if (yo !== $scope.objs[x][y]) {
                    $scope.field[x][y] = ($scope.objs[x][y]);
                }
            } else {
                $scope.field[x][y] = emptyTile(x, y);
            }
        }))
    }
    var doMoves = () => {
        var moves = [];
        var grid = new Array(CONF.s).fill('').map((o, x) =>
            new Array(CONF.s).fill('').map((o, y) =>
                ($scope.objs[x][y]) ? null : {x: x, y: y, f: 0, g: 0, h: 0, visited: false}
            )
        );
        $scope.objs.forEach(y => {
            for (key in y) {
                o = y[key];
                if (o) {
                    if (o.be) {
                        moves.push(o.be(grid));
                    }
                }
            }
            ;
        });
        moves.forEach(o => {
            if (!LIB.eqCoords(o.to, o.from) && !$scope.objs[o.to.x][o.to.y]) {
                $scope.objs[o.to.x][o.to.y] = o.from;
                o.from.rotation = {n: '0', e: '90', s: '180', w: '270'}[LIB.nsew(o.from, o.to)];
                $scope.objs[o.from.x][o.from.y] = null;
                o.from.x = o.to.x;
                o.from.y = o.to.y;
            } else {
                o.from.sequences.endSequence();
            }
        });
    }
    var handleKeys = () => {
        if (KEYS_DOWN[70]) {
            $scope.paintTool.setBrush(foodTile);
        }
        if (KEYS_DOWN[87]) {
            $scope.paintTool.setBrush(wallTile);
        }
        if (KEYS_DOWN[65]){
            $scope.paintTool.setBrush(createCritter);
        }
        if (KEYS_DOWN[67]) {
            clearMap();
        }
        if (KEYS_DOWN[78]) {
            generateLand();
        }

    }
    var addPaintedTiles=()=>{
        tileQueue.forEach(o => {
            console.log(o);
            $scope.objs[o.x][o.y] = o.t;
        });
        tileQueue = [];
    }

    var engineLoop = () => {
        addPaintedTiles();
        handleKeys();
        doMoves();
        render();
        $timeout(engineLoop, 1000 / CONF.FPS);
    };


    initEngine();
    $timeout(() => {
        $scope.ready = true;
        engineLoop();
    }, CONF.rowCalcTime * CONF.s);


    $scope.paintTool = {
        rem: null,
        previewBrush: null,
        setPaintRem: function (r) {
            if (!this.isSetPaintRem()) {
                this.rem = r;
            }
        },
        clearPaintRem: function (r) {
            if (this.isSetPaintRem()) {
                this.rem = null;
            }
        },
        isSetPaintRem: function (){
            return this.rem != null;
        },
        currBrush: wallTile,
        setBrush: function (f) {
            this.previewBrush = f(0,0);
            this.currBrush = f;
        },
        brush: function (x, y) {
            return this.currBrush(x, y)
        },
        paint: function(o){
            var ob = $scope.objs[o.x][o.y];
            if (this.rem && ob && ob.paintable) {
                  tileQueue.push({x:o.x, y:o.y, t: null});
            } else if (!this.rem && !ob) {
                tileQueue.push({x:o.x, y:o.y, t: this.brush(o.x,o.y)});
            }
        }
    };
    $scope.click = function (o) {
        $scope.paintTool.paint(o);
    }

    $scope.mouseover = function (o) {
        //I'd do this with clicks, unfortunately rendering large tables and mousedrags don't go together so well :(
        if (KEYS_DOWN[32]) {
            $scope.paintTool.setPaintRem(!!o.paintable);
            $scope.paintTool.paint(o);
        } else if($scope.paintTool.isSetPaintRem()) {
            $scope.paintTool.clearPaintRem();
        }
        $scope.currentTile = o;
    }
})

