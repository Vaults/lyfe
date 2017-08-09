//Initialize game state, we do this outside of the angular scope to main it merely as a rendering agent.
const MainGame = {
    grid: {},
    calcTime: new Date().getTime(),
    elapsedTime: 0,
    framecount: 0,
    FPS: CONF.FPS,
    ready: false,
    id: 0,
    keyList: {}
};
MainGame.tileFactory = new TileFactory(MainGame);


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

    Game.grid.keyList().forEach(x => {
        Game.grid[x].keyList().forEach(y => {
            const o = Game.grid[x][y];
            if (o) {
                if(o.status() > 0) {
                    if (o.living()) {
                        const move = o.be(Game.grid);
                        if (move) {
                            moves.push(move);
                        }
                    }
                    if (o.creating()) {
                        const create = o.create(Game.tileFactory);
                        if (create) {
                            creates.push(create);
                        }
                    }
                }else{
                    Game.grid[x][y] = null;
                }
            }
        });
    });
    moves.forEach(o => {
        if (!LIB.eqCoords(o.from, o.to) && !Game.grid[o.to.x][o.to.y]) {
            Game.grid[o.to.x][o.to.y] = o.from;
            o.from.state.rotation = {n: "0", e: "90", s: "180", w: "270"}[LIB.nsew(o.from, o.to)];
            Game.grid[o.from.x][o.from.y] = null;
            o.from.x = o.to.x;
            o.from.y = o.to.y;
        } else if(!LIB.eqCoords(o.from, o.to)) {
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
    LIB.handleKeys(Game);
    doMoves(Game);

    Game.amounts = {};
    Game.grid.forEach(x =>
        x.keyList().forEach(y => {
            if (x[y] !== null) {
                const type = x[y].getClass();
                if (!Game.amounts[type]) {
                    Game.amounts[type] = 0;
                }
                Game.amounts[type]++;
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
    const loop = () => {
        setTimeout(() => {
            try{
                engineLoop(Game, Renderer);
                loop();
            }catch(e){
                throw e;
            }
        }, 1000 / CONF.FPS);
    }
    loop();
};


angular.module("life", []).controller("lifeCtrl", function ($scope, $timeout) {

    //Bind to scope
    $scope.help = CONF.help;

    //Could be configured to be another renderer if necessary
    const AngularRenderer = {
        init: (Game) => {
            $scope.click = (o) => {
                $scope.currentTile = o;
                console.log(o);
            };
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
                        $scope.emptyTiles[x][y] = Game.tileFactory.emptyTile(x, y);
                        $scope.field[x][y] = (Game.grid[x][y]) ? Game.grid[x][y] : $scope.emptyTiles[x][y];
                    }
                }, i * CONF.rowCalcTime);
            }

            LIB.repeat((i) => doTimeout(i, i / 2), CONF.x);
            $timeout(() => {
                $scope.ready = true;
            }, CONF.x * CONF.rowCalcTime / 2);
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

