function Player() {
}
Player.prototype = Object.create( LiveObject.prototype );
Player.prototype.constructor = Player;


Player.prototype.isStatic = false;
Player.prototype.isLeftMouseDown = false;

Player.prototype.onShoot = function(){};


Player.prototype.soundDie = "player_die";
Player.prototype.soundTakeDamage = "player_hit";


Player.prototype.setInitFunctions  = function(){
    this.initFunctions = [this.defineProperties, this.createFixture, this.createIntentory];
};


Player.prototype.createIntentory = function(){
    this.inventory = new Inventory();
    this.inventory.init();
};


Player.prototype.defineMouseEvents = function(stage){
    var self = this;
    var interval = null;

    var mouseX = 0;
    var mouseY = 0;
    var fireRate = 120;
    var isFiring = false;

    function mouseMoveHandler(event){
        mouseX = event.global.x;
        mouseY = event.global.y;
    }

    stage.mousedown = function(event){
        console.log(self.inventory.currentmainWeaponsSlot);
        if (event.originalEvent.button == 0 && !self.isLeftMouseDown){
            self.isLeftMouseDown = true;
            mouseX = event.global.x;
            mouseY = event.global.y;
            isFiring = true;

            self.onShoot(mouseX, mouseY);

            function shootCycle() {
                delay(function(){
                    if (!isFiring) return;
                    self.onShoot(mouseX, mouseY);
                    shootCycle();
                }, fireRate);
            }

            shootCycle();

            stage.mousemove = mouseMoveHandler;
        }
    };

    stage.mouseup = function(event){
        if (event.originalEvent.button == 0){
            self.isLeftMouseDown = false;
            stage.mousemove = null;
            isFiring = false;
        }
    };
};


Player.prototype.createFixture = function(){
    var self = this;
    this.body.CreateFixture(Player.POLY_FIXTURE);
    this.body.SetLinearDamping(6);
};


Player.prototype.createTexture = function(){
    var manTexture = PIXI.Texture.fromFrame("img/blue-man.png");
    this.view = new PIXI.Sprite(manTexture);
};


Player.prototype.tick = function() {
    var vertical = 0;
    var horizontal = 0;
    var activeKeys = KeyboardJS.activeKeys();
    for (var j in activeKeys){
        if (activeKeys[j] == "a")
            vertical --;

        if (activeKeys[j] == "d")
            vertical ++;

        if (activeKeys[j] == "w")
            horizontal --;

        if (activeKeys[j] == "s")
            horizontal ++;
    }


    if (horizontal || vertical){
        var radian = Math.atan2(horizontal, vertical);
        var velocity = this.body.GetLinearVelocity();
        var newVelocity = new Box2D.Common.Math.b2Vec2(
            Math.cos(radian) * Player.SPEED,
            Math.sin(radian) * Player.SPEED
        );


        if ((Math.abs(newVelocity.x + velocity.x) > Player.MAX_VELOCITY) && signum(newVelocity.x) == signum(velocity.x))
            newVelocity.x = 0;

        if ((Math.abs(newVelocity.y + velocity.y) > Player.MAX_VELOCITY) && signum(newVelocity.y) == signum(velocity.y))
            newVelocity.y = 0;

        this.body.ApplyImpulse(
            newVelocity,
            this.body.GetWorldCenter()
        );

        // Rotate in right angle
        var radian = Math.atan2(velocity.y, velocity.x);
        var newRotation = radian - (90 * (Math.PI / 180));
        this.body.SetAngle(newRotation);
    }
};




Player.POLY_FIXTURE = new Box2D.Dynamics.b2FixtureDef();
Player.POLY_FIXTURE.shape = new Box2D.Collision.Shapes.b2PolygonShape();
Player.POLY_FIXTURE.density = 30;
Player.POLY_FIXTURE.friction = 0.1;
Player.POLY_FIXTURE.shape.SetAsBox(5 / 100, 5 / 100);

Player.SPEED = 0.05;
Player.MAX_VELOCITY = 1;
//Player.POLY_FIXTURE.restitution = 0.1;
Player.POLY_FIXTURE.filter.categoryBits = Collisions.CATEGORY_PLAYER;
Player.POLY_FIXTURE.filter.maskBits = Collisions.MASK_PLAYER;