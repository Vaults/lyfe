var KEYS_DOWN = {};
$(document).keydown(function (e) {
    KEYS_DOWN[e.which] = true;
});
$(document).keyup(function (e) {
    KEYS_DOWN[e.which] = false;
});
$(document).mousedown(function (e) {
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
                hue: cl, sat: 80, br: 30, toString: function () {
                    return 'hsl(' + this.hue + ',' + this.sat + '%,' + this.br + '%);'
                }
            }
        }
        return $.extend({char: c, col: color, x: x, y: y}, par);
    };
    var createCritter = function (x, y) {
        var a = LIB.pickRandom(alpha);
        return critter(a, LIB.rand(360), x, y, 0, LIB.rand(50), LIB.rand(2,6));// LIB.rand(2, 8));
    }
    var critter = (c, cl, x, y, rot, fearLevel, perception)=> $.extend(true, tile(c, cl, x, y), {
        rotation: rot,
        sequences: LIB.entitySequences,
        senseSurroundings: function () {
            return LIB.getNeighbors(this, $scope.objs, perception);
        },
        calcFearScore: function (c) {
            return Math.abs(this.col.hue - c.col.hue);
        },
        isThreat: function (c) {
            if (c.move) {
                var par = this.calcFearScore(c) + LIB.rand(fearLevel);
                return par > 120 && LIB.euclideanDistance(this, c) < perception;
            }
            return false;
        },
        findClosestFood: function (surr) {
            return surr.filter(o=>o.isFood).sort((a, b)=>LIB.euclideanDistance(this, a) - LIB.euclideanDistance(this, b))[0];
        },

        move: function (grid) {
            var surr = this.senseSurroundings(this.x, this.y).filter(o=>!o.isWall);
            surr = surr.sort((a, b) => this.calcFearScore(a) - this.calcFearScore(b));
            if (surr.length > 0) {
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
                }else{
                    var f = this.findClosestFood(surr);
                    if (f && LIB.getNeighbors(f, $scope.objs).length < 2 && LIB.manhattanDistance(this,f) > 1 && this.sequences.sequenceName() != "moveTo") {
                        var grid = $.extend(true, {}, grid);
                        grid[f.x][f.y] = {x: f.x, y: f.y};
                        var par = {grid: grid, from: this, to: {x: f.x, y: f.y}};
                        this.sequences.startSequence('moveTo', par);
                    }
                }
            }

            //bored
            if (!this.sequences.inSequence()) {
                this.sequences.startSequence('moveRandom');
                var r = LIB.rand(1 / CONF.seqChance);
                if (r < 1) {
                    this.sequences.startSequence('moveBlock', LIB.rand(10) > 5);
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
            }


            var mod = this.sequences.run(this);


            try {
                if (Math.abs(mod.x) + Math.abs(mod.y) > 1) {
                    throw "Critter teleported!"
                }
                var ret = {
                    'from': this,
                    'to': {x: LIB.clamp(0, this.x + mod.x, CONF.s - 1), y: LIB.clamp(0, this.y + mod.y, CONF.s - 1)}
                };
            } catch (e) {
                console.error('RUN BROKEN, EXCEPTION THROWN');
                console.error('mod', mod, 'sequence', this.sequences.currSequence);
                throw e;
            }
            return ret;
        }
    });
    var emptyTile = (x, y) => tile(' ', 'lightgreen', x, y);
    var foodTile = (x, y) => tile(' ', '#fffbd3', x, y, {isFood: true, paintable: true});
    var wallTile = (x, y) => tile(' ', 'steelblue', x, y, {isWall: true, paintable: true});
    var alpha = ['x', 'a', 'o', 'c', 'e', 'u', 'z', 'n', 'w', 'v', '#', '@', '€', '^', '-', '+', '='];

    $scope.objs = '';
    var clearMap = ()=>{
        $scope.objs.forEach((o,x) => {
            if(o) {
                for (y in o) {
                    if (o[y] && !o[y].move) {
                        $scope.objs[x][y] = null;
                    }
                }
            }
        })
    }
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
                    if(!$scope.objs[x][y]){$scope.objs[x][y] = wallTile(x, y);}
                }
            }
        }
    }
    var initEngine = ()=> {
        $scope.ready = false;
        $scope.objs = new Array(CONF.s).fill('').map(o => ({}));
        if (!CONF.noWalls) {
            generateLand();
        }
        if (!CONF.DEBUG) {
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
        } else {
            var x = LIB.rand(0, CONF.s - 1);
            var y = LIB.rand(0, CONF.s - 1);
            var c = createCritter(x, y);
            $scope.objs[x][y] = c;
            var grid = new Array(CONF.s).fill('').map((o, x) =>
                new Array(CONF.s).fill('').map((o, y) =>
                    ($scope.objs[x][y]) ? null : {x: x, y: y, f: 0, g: 0, h: 0, visited: false}
                )
            );
            c.sequences.startSequence('moveTo', {
                from: c,
                to: {x: LIB.rand(CONF.s - 1), y: LIB.rand(CONF.s - 1)},
                grid: grid
            });
        }
        $scope.field = new Array(CONF.s).fill('').map(
            (o, x) => new Array(CONF.s).fill('').map(
                (o, y) => {
                    return ($scope.objs[x][y]) ? $scope.objs[x][y] : emptyTile(x, y)
                }
            )
        );
        $scope.ready = true;
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
                    if (o.move) {
                        moves.push(o.move(grid));
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
        if (KEYS_DOWN[67]){
            clearMap();
        }
        if (KEYS_DOWN[78]){
            generateLand();
        }

    }


    var engineLoop = () => {
        handleKeys();
        doMoves();
        render();
        $timeout(engineLoop, 1000 / CONF.FPS);
    }

    $timeout(() => {
        initEngine();
        engineLoop();
    }, 50);

    $scope.paintTool = {
        rem: null,
        setPaintRem: function (r) {
            if (this.rem == null) {
                this.rem = r;
            }
        },
        clearPaintRem: function (r) {
            if (this.rem != null) {
                this.rem = null;
            }
        },
        currBrush: wallTile,
        setBrush: function (f) {
            this.currBrush = f;
        },
        brush: function (x, y) {
            return this.currBrush(x, y)
        }
    };
    $scope.click = function (o) {
        var ob = $scope.objs[o.x][o.y];
        if (ob) {
            if (!ob.move) {
                $scope.objs[o.x][o.y] = null;
            }
        } else {
            $scope.objs[o.x][o.y] = $scope.paintTool.brush(o.x, o.y);
        }
    }
    $scope.paint = function (o) {
        var ob = $scope.objs[o.x][o.y];
        if ($scope.paintTool.rem && ob && ob.paintable) {
            $scope.objs[o.x][o.y] = null;
        } else if (!$scope.paintTool.rem && !ob) {
            $scope.objs[o.x][o.y] = $scope.paintTool.brush(o.x, o.y);
        }
    }
    $scope.mouseover = function (o) {
        if (KEYS_DOWN['mouse']) {
            $scope.paintTool.setPaintRem(!!o.paintable);
            $scope.paint(o);
        } else {
            $scope.paintTool.clearPaintRem();
        }
        $scope.currentTile = o;
    }
})

