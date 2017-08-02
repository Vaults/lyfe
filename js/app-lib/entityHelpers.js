//todo: decouple scope
//todo: revise brain mechanism
LIB.createCritter = (scope, x, y, character, color, parameters) => [x, y, character, color, $.extend(true, parameters, {
    sequences: LIB.entitySequences,
    animations: LIB.animations,
    brain: {
        rawMemory: {
            data: {},
            contains: function (o) {
                return !!this.data[o.id];
            },
            addIfNotExists: function (o) {
                if (!this.contains(o)) {
                    this.data[o.id] = {
                        obj: o
                    };
                }
            },
            get: function (o) {
                return this.data[o.id];
            },
            findClosestFood: function (critter) {
                return this.data.values().filter(o => o.type === "food").sort((a, b) => LIB.euclideanDistance(critter, a) - LIB.euclideanDistance(critter, b))[0];
            }
        },
        absorbSurroundings: function (surr) {
            //Add surroundings and threats
            surr.forEach(o => {
                this.rawMemory.addIfNotExists(o);
                //calc threat and modify each time on seeing block
                //todo: use actual threat
                this.rawMemory.get(o).threat = 0;//this.isThreat(o);
            });
            //todo: Check for non-reachable tiles
        },
        threat: function (surr) {
            //if any nearby remembered threat, run!
        },
        calculateDesire: {
            //personality goes here
            //parameters?
        }
    },
    senseSurroundings: function () {
        return LIB.getNeighbors(this, scope.objs, this.perception);
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
    findClosestFood: function () {
        return this.brain.rawMemory.findClosestFood(this);
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
            const f = this.findClosestFood();
            //todo: explain what is happening here
            if (f) {
                const nextTo = LIB.euclideanDistance(this, f) === 1;
                if (this.hunger < this.maxHunger * 0.5 && (!this.eating || !nextTo)) {
                    this.foodTime(f, grid);
                } else if (this.hunger < this.maxHunger * 0.9 && this.eating && nextTo) {
                    this.sequences.startSequence("moveStill");
                    this.animations.startSequence("shaking");
                    this.hunger += this.hungriness;
                    f.food -= this.hungriness;
                } else {
                    this.eating = false;
                }
            }
        }
    },
    foodTime: function (f, grid) {
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
            console.error("mod", mod, "sequence", this.sequences.currSequenceState);
            throw e;
        }
    },
    die: function () {
        this.dead = true;
    },
    be: function (grid) {
        this.reactToSurroundings(grid);
        this.hunger -= this.hungriness / 10;
        if (!this.sequences.inSequence()) {
            this.animations.startSequence("default");
            this.bored(grid);
        }
        if (this.hunger <= 0.25 * this.maxHunger) {
            this.animations.startSequence("rotating");
            if (this.hunger <= 0) {
                this.die();
            }
        }
        this.style = this.animations.run(this);
        return this.move(grid);
    },
    status: function () {
        return ~~((this.hunger / this.maxHunger) * 100);
    }
})];
LIB.sequenceWrapper = function () {
    const initSequence = (seq) => Object.assign({
        running: false,
        sequence: '',
        phase: 0,
        maxPhase: -1
    }, seq);
    return {
        currSequenceState: initSequence(),
        inSequence: function () {
            return this.currSequenceState.running;
        },
        startSequence: function (sequenceName, par) {
            const sequence = this.patterns[sequenceName];
            if (!sequence) {
                throw "Sequence " + sequenceName + " does not exist!";
            }

            let maxPhase = sequence.maxPhase;
            const hasPath = sequence.path;

            if (hasPath) {
                const trail = sequence.execute(0, par);
                if (trail) {
                    this.currSequenceState = initSequence({
                        running: true,
                        sequence: sequenceName,
                        maxPhase: trail.length - 1,
                        path: trail
                    });
                }
            } else {
                if (!maxPhase) {
                    maxPhase = Infinity;
                }
                this.currSequenceState = initSequence({
                    running: true,
                    sequence: sequenceName,
                    maxPhase: maxPhase,
                    parameters: par
                });
            }
        },
        endSequence: function () {
            this.currSequenceState = initSequence();
        },
        incPhase: function () {
            this.currSequenceState.phase++;
        },
        isDone: function () {
            return this.currSequenceState.phase >= this.currSequenceState.maxPhase;
        },
        sequenceName: function () {
            return this.currSequenceState.sequence;
        },
        run: function (critter) {
            let ret;
            try {
                if (!this.inSequence()) {
                    this.startSequence('default');
                    return this.run(critter);
                }

                ret = this.runSpec(critter);

                this.incPhase();
                if (this.isDone()) {
                    this.endSequence();
                }

                return ret;

            } catch (e) {
                LIB.catchAndThrow(e)('Sequence Broken!', this.sequenceName(), 'state', this.currSequenceState.state, 'this', critter, 'modifier', ret, 'parameters', this.currSequenceState.parameters);
                if (this.currSequenceState.path) {
                    LIB.catchAndThrow(e)('path', this.currSequenceState.path, 'phase', this.currSequenceState.phase, 'maxphase', this.currSequenceState.maxPhase, 'curr', this.currSequenceState.path[this.currSequenceState.phase])
                }
            }
        },
    }
};
LIB.sequenceBuild = function (func, maxPhase, path) {
    return {
        execute: func,
        maxPhase,
        path,
    };
}
LIB.animations = $.extend(true, LIB.sequenceWrapper(), {
    runSpec: function (critter) {
        const def = `opacity: ${critter.opacity}; transform: rotate(${critter.rotation - 90}deg);`;
        const sequence = this.patterns[this.sequenceName()];
        return def + sequence.execute();
    },
    patterns: {
        default: LIB.sequenceBuild(() => ""),
        shaking: LIB.sequenceBuild(() => `-webkit-animation-name: dying; -webkit-animation-duration: 0.3s;
                    -webkit-transform-origin:50% 50%; -webkit-animation-iteration-count: infinite;
                    -webkit-animation-timing-function: linear;`),
        rotating: LIB.sequenceBuild(() => `-webkit-animation-name: eating; -webkit-animation-duration: 0.3s;
                    -webkit-transform-origin:50% 50%; -webkit-animation-iteration-count: infinite;
                    -webkit-animation-timing-function: linear;`)
    }
});
LIB.entitySequences = $.extend(LIB.sequenceWrapper(), {
    runSpec: function (critter) {
        let ret;
        if (!this.currSequenceState.path) {
            ret = this.patterns[this.sequenceName()].execute(this.currSequenceState.phase, this.currSequenceState.parameters);
        } else {
            const node = this.currSequenceState.path[this.currSequenceState.phase];
            ret = {x: node.x - critter.x, y: node.y - critter.y};
        }

        if (Math.abs(ret.x) + Math.abs(ret.y) > 1) {
            throw "Critter teleported!";
        }

        return ret;
    },
    patterns: {
        moveBlock: LIB.sequenceBuild((phase, par) => {
            const dirs = {
                "0": {x: 1, y: 0},
                "1": {x: 1, y: 0},
                "2": {x: 0, y: 1},
                "3": {x: 0, y: 1},
                "4": {x: -1, y: 0},
                "5": {x: -1, y: 0},
                "6": {x: 0, y: -1},
                "7": {x: 0, y: -1},
            };
            return (par) ? dirs[phase] : {x: -dirs[phase].x, y: -dirs[phase].y};
        }, 7),
        moveLine: LIB.sequenceBuild((_, par) => par, 5),
        default: LIB.sequenceBuild(() => {
            let xfac = 0;
            let yfac = 0;
            if (LIB.randOutOf(1, 5)) {
                if (LIB.flipCoin()) {
                    xfac = LIB.randNeg(LIB.rand(1));
                } else {
                    yfac = LIB.randNeg(LIB.rand(1));
                }
            }
            return {x: xfac, y: yfac};
        }, 1),
        moveStill: LIB.sequenceBuild(() => ({x: 0, y: 0}), 75),
        moveZigzag: LIB.sequenceBuild((phase, par) => {
            const dirs = [
                {x: -1, y: 0},
                {x: 0, y: 1},
                {x: 1, y: 0},
                {x: 0, y: -1}
            ];
            const winds = {'w': 0, 'n': 1, 'e': 2, 's': 3};
            const d = winds[par];
            if (phase % 4 === 1 || phase % 4 === 2) {
                return dirs[d];
            }
            else {
                return (phase % 4 === 0) ? dirs[LIB.trueMod(d - 1, 4)] : dirs[(d + 1) % 4]
            }
        }, 8),
        moveTo: LIB.sequenceBuild((_, par) => {
            // A* woo
            const open = LIB.heap((a, b) => a.f < b.f);
            const closed = LIB.coordinateHashmap();


            const from = {x: par.from.x, y: par.from.y, f: 0, g: 0, h: 0};
            const to = par.to;
            open.push(from);

            const f = (to) => to.g + to.h;
            const h = (from) => LIB.octileDistance(from, to);


            while (open.size() > 0) {
                //pop item with smallest f off the queue
                let q = open.pop();

                //Return path if q = dest
                if (LIB.coordinatesInArray(q, [to])) {
                    const list = [];
                    while (q.p) {
                        list.push(q);
                        q = q.p;
                    }
                    list.reverse();
                    return (list.length > 0) ? list : [];
                }

                //add q to closed
                closed.push(q);

                //generate q's successors
                const successors = LIB.getNeighbors(q, par.grid);
                //loop over successors
                successors.forEach((succ) => { //SUCC
                    if (!closed.contains(succ)) {
                        const isVis = succ.visited;
                        const gScore = q.g + 1;
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
        }, NaN, true)
    }
});