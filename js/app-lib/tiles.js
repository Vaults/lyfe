// tile creation
class FoodTile extends Tile{
    constructor(id, x, y){
        super(id, x, y, LIB.pickRandom(["🍏", "🍊", "🍌", "🍉", "🍇", "🍓", "🌽", "🍖"]), "#fffbd3");
        this.food = CONF.food;
    }
    status(){
        return ~~(this.food / 10)
    }

}
class WallTile extends Tile{
    constructor(id, x, y){
        super(id, x, y, LIB.randOutOf(1, 10) ? LIB.pickRandom(["🌾", "🌱"]) : " ", "steelblue")
    }
}
class TreeTile extends CreatingTile{
    constructor(id, x, y){
        super(id, x, y,  LIB.pickRandom(["🌳", "🌲", "🌴"]), new HSB(100,50,50));
    }
    create(tileFactory){
        if (LIB.randOutOf(1, CONF.treeChance)) {
            const xm = LIB.clamp(0, this.x + LIB.rand(-1, 1), CONF.x - 1);
            const ym = LIB.clamp(0, this.y + LIB.rand(-1, 1), CONF.y - 1);
            return tileFactory.foodTile(xm,ym);
        }
        return null;
    }
}
class TileFactory {
    constructor(Game){
        this.Game = Game;
    }
    create(tileClass, x, y){
        return new tileClass(this.Game.id++, x, y);
    }
    wallTile(x, y){
        return this.create(WallTile,x,y);
    }
    foodTile(x, y){
        return this.create(FoodTile,x,y);
    }
    treeTile(x, y){
        return this.create(TreeTile,x,y);
    }
    critterTile(x,y){
        return this.create(CritterTile,x,y);
    }
    emptyTile(x,y){
        return this.create(Tile,x,y);
    }

};


// map generation
LIB.generateLand = (Game) => {
    const tempMap = new Array(CONF.x).fill("").map(o => ({}));;
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
            if (!Game.grid[x][y]) {
                Game.grid[x][y] = Game.tileFactory.wallTile(x, y);
            }
        });
    });

    LIB.repeat(() => {
        const x = LIB.rand(0, CONF.x - 1);
        const y = LIB.rand(0, CONF.y - 1);
        Game.grid[x][y] = Game.tileFactory.treeTile(x, y);
    }, CONF.treesPerSquareM * CONF.x * CONF.y);
};
LIB.clearMap = (grid) => {
    grid.forEach((o, x) => {
        if (o) {
            o.keyList().forEach(y => {
                if (o[y] && !o[y].be) {
                    grid[x][y] = null;
                }
            });
        }
    })
};
LIB.generateCritters = (Game) => {
    LIB.repeat(() => {

        let x = LIB.rand(CONF.x - 1);
        let y = LIB.rand(CONF.y - 1);

        const checkIfExists = (a, b) => Game.grid[LIB.clamp(0, a, CONF.x - 1)][LIB.clamp(0, b, CONF.y - 1)];
        while (checkIfExists(x - 1, y) || checkIfExists(x + 1, y) || checkIfExists(x, y - 1) || checkIfExists(x, y + 1)) {
            x = LIB.rand(CONF.x - 1);
            y = LIB.rand(CONF.y - 1);
        }
        Game.grid[x][y] = Game.tileFactory.critterTile(x,y);
    }, CONF.crittersPerSquareM * CONF.x * CONF.y);
};