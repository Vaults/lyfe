class CritterMemory extends BaseClass {
    constructor() {
        super();
        this.data = {};
    }

    getDataElements() {
        return this.data.values();
    }

    getFoodElements() {
        return this.getDataElements().filter(o => o.obj.isClass("FoodTile"));
    }

    forget() {
        this.data.keyList().forEach(key => {
            this.data[key].ticks--;
            if (this.data[key].ticks <= 0) {
                delete this.data[key];
            }
        })
    }

    contains(o) {
        return !!this.data[o.id];
    }

    addIfNotExists(o) {
        if (!this.contains(o)) {
            this.data[o.id] = {
                obj: o,
                ticks: CONF.memTime
            };
        }
    }

    update(o) {
        this.data[o.id].ticks = CONF.memTime;
    }

    get (o) {
        return this.data[o.id];
    }
}

class CritterBrain extends BaseClass {
    constructor(critter) {
        super();
        this.critter = critter;
        this.memory = new CritterMemory();
    }

    findClosestFood() {
        const foods = this.memory.getFoodElements().filter(o => !o.unreachable);
        return LIB.getClosest(foods.map(o => o.obj), this.critter);
    }

    absorbSurroundings(surr) {
        //Add surroundings and threats
        surr.forEach(o => {
            this.memory.addIfNotExists(o);
            this.memory.update(o);
            //calc threat and modify each time on seeing block
            //todo: use actual threat
            this.memory.get(o).threat = 0;//this.isThreat(o);
        });
        //todo: Check for non-reachable tiles
    }

    threat(surr) {
        //if any nearby remembered threat, run!
        return false;
    }

    bored(grid) {
        this.critter.sequences.startSequence("default");
        const r = LIB.rand(1 / CONF.seqChance);
        if (r < 1) {
            this.critter.sequences.startSequence("moveBlock", LIB.flipCoin());
        } else if (r < 2) {
            this.critter.sequences.startSequence("moveZigzag", LIB.pickRandom(["n", "w", "s", "e"]));
        }
    }

    senseSurroundings(grid) {
        return LIB.getNeighborsAsList(this.critter, grid, this.critter.state.perception);
    }

    reactToSurroundings(grid) {
        const surr = this.senseSurroundings(grid);
        const threat = this.threat(surr);
        const critter = this.critter;
        this.absorbSurroundings(surr);
        if (this.threat(surr)) {
            //oh no run away
            this.animations.startSequence("rotating");
            if (LIB.flipCoin()) {
                const par = {x: LIB.negNormal(this.x - threat.x), y: LIB.negNormal(this.y - threat.y)};
                if (LIB.flipCoin()) {
                    par.x = 0;
                } else {
                    par.y = 0;
                }
                critter.sequences.startSequence("moveLine", par);
            } else {
                critter.sequences.startSequence("moveZigzag", LIB.nsew(this, surr[0]));
            }
        } else {
            const closestFood = this.findClosestFood();
            if (closestFood) {
                const nextTo = LIB.euclideanDistance(critter, closestFood) === 1;
                const hunger = critter.state.hunger;
                if (nextTo) {
                    if (hunger.isHungry() && !hunger.eating) {
                        hunger.eating = true;
                        critter.sequences.startSequence("moveStill");
                        critter.animations.startSequence("shaking");
                    } else if (hunger.eating) {
                        if (!hunger.isSatiated()) {
                            hunger.satiety += hunger.fillFactor * hunger.hungriness;
                            closestFood.food -= hunger.hungriness;
                        } else {
                            console.log("DOI")
                            hunger.eating = false;
                            critter.animations.endSequence();
                            critter.sequences.endSequence();
                        }
                    }
                } else if (hunger.isHungry() && critter.sequences.sequenceName() !== "moveTo") {
                    try {
                        this.foodTime(closestFood, grid);
                    } catch (e) {
                        this.memory.get(closestFood).unreachable = true;
                        //maybe some other time
                    }
                }
            }
        }
    }

    foodTime(closestFood, grid) {
        const par = {grid: grid, from: this.critter, to: closestFood};
        this.critter.sequences.startSequence("moveTo", par);
    }

    think(grid) {
        this.reactToSurroundings(grid);
        this.memory.forget();
        if (!this.critter.sequences.inSequence()) {
            this.critter.animations.startSequence("default");
            this.bored();
        }
        if (this.critter.state.hunger.isStarving()) {
            this.critter.animations.startSequence("rotating");
        }
    }
}

class CritterStomach extends BaseClass {
    constructor(critter) {
        super();
        this.satiety = 100;
        this.capacity = LIB.rand(1000, 2000);
        this.hungriness = LIB.rand(1, 10);
        this.satietyRate = 0.80;
        this.hungryRate = 0.4;
        this.starvationThreshold = 0.15;
        this.fillFactor = LIB.rand(1, 3) * 10;
        this.eating = false;
    }

    metabolize() {
        this.satiety -= this.hungriness;
    };

    hungerPercentage() {
        return ~~(this.satiety * 100 / this.capacity);
    };

    isHungry() {
        return this.satiety <= this.hungryRate * this.capacity;
    };

    isSatiated() {
        return this.satiety > this.satietyRate * this.capacity;
    };

    isStarving() {
        return this.satiety < this.starvationThreshold * this.capacity;
    };

}

class CritterTile extends LivingTile {
    constructor(id, x, y) {
        super(id, x, y, LIB.pickRandom(LIB.constants.alpha), new HSB(LIB.rand(360), 80, 50));
        this.sequences = new CritterSequence();
        this.animations = new AnimationSequence();
        this.brain = new CritterBrain(this);
        this.state = CONF.critter();
        this.state.hunger = new CritterStomach(this);
    }

    move() {
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
            console.error("mod", mod, "sequence", this.sequences.state);
            throw e;
        }
    }

    be(grid) {
        this.state.hunger.metabolize();
        this.brain.think(grid);
        this.style = this.animations.run(this);
        return this.move();
    }

    status() {
        return this.state.hunger.hungerPercentage();
    }

    printParam() {
        const values = this.brain.memory.getDataElements();
        return {
            x: this.x,
            y: this.y,
            char: this.character,
            col: this.color,
            mem: values.length,
            hunger: this.state.hunger,
            sequence: this.sequences.state
        };
    }

}


