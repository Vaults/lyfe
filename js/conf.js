const DEFAULT_CONF = {
    x: 40, /* THANKS ANGULAR */
    y: 40, /* FOR BEING SO SLOW */
    rowCalcTime: 75,
    crittersPerSquareM: 0.0069,
    moveChance: 10,
    FPS: 100,
    treesPerSquareM: 0.01,
    wallFactor: 0.6,
    seqChance: 0.00069,
    treeChance: 2000,
    seed: 1337,
    food: 1000,
    help: [{"key": "N", "desc": "Generate Land"},
        {"key": "SPACE", "desc": "Draw"}],
    critter: () => ({
        fearLevel: LIB.rand(50),
        perception: LIB.rand(4, 6),
        eating: false,
        rotation: 0,
        opacity: 0.6,
        memTime: 2000000,
    })
};

//Overridden with test variables.
const CONF = $.extend(true, DEFAULT_CONF, {
    FPS: 24,
    treeChance: 1
});