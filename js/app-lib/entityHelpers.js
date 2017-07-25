LIB.createCritter = ($scope, x, y, character, color, parameters)=> [x,y,character,color,$.extend(true, parameters, {
    sequences: LIB.entitySequences,
    animations: LIB.animations,
    brain: {
        rawMemory: {
            data: [],
            contains: function(o){
                return !!this.data[o.id];
            },
            add: function(o){
                data[o.id] = {obj: o};
            }
        },
        absorbSurroundings: function(surr){
            surr.forEach(o=>this.rawMemory.add);
            //calc threat and modify each time on seeing block

            //add non-reachable locations to mem
        },
        closestFood: function(surr){
            //return closest food in memory
        },
        threat:function(surr){
            //if any nearby remembered threat, run!
        },
        calculateDesire: {
            //personality goes here
            //parameters?
        }
    },
    senseSurroundings: function () {
        return LIB.getNeighbors(this, $scope.objs, this.perception);
    },
    calcFearScore: function (c) {
        //todo: realistic-er
        return Math.abs(this.col.hue - c.col.hue);
    },
    isThreat: function (c) {
        if (c.move) {
            const par = this.calcFearScore(c) + LIB.rand(this.fearLevel);
            return par > 175 && LIB.euclideanDistance(this, c) < this.perception;
        }
        return false;
    },
    findClosestFood: function (surr) {
        return surr.filter(o=>o.type === "food").sort((a, b)=>LIB.euclideanDistance(this, a) - LIB.euclideanDistance(this, b))[0];
    },
    reactToSurroundings: function (grid) {
        const surr = this.senseSurroundings(this.x, this.y);
        const threat = this.brain.threat(surr);
        this.brain.absorbSurroundings(surr);
        if (this.brain.threat(surr)) {
            //oh no run away
            this.animations.startSequence("rotating");
            if (LIB.flipCoin()) {
                const par = {x: LIB.negNormal(this.x - threat.x), y: LIB.negNormal(this.y - threat.y)};
                if (LIB.flipCoin()) {
                    par.x = 0;
                } else {
                    par.y = 0;
                }
                this.sequences.startSequence("moveLine", par);
            } else {
                this.sequences.startSequence("moveZigzag", LIB.nsew(this, surr[0]));
            }
        } else {
            const f = this.brain.closestFood();
            //todo: explain what is happening here
            if(f) {
                const nextTo = LIB.euclideanDistance(this, f) === 1;
                if (this.hunger < this.maxHunger * 0.5 && (!this.eating || !nextTo)) {
                    this.foodTime(f, grid);
                } else if(this.hunger < this.maxHunger * 0.9 && this.eating && nextTo){
                    this.sequences.startSequence("moveStill");
                    this.animations.startSequence("shaking");
                    this.hunger += this.hungriness;
                    f.food -= this.hungriness;
                } else{
                    this.eating = false;
                }
            }
        }
    },
    foodTime: function(f, grid){
        this.eating = true;
        grid = $.extend(true, {}, grid);
        grid[f.x][f.y] = {x: f.x, y: f.y};
        const par = {grid: grid, from: this, to: {x: f.x, y: f.y}};
        this.sequences.startSequence("moveTo", par);
    },
    bored: function (grid) {
        this.sequences.startSequence("default");
        const r = LIB.rand(1 / CONF.seqChance);
        if (r < 1) {
            this.sequences.startSequence("moveBlock", LIB.flipCoin());
        } else if (r < 2) {
            this.sequences.startSequence("moveZigzag", LIB.pickRandom(["n", "w", "s", "e"]));
        } else if (r < 10) {
            const par = {
                grid: $.extend(true, {}, grid),
                from: this,
                to: {x: LIB.rand(CONF.x - 1), y: LIB.rand(CONF.y - 1)}
            };
            this.sequences.startSequence("moveTo", par);
        }
    },
    move: function (grid) {
        const mod = this.sequences.run(this);

        try {
            if (Math.abs(mod.x) + Math.abs(mod.y) > 1) {
                throw "Critter teleported!"
            }
            return {
                "from": this,
                "to": {x: LIB.clamp(0, this.x + mod.x, CONF.x - 1), y: LIB.clamp(0, this.y + mod.y, CONF.y - 1)}
            };
        } catch (e) {
            console.error("RUN BROKEN, EXCEPTION THROWN");
            console.error("mod", mod, "sequence", this.sequences.currSequence);
            throw e;
        }
    },
    die: function(){
        $scope.objs[this.x][this.y] = null;
    },
    be: function(grid){
        this.reactToSurroundings(grid);
        this.hunger -= this.hungriness/10;
        if (!this.sequences.inSequence()) {
            this.animations.startSequence("default");
            this.bored(grid);
        }
        if(this.hunger <= 0.25*this.maxHunger) {
            this.animations.startSequence("rotating");
            if (this.hunger <= 0) {
                this.die();
            }
        }
        this.style = this.animations.run(this);
        return this.move(grid);
    },
    status: function(){
        return ~~((this.hunger/this.maxHunger)*100);
    }
})];
//todo: review
LIB.sequenceWrapper = function() {
    return {
        currSequence: {
            state: false,
            sequence: '',
            phase: 0,
            maxPhase: -1
        },
        inSequence: function () {
            return this.currSequence.state;
        },
        startSequence: function (f, par) {
            if(!this.patterns[f]){
                throw "Sequence " + f + " does not exist!";
            }
            var p = this.patterns[f].maxPhase;
            if (p) {
                this.currSequence = {
                    state: true,
                    sequence: f,
                    phase: 0,
                    maxPhase: p,
                    parameters: par
                };
            } else {
                var path = this.patterns[f].f(0, par);
                if (path) {
                    this.currSequence = {
                        state: true,
                        sequence: f,
                        phase: 0,
                        maxPhase: path.length - 1,
                        path: path
                    };
                }
            }
        },
        endSequence: function () {
            this.currSequence = {
                state: false,
                sequence: '',
                phase: 0,
                maxPhase: -1
            }
        },
        incPhase: function () {
            this.currSequence.phase++;
        },
        isDone: function () {
            return this.currSequence.phase >= this.currSequence.maxPhase;
        },
        sequenceName: function () {
            return this.currSequence.sequence;
        },
        run: function (c) {
            var ret;
            try {
                if (!this.inSequence()) {
                    this.startSequence('default');
                    return this.run(c);
                }

                var ret = this.runSpec(c);

                this.incPhase();
                if (this.isDone()) {
                    this.endSequence();
                }

                return ret;

            } catch (e) {
                console.error('Sequence Broken!', this.sequenceName(), 'state', this.currSequence.state, 'this', c, 'modifier', ret, 'parameters', this.currSequence.parameters);
                if (this.currSequence.path) {
                    console.error('path', this.currSequence.path, 'phase', this.currSequence.phase, 'maxphase', this.currSequence.maxPhase, 'curr', this.currSequence.path[this.currSequence.phase])
                }
                throw e;
            }
        },
        patterns: {}
    }
};
LIB.animations = $.extend(true, LIB.sequenceWrapper(),{
    runSpec: function(c){
        var def = `opacity: ${c.opacity}; transform: rotate(${c.rotation-90}deg);`;
        return def + this.patterns[this.sequenceName()].f();
    },
    patterns: {
        default:{
            'f': () => {
                return '';
            }, maxPhase: Infinity,
        },
        shaking: {
            'f': () => {
                var animParam = `-webkit-animation-name: dying; -webkit-animation-duration: 0.3s;
                                -webkit-transform-origin:50% 50%; -webkit-animation-iteration-count: infinite;
                                -webkit-animation-timing-function: linear;`;
                return animParam;
            }, maxPhase: Infinity
        },
        rotating: {
            'f': () => {
                var color = 'color: RED';
                var animParam = `-webkit-animation-name: eating; -webkit-animation-duration: 0.3s;
                                -webkit-transform-origin:50% 50%; -webkit-animation-iteration-count: infinite;
                                -webkit-animation-timing-function: linear;`;
                return animParam;
            }, maxPhase: Infinity
        }
    }
});
LIB.entitySequences = $.extend(LIB.sequenceWrapper(), {
    runSpec: function(c){
        var ret;
        if (!this.currSequence.path) {
            ret = this.patterns[this.sequenceName()].f(this.currSequence.phase, this.currSequence.parameters);
        } else {
            var node = this.currSequence.path[this.currSequence.phase];
            ret = {x: node.x - c.x, y: node.y - c.y};
        }
        if (Math.abs(ret.x) + Math.abs(ret.y) > 1) {
            throw "Critter teleported!"
        }
        return ret;
    },
    patterns: {
        moveBlock: {
            'f': (p, par) => {
                var dirs = {
                    "0": {x: 1, y: 0},
                    "1": {x: 1, y: 0},
                    "2": {x: 0, y: 1},
                    "3": {x: 0, y: 1},
                    "4": {x: -1, y: 0},
                    "5": {x: -1, y: 0},
                    "6": {x: 0, y: -1},
                    "7": {x: 0, y: -1},
                }
                if (par) {
                    return dirs[p];
                }
                return {x: -dirs[p].x, y: -dirs[p].y};
            }, maxPhase: 7
        },
        moveLine: {
            'f': (p, par) => {
                return par;
            }, maxPhase: 5
        },
        default: {
            'f': (p, par) => {
                var xfac = 0;
                var yfac = 0;
                if (LIB.randOutOf(1,5)) {
                    if (LIB.flipCoin()) {
                        xfac = LIB.randNeg(LIB.rand(1));
                    } else {
                        yfac = LIB.randNeg(LIB.rand(1));
                    }
                }
                return {x: xfac, y: yfac};
            }, maxPhase: 1
        },
        moveStill: {'f': (p, par)=> {
            return {x: 0, y: 0};
        }, maxPhase: 75},
        moveZigzag: {
            'f': (p, par)=> {
                var dirs = [
                    {x: -1, y: 0},
                    {x: 0, y: 1},
                    {x: 1, y: 0},
                    {x: 0, y: -1}
                ];
                var winds = {'w': 0, 'n': 1, 'e': 2, 's': 3};
                var d = winds[par];
                if (p % 4 == 1 || p % 4 == 2) {
                    return dirs[d];
                }
                else {
                    return (p % 4 == 0) ? dirs[LIB.trueMod(d - 1, 4)] : dirs[(d + 1) % 4]
                }
            }, maxPhase: 8
        },
        moveTo: {
            'f': (p, par)=> {
                // A* woo
                var open = LIB.heap((a, b) => a.f < b.f);
                var closed = LIB.coordinateHashmap();


                var from = {x: par.from.x, y: par.from.y, f: 0, g: 0, h: 0};
                var to = par.to;
                open.push(from);

                var f = (to) => to.g + to.h;
                var h = (from) => LIB.octileDistance(from, to);


                while (open.size() > 0) {
                    //pop item with smallest f off the queue
                    var q = open.pop();

                    //Return path if q = dest
                    if (LIB.coordinatesInArray(q, [to]) >= 0) {
                        var list = [];
                        while (q.p) {
                            list.push(q);
                            q = q.p;
                        }
                        list = list.reverse();
                        return (list.length > 0) ? list : false;
                    }

                    //add q to closed
                    closed.push(q);

                    //generate q's successors
                    var successors = LIB.getNeighbors(q, par.grid);
                    //console.log(successors);
                    //loop over successors
                    successors.forEach((succ)=> { //SUCC
                        if (!closed.contains(succ)) {
                            var isVis = succ.visited;
                            var gScore = q.g + 1;
                            if (!succ.visited || gScore < succ.g) {
                                succ.visited = true;
                                succ.p = q;
                                succ.h = succ.h || h(succ);
                                succ.g = gScore;
                                succ.f = f(succ);

                                if (!isVis) {
                                    open.push(succ);
                                } else {
                                    open.rescore(succ);
                                }
                            }
                        }


                    })

                }
                return false;
            }
        }
    }
});