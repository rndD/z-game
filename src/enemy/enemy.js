function Enemy() {
}
Enemy.prototype = Object.create( LiveObject.prototype );
Enemy.prototype.constructor = Enemy;
Enemy.superclass = LiveObject.prototype;


Enemy.prototype.meleeCooldown = 1000;
Enemy.prototype.canAttack = true;
Enemy.prototype.targetPosition = { x: null, y: null };
Enemy.prototype.pathToTarget = [];

Enemy.prototype.maxTickCounter = 10;


Enemy.prototype.init = function(world, x, y, texture, isStatic, isAnimated) {
    this.tickCounter = this.maxTickCounter;
    Enemy.superclass.init.call(this, world, x, y, texture, isStatic, isAnimated);

    this.targetChangeTilePosition(game.player.tilePosition);
};


Enemy.prototype.attackLiveObjectWithMeleeWeapon = function(attackedObject){
    if (this.canAttack){
        // найти угол между зомби и плеером
        var radian = attackedObject.getRadianBetweenMeAnd(this);

        var speed = 0.3;
        var vel = {
            x: Math.cos(radian) * speed,
            y: Math.sin(radian) * speed
        };

        // создать на плеера импульс в эту сторону
        attackedObject.body.ApplyImpulse(
            new Box2D.Common.Math.b2Vec2(vel.x, vel.y),
            attackedObject.body.GetWorldCenter()
        );

        attackedObject.takeDamage(this.damage);

        var self = this;
        delay(function() {
            self.canAttack = true;
        }, this.meleeCooldown);

        this.canAttack = false;
    }
};


Enemy.prototype.tick = function() {
    var enemyPosition = this.getPosition('tile', game.map);

    (this.pathToTarget && !this.nearTargetStep) && this.getNearTargetStep();
    // хак для того что бы чувак не имеющий пути не выкидывал эксепшен
    if (!this.pathToTarget && !this.canGoToPlayer) {
        this.canGoToPlayer = true;
    }

    if (!this.canGoToPlayer) {
        if (enemyPosition.x == this.nearTargetStep.x && enemyPosition.y == this.nearTargetStep.y) {
            this.getNearTargetStep();
        }
    }

    if (this.canGoToPlayer) {
        this.goToPosition(game.player.getPosition('pixi'));
    } else {
        this.goToPosition();
    }


    this.tickCounter >= this.maxTickCounter && this.calcPlayerVisibility();
    this.tickCounter = this.tickCounter >= this.maxTickCounter ? 0 : this.tickCounter + 1;

};

Enemy.prototype.isVisibleToPlayer = function() {
    var enemyVect = this.getPosition('vector'),
        playerVect = game.player.getPosition('vector'),
        isVisible = false;


    //function filterCollisions(fixture, normal, fraction) {
    //    if( 1 ) {
    //        // you've got the fraction of the original length of the raycast!
    //        // you can use this to determine the distance
    //        // between the character and the ground
    //        return fraction;
    //    }
    //    else {
    //        // continue looking
    //        return 1;
    //    }
    //}
    var fixtures = game.box2DWorld.RayCastAll(enemyVect, playerVect);

    for (var i = 0; i < fixtures.length; i++) {
        var cls = fixtures[i].m_body.GetUserData();
        if (cls.isInstanceOf(Wall)) {
            return false;
        }
    }
    return true;
};

Enemy.prototype.calcPlayerVisibility = function() {
    this.view.visible = this.isVisibleToPlayer();
};


Enemy.prototype.targetChangeTilePosition = function(targetPosition) {
    var enemyPosition = this.getPosition('tile', game.map);
    if (targetPosition.x !== this.targetPosition.x || targetPosition.y !== this.targetPosition.y) {
        if (targetPosition.x == enemyPosition.x && targetPosition.y == enemyPosition.y) {
            this.canGoToPlayer = true;
        } else {
            this.targetPosition = targetPosition;

            this.findPath(enemyPosition, targetPosition);
        }
    }
};


Enemy.prototype.findPath = function(enemyPosition, targetPosition) {
    try {
        var end = new GraphNode(enemyPosition.x, enemyPosition.y);

        var result = PathFinder.search(end);
    } catch(e) {
        result = [];
    }

    this.pathToTarget = result.length > 0 ? result.slice(0, -1) : null;
    this.nearTargetStep = null;
    this.canGoToPlayer = false;
};


Enemy.prototype.getNearTargetStep = function() {
    this.nearTargetStep = this.pathToTarget.shift();
    if (!this.nearTargetStep) {
        this.canGoToPlayer = true;
    }
    return this.nearTargetStep;
};


Enemy.prototype.goToPosition = function(position) {
    var myPosition = this.getPosition('box2D');
    position = position || game.map.getCoordinatesByTileInCenter(this.nearTargetStep);
    position.x = position.x / Game.box2DMultiplier;
    position.y = position.y / Game.box2DMultiplier;

    var radian = Math.atan2(position.y - myPosition.y, position.x - myPosition.x);
    var velocity = this.body.GetLinearVelocity();

    var newVelocity = new Box2D.Common.Math.b2Vec2(
        Math.cos(radian) * this.acceleration,
        Math.sin(radian) * this.acceleration
    );

    if ((Math.abs(newVelocity.x + velocity.x) > this.maxSpeed) && signum(newVelocity.x) == signum(velocity.x))
        newVelocity.x = 0;

    if ((Math.abs(newVelocity.y + velocity.y) > this.maxSpeed) && signum(newVelocity.y) == signum(velocity.y))
        newVelocity.y = 0;

    this.body.ApplyImpulse(
        newVelocity,
        this.body.GetWorldCenter()
    );

    // Rotate in right angle
    radian = Math.atan2(velocity.y, velocity.x);
    var newRotation = radian - (90 * (Math.PI / 180));
    this.body.SetAngle(newRotation);
};


