var KEYS_DOWN = {};
$(document).keydown((e) => {
    if(e.which === 32) {
        e.preventDefault();
    }
    KEYS_DOWN[e.which] = true;
});
$(document).keyup((e) => {
    KEYS_DOWN[e.which] = false;
});
$(document).mousedown(() => {
    KEYS_DOWN.mouse = true;
});
$(document).mouseup(() => {
    KEYS_DOWN.mouse = false;
});

//todo: inject all injectables
//todo: tidy up tileWrapper
angular.module("life", []).controller("testCtrl", function ($scope, $timeout, $interval) {

    const createCritter = function (x, y) {
        const a = LIB.pickRandom(LIB.constants.alpha);
        const maxHunger = LIB.rand(1000,2000);
        const parameters = {
            fearLevel: LIB.rand(50),
            perception: LIB.rand(4,6),
            maxHunger: maxHunger,
            hunger: maxHunger +1-1, //lazy new value
            hungriness: LIB.rand(1,10),
            eating: false,
            rotation: 0,
            opacity: 0.6,
            type: "critter"
        };
        //todo: remove hard scope coupling
        let critter = LIB.createCritter($scope, x, y, a, LIB.rand(360),  parameters);
        return critter;
    };
    $scope.objs = "";
    $scope.help = [
        {"key":"W", "f":"Brush: Wall"},
        {"key":"F", "f":"Brush: Food"},
        {"key":"A", "f":"Brush: Animal"},
        {"key":"T", "f":"Brush: Tree"},
        {"key":"C", "f":"Clear"},
        {"key":"N", "f":"Generate Land"},
        {"key":"SPACE", "f":"Draw"},
    ];
    $scope.id = 0;
    $scope.tileWrapper = LIB.tileWrapper($scope);
    const tileQueue = [];
    const generateCritters = (scope) => {
        for (let i = 0; i < CONF.crittersPerSquareM*CONF.x*CONF.y; i++) {

            let x = LIB.rand(CONF.x - 1);
            let y = LIB.rand(CONF.y - 1);

            const checkIfExists = (a, b) => scope.objs[LIB.clamp(0, a, CONF.x - 1)][LIB.clamp(0, b, CONF.y - 1)];
            while (checkIfExists(x - 1, y) || checkIfExists(x + 1, y) || checkIfExists(x, y - 1) || checkIfExists(x, y + 1)) {
                x = LIB.rand(CONF.x - 1);
                y = LIB.rand(CONF.y - 1);
            }
            scope.objs[x][y] = $scope.tileWrapper(...createCritter(x, y));
        }
    }
    const initEngine = ()=> {
        $scope.ready = false;
        $scope.objs = new Array(CONF.x).fill("").map(o => ({}));
        Math.seedrandom(CONF.seed);
        $scope.coordinateSeeds = new Array(CONF.x).fill("").map(o=>[]);
        $scope.emptyTiles = new Array(CONF.x).fill("").map(o=>[]);
        LIB.generateLand($scope);
        generateCritters($scope);

        /*
         Angular DOM rendering is kinda slow and dunno how to delay it
         Circumventing by doing loading slower
         */
        $scope.field = new Array(CONF.x).fill("").map(o=>([]));
        //Fills field for the first time.
        function doTimeout(x, i) {
            $timeout(function () {
                for (let y = 0; y < CONF.y; y++) {
                    $scope.emptyTiles[x][y] = $scope.tileWrapper(...LIB.emptyTile(x,y,Math.random()));
                    $scope.field[x][y] = ($scope.objs[x][y]) ? $scope.objs[x][y] : $scope.emptyTiles[x][y];
                }
            }, i * CONF.rowCalcTime);
        }
        for(let i = 0; i < CONF.x; i++){
            doTimeout(i,i);
        }
        Math.seedrandom(new Date().toString());
    };
    // Optimization for getting the objects into $scope.field. Refreshing the whole thing is super slow.
    //todo: remove hard scope coupling
    const render = () => {
        $scope.field.forEach((xo, x)=>xo.forEach((yo, y)=> {
            if ($scope.objs[x][y]) {
                if (yo !== $scope.objs[x][y]) {
                    $scope.field[x][y] = ($scope.objs[x][y]);
                }
            } else {
                $scope.field[x][y] = $scope.emptyTiles[x][y];
            }
        }))
    }
    //todo: remove hard scope coupling
    const doMoves = () => {
        const moves = [];
        const creates = [];
        const grid = new Array(CONF.x).fill("").map((o, x) => new Array(CONF.y).fill("").map((o, y) => ($scope.objs[x][y]) ? null : {x: x, y: y, f: 0, g: 0, h: 0, visited: false}));

        $scope.objs.iterateKeys(x => {
            $scope.objs[x].iterateKeys(y => {
                const o = $scope.objs[x][y];
                if(o) {
                    if (o.be) {
                        const move = o.be(grid);
                        if (move) {
                            moves.push(move);
                        }
                    }
                    if (o.beCreate) {
                        const create = o.beCreate();
                        if (create) {
                            creates.push($scope.tileWrapper(...create));
                        }
                    }
                    if (o.think) {
                        o.think();
                    }
                }
            });
        });
        moves.forEach(o => {
            if (!LIB.eqCoords(o.to, o.from) && !$scope.objs[o.to.x][o.to.y]) {
                $scope.objs[o.to.x][o.to.y] = o.from;
                o.from.rotation = {n: "0", e: "90", s: "180", w: "270"}[LIB.nsew(o.from, o.to)];
                $scope.objs[o.from.x][o.from.y] = null;
                o.from.x = o.to.x;
                o.from.y = o.to.y;
            } else {
                o.from.sequences.endSequence();
            }
        });
        //in the object map, set coordinates of created object to the object
        creates.forEach(o => {
            if(o && $scope.objs[o.x] && !$scope.objs[o.x][o.y]){
                $scope.objs[o.x][o.y] = o;
            }
        })
    };
    //todo: find out neater way to handle this if-list
    const handleKeys = () => {
        if (KEYS_DOWN[70]) {
            $scope.paintTool.setBrush(LIB.foodTile);
        }
        if (KEYS_DOWN[87]) {
            $scope.paintTool.setBrush(LIB.wallTile);
        }
        if (KEYS_DOWN[65]){
            $scope.paintTool.setBrush(createCritter);
        }
        if (KEYS_DOWN[84]){
            $scope.paintTool.setBrush(LIB.treeTile);
        }
        if (KEYS_DOWN[67]) {
            LIB.clearMap($scope);
        }
        if (KEYS_DOWN[78]) {
            LIB.generateLand($scope);
        }
    };
    const addPaintedTiles= () => {
        tileQueue.forEach(o => {
            $scope.objs[o.x][o.y] = o.t;
        });
        tileQueue.length = 0;
    };
    const engineLoop = () => {

        addPaintedTiles();
        handleKeys();
        doMoves();
        render();

        $scope.amounts = {};
        $scope.objs.forEach(x =>
            x.iterateKeys(y => {
                if(x[y] !== null) {
                    if (!$scope.amounts[x[y].type]) {
                        $scope.amounts[x[y].type] = 0;
                    }
                    $scope.amounts[x[y].type]++;
                }
            }));
        LIB.sortObjectByKeys($scope.amounts);
        $scope.framecount++;
        $scope.elapsedTime += (new Date().getTime() - $scope.calcTime) / 1000;
        $scope.elapsedTime = +$scope.elapsedTime.toFixed(2);
        $scope.calcTime = new Date().getTime();
        if($scope.framecount % 10 === 0) {
            $scope.FPS = (1000*$scope.framecount/(new Date().getTime() - $scope.beginTime)).toFixed(2);
        }
    };

    initEngine();
    $scope.calcTime = new Date().getTime();
    $scope.elapsedTime = 0;
    $scope.framecount = 0;
    $scope.FPS = CONF.FPS;
    $timeout(() => {
        $scope.ready = true;
        $scope.beginTime = new Date().getTime();
        $interval(engineLoop, 1000/CONF.FPS);
    }, CONF.rowCalcTime * CONF.x);

    $scope.paintTool = {
        rem: null,
        previewBrush: null,
        setPaintRem: function (r) {
            if (!this.isSetPaintRem()) {
                this.rem = r;
            }
        },
        clearPaintRem: function () {
            if (this.isSetPaintRem()) {
                this.rem = null;
            }
        },
        isSetPaintRem: function (){
            return this.rem !== null;
        },
        currBrush: LIB.wallTile,
        setBrush: function (f) {
            this.previewBrush = $scope.tileWrapper(...f(0,0));
            this.currBrush = f;
        },
        brush: function (x, y) {
            return this.currBrush(x, y)
        },
        paint: function(o){
            const ob = $scope.objs[o.x][o.y];
            if (this.rem && ob && ob.paintable) {
                  tileQueue.push({x:o.x, y:o.y, t: null});
            } else if (!this.rem && !ob) {
                const newTile = $scope.tileWrapper(...this.brush(o.x,o.y));
                tileQueue.push({x:o.x, y:o.y, t: newTile});
            }
        }
    };
    $scope.click = function (o) {
        if(!$scope.clicked){
            $scope.clicked = true;
            $scope.currentTile = o;
        }else{
            $scope.clicked = false;
        }
        $scope.paintTool.paint(o);
    }
    $scope.mouseover = function (o) {
        //I'd do this with clicks, unfortunately rendering large tables and mousedrags don"t go together so well :(
        if (KEYS_DOWN[32]) {
            $scope.paintTool.setPaintRem(!!o.paintable);
            $scope.paintTool.paint(o);
        } else if($scope.paintTool.isSetPaintRem()) {
            $scope.paintTool.clearPaintRem();
        }
        if(!$scope.clicked) {
            $scope.currentTile = o;
        }
    }
});

