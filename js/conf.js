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
    help: [{"key": "N", "desc": "Generate Land"},
        {"key": "SPACE", "desc": "Draw"}]
};

//Overridden with test variables.
var CONF = $.extend(true, DEFAULT_CONF, {
});