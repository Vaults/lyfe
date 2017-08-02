// tile creation
LIB.tileWrapper = (scope) => {
    return function (x, y, character, clr, parameters) {
        parameters.id = scope.id++;
        let color = {};
        if (typeof clr === "string") {
            color.toString = () => clr;
        }
        else {
            color = {
                hue: clr, sat: 80, br: 50, toString: function () {
                    return "hsl(" + this.hue + "," + this.sat + "%," + this.br + "%);";
                }
            };
        }
        const tile = $.extend({char: character, col: color, x: x, y: y, opacity: 0.5}, parameters);
        tile.printParam = () => {
            const p = {};
            Object.keys(parameters).forEach((key) => {
                if (typeof tile[key] !== "function") {
                    p[key] = tile[key];
                }
            });
            return $.extend({x: tile.x, y: tile.y}, p);
        };
        return tile;
    }
};
LIB.treeTile = (x, y, parameters) => [x, y, LIB.pickRandom(["🌳", "🌲", "🌴"]), null, $.extend(parameters, {
    col: {
        hue: 100, sat: 100, br: 80,
        toString: function () {
            return "hsl(" + this.hue + "," + this.sat + "%," + this.br + "%);"
        }
    },
    moveCreateAvg: CONF.treeChance,
    beCreate: function () {
        if (LIB.randOutOf(1, this.moveCreateAvg)) {
            const xm = LIB.clamp(0, this.x + LIB.rand(-1, 1), CONF.x - 1);
            const ym = LIB.clamp(0, this.y + LIB.rand(-1, 1), CONF.y - 1);
            return LIB.foodTile(xm, ym);
        }
    },
    type: "tree",
    contStyle: "border: 1px solid green"
})];
LIB.emptyTile = (x, y, isSpecial) => [x, y, " ", "lightgreen", {contStyle: (isSpecial > 0.9) ? "background-image: url('img/grass.png');" : ""}];
LIB.foodTile = (x, y) => [x, y, LIB.pickRandom(["🍏", "🍊", "🍌", "🍉", "🍇", "🍓", "🌽", "🍖"]), "#fffbd3", {
    type: "food",
    paintable: true,
    food: 1000,
    die: function () {
        this.dead = true;
    },
    status: function () {
        return ~~(this.food / 10)
    },
    think: function () {
        this.food -= 0.2;
        if (this.food < 0) {
            this.die();
        }
    },
    contStyle: "border: 1px solid burlywood"
}];
LIB.wallTile = (x, y) => [x, y, LIB.randOutOf(1, 10) ? LIB.pickRandom(["🌾", "🌱"]) : " ", "steelblue", {
    type: "wall",
    paintable: true,
    contStyle: "border: 1px solid #4070a0"
}];

// map generation
LIB.generateLand = (scope) => {
    const tempMap = new Array(CONF.x).fill("").map(o => ({}));
    const tileWrapper = LIB.tileWrapper(scope);
    LIB.repeat(() => {
        const x = LIB.rand(CONF.x - 1);
        const y = LIB.rand(CONF.y - 1);
        tempMap[x][y] = true;
    }, CONF.x * CONF.wallFactor);

    tempMap.keyList().forEach(x => {
        tempMap[x].keyList().forEach(y => {
            for (let i = 0; i < LIB.rand(3, 9); i++) {
                const xmod = LIB.randNeg(LIB.rand(1));
                const ymod = LIB.randNeg(LIB.rand(1));
                tempMap[+LIB.clamp(0, +x + xmod, CONF.x - 1)][+LIB.clamp(0, +y + ymod, CONF.y - 1)] = true;
            }
        });
    });

    tempMap.keyList().forEach(x => {
        tempMap[x].keyList().forEach(y => {
            if (!scope.objs[x][y]) {
                scope.objs[x][y] = tileWrapper(...LIB.wallTile(x, y));
            }
        });
    });

    LIB.repeat(() => {
        const x = LIB.rand(0, CONF.x - 1);
        const y = LIB.rand(0, CONF.y - 1);
        scope.objs[x][y] = tileWrapper(...LIB.treeTile(x, y, {moveCreateAvg: CONF.treeChance}));
    }, CONF.treesPerSquareM * CONF.x * CONF.y);
};
LIB.clearMap = (scope) => {
    scope.objs.forEach((o, x) => {
        if (o) {
            o.keyList().forEach(y => {
                if (o[y] && !o[y].be) {
                    scope.objs[x][y] = null;
                }
            });
        }
    })
};