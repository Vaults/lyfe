//Initialize game state, we do this outside of the angular scope to main it merely as a rendering agent.
const MainGame = {
    grid : {},
    calcTime : new Date().getTime(),
    elapsedTime : 0,
    framecount : 0,
    FPS : CONF.FPS,
    ready : false,
    id : 0,
    keyList : {}
};
MainGame.tileWrapper = LIB.tileWrapper(MainGame);


$(document).keydown((e) => {
    if (e.which === 32) {
        e.preventDefault();
    }
    MainGame.keyList[e.which] = true;
});
$(document).keyup((e) => {
    MainGame.keyList[e.which] = false;
});
$(document).mousedown(() => {
    MainGame.keyList.mouse = true;
});
$(document).mouseup(() => {
    MainGame.keyList.mouse = false;
});

const doMoves = (Game) => {
    const moves = [];
    const creates = [];
    const aStarGrid = new Array(CONF.x).fill("").map((o, x) => new Array(CONF.y).fill("").map((o, y) => (Game.grid[x][y]) ? null : {
        x: x,
        y: y,
        f: 0,
        g: 0,
        h: 0,
        visited: false
    }));

    Game.grid.keyList().forEach(x => {
        Game.grid[x].keyList().forEach(y => {
            const o = Game.grid[x][y];
            if (o) {
                if (o.dead) {
                    Game.grid[x][y] = null;
                } else {
                    if (o.be) {
                        const move = o.be(aStarGrid);
                        if (move) {
                            moves.push(move);
                        }
                    }
                    if (o.beCreate) {
                        const create = o.beCreate();
                        if (create) {
                            creates.push(Game.tileWrapper(...create));
                        }
                    }
                    if (o.think) {
                        o.think();
                    }
                }
            }
        });
    });
    moves.forEach(o => {
        if (!LIB.eqCoords(o.to, o.from) && !Game.grid[o.to.x][o.to.y]) {
            Game.grid[o.to.x][o.to.y] = o.from;
            o.from.rotation = {n: "0", e: "90", s: "180", w: "270"}[LIB.nsew(o.from, o.to)];
            Game.grid[o.from.x][o.from.y] = null;
            o.from.x = o.to.x;
            o.from.y = o.to.y;
        } else {
            o.from.sequences.endSequence();
        }
    });
    //in the object map, set coordinates of created object to the object
    creates.forEach(o => {
        if (o && Game.grid[o.x] && !Game.grid[o.x][o.y]) {
            Game.grid[o.x][o.y] = o;
        }
    })
};
const engineLoop = (Game, Renderer) => {
    LIB.handleKeys(Game.keyList);
    doMoves(Game);

    Game.amounts = {};
    Game.grid.forEach(x =>
        x.keyList().forEach(y => {
            if (x[y] !== null) {
                if (!Game.amounts[x[y].type]) {
                    Game.amounts[x[y].type] = 0;
                }
                Game.amounts[x[y].type]++;
            }
        }));
    LIB.sortObjectByKeys(Game.amounts);
    Game.framecount++;
    Game.elapsedTime += (new Date().getTime() - Game.calcTime) / 1000;
    Game.elapsedTime = +Game.elapsedTime.toFixed(2);
    Game.calcTime = new Date().getTime();
    if (Game.framecount % 10 === 0) {
        Game.FPS = (1000 * Game.framecount / (new Date().getTime() - Game.beginTime)).toFixed(2);
    }

    Renderer.render(Game);
};
const initEngine = (Game, Renderer) => {
    Game.ready = false;
    Game.grid = new Array(CONF.x).fill("").map(o => ({}));
    Math.seedrandom(CONF.seed);
    Game.coordinateSeeds = new Array(CONF.x).fill("").map(o => []);
    Game.emptyTiles = new Array(CONF.x).fill("").map(o => []);
    LIB.generateLand(Game);
    LIB.generateCritters(Game);
    Renderer.init(Game);
    Game.ready = true;
    Game.beginTime = new Date().getTime();
    setInterval(() => engineLoop(Game, Renderer), 1000 / CONF.FPS);
};


angular.module("life", []).controller("testCtrl", function ($scope, $timeout) {

    //Bind to scope
    $scope.help = CONF.help;


    //Could be configured to be another renderer if necessary
    const AngularRenderer = {
        init: (Game) => {
            $scope.click = (o) => { $scope.currentTile = o; };
            /*
             Angular DOM rendering is kinda slow and dunno how to delay it
             Circumventing by doing loading slower
             */
            $scope.field = new Array(CONF.x).fill("").map(o => ([]));
            $scope.emptyTiles = new Array(CONF.x).fill("").map(o => ([]));
            //Fills field for the first time.
            function doTimeout(x, i) {
                $timeout(function () {
                    for (let y = 0; y < CONF.y; y++) {
                        $scope.emptyTiles[x][y] = Game.tileWrapper(...LIB.emptyTile(x, y, Math.random()));
                        $scope.field[x][y] = (Game.grid[x][y]) ? Game.grid[x][y] : $scope.emptyTiles[x][y];
                    }
                }, i * CONF.rowCalcTime);
            }

            LIB.repeat((i) => doTimeout(i, i/2), CONF.x);
            $timeout(()=>{$scope.ready=true;}, CONF.x * CONF.rowCalcTime / 2);
        },
        render: (Game) => {
            $scope.field.forEach((xo, x) => xo.forEach((yo, y) => {
                if (Game.grid[x][y]) {
                    if (yo !== Game.grid[x][y]) {
                        $scope.field[x][y] = (Game.grid[x][y]);
                    }
                } else {
                    $scope.field[x][y] = $scope.emptyTiles[x][y];
                }
            }));
            $scope.elapsedTime = Game.elapsedTime;
            $scope.FPS = Game.FPS;
            $scope.amounts = Game.amounts;

            $scope.$apply();
        }
    };
    initEngine(MainGame, AngularRenderer);




});

