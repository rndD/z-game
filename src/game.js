function Game() {
    this.tileSize = 20;
};

Game.prototype.constructor = Game;


// Static property
Game.TILE_SIZE = 40;
Game.WIDTH = 1024;
Game.HEIGHT = 768;


Game.prototype.onPlayerHpChanged = function(){};


Game.prototype.init = function(renderer) {
    this.destroyList = [];
    this.objects2D = [];

    this.withInTile = Game.WIDTH / Game.TILE_SIZE;
    this.heightInTile = Game.HEIGHT / Game.TILE_SIZE;

    this.renderer = renderer;

    this.timer = new GlobalTimer();
    this.timer.init();

    this.stage = new PIXI.Stage(0xEEFFFF, true);
    this.stage.hitArea = new PIXI.Rectangle(0, 0, Game.WIDTH, Game.HEIGHT);
    //TODO: перенести бг, но куда?
    this.background = PIXI.Sprite.fromImage("./img/bg.jpg");
    this.stage.addChild(this.background);
    this.background.setInteractive(true);

    this.box2DWorld = new Box2D.Dynamics.b2World(new Box2D.Common.Math.b2Vec2(0, 0),  true);

    //TODO: убрать в другое место
    this.stats = new Stats();
    $(".viewport").append(this.stats.domElement);
    this.stats.domElement.style.position = "absolute";

    // Глобальные столкновения
    var b2Listener = Box2D.Dynamics.b2ContactListener;
    var listener = new b2Listener;
    var self = this;
    listener.PostSolve = function(contact, impulse) {
        self.globalPostSolveHandler(contact, impulse);
    };
    this.box2DWorld.SetContactListener(listener);
};


Game.prototype.createObject2DAt = function(objectClass, x, y, texture, isStatic, isAnimated) {
    var object2D = new objectClass();
    object2D.init(this.box2DWorld, x, y, texture, isStatic, isAnimated);
    this.registerObject2D(object2D);

    if (object2D.isLive){
        var self = this;
        object2D.onDie = function(object) {
            self.onLiveObjectDie(object);
        };
    }

    return object2D;
};


Game.prototype.createPlayerAt = function(x, y) {
    var player = this.createObject2DAt(Player, x, y);
    this.registerPlayer(player);
    return player;
};


Game.prototype.registerObject2D = function(obj) {
    this.objects2D.push(obj);
    // TODO: не скармливать внутрь
    obj.game = this;
    this.stage.addChild(obj.view);
};


Game.prototype.registerPlayer = function(player) {
    this.player = player;
    // TODO говно же background
    this.player.defineMouseEvents(this.background);

    var self = this;
    this.player.onShoot = function(vectorFrom, vectorTo, weaponStats){
        self.simpleShoot(vectorFrom, vectorTo, weaponStats);
    };

    this.player.onHpChanged = function(newHp){
        self.onPlayerHpChanged(newHp);
    };
};


Game.prototype.render = function() {
    // Обновляем позиции в PIXI
    for (var i = 0; i < this.objects2D.length; i++) {
        this.objects2D[i].updateView();
    }
    // Рендерим
    this.renderer.render(this.stage);
};


Game.prototype.tickObjects2D = function() {
    for (var i = 0; i < this.objects2D.length; i++) {
        this.objects2D[i].tick();
    }
};


Game.prototype.mainLoop = function() {
    var self = this;

    function loop(){
        self.mainLoopDestroyObjectsStep();
        // Cчитываем кнопки пользователя

        // Считаем таймер для делеев и симуляци

        // Тикает все тикающие объекты
        self.timer.tick();
        self.tickObjects2D();
        // Эмулейтим колижины
        // TODO поставить не 1/60 а реальное время
        self.box2DWorld.Step(1 / 60,  3,  3);
        self.box2DWorld.ClearForces();

        // Резолвим эвенты от колижинов и другие подсчеты
        self.render();

        //TODO посмотреть нужно ли это засовывать сюда или можно один раз вызвать
        requestAnimFrame(loop);
        self.stats.update();
    }

    loop();
};


Game.prototype.mainLoopDestroyObjectsStep = function() {
    if (this.destroyList.length > 0){
        // Удаляем объекты
        for (var i in this.destroyList) {
            var object = this.destroyList[i];
            this.box2DWorld.DestroyBody(object.body);

            // TODO: Без этого условия часто вылетает, и ругается, что нету парента, похоже в destroyList
            // часто успевает попасть 2 раза один и тот же объект
            if (object.view.parent)
                this.stage.removeChild(object.view);

            var index = this.objects2D.indexOf(object);
            if (index != -1){
                this.objects2D.splice(index, 1);
            }

            delete this.destroyList[i];
        }
        this.destroyList = [];
    }
};


Game.prototype.simpleShoot = function(vectorFrom, vectorTo, weaponStats){
    createjs.Sound.play(weaponStats.shotSound, createjs.Sound.INTERRUPT_NONE, 0, 0, false, 0.4);

    for (var i = 0; i < weaponStats.bulletsPerShot; i++){
        this.createSimpleBullet(vectorFrom, vectorTo, weaponStats);
    }
};


Game.prototype.createSimpleBullet = function(vectorFrom, vectorTo, weaponStats) {
    // Погрешность выстрела
    var infelicity = Math.random() * (weaponStats.scatter * 2) - weaponStats.scatter;
    var radian = Math.atan2(vectorTo.y - vectorFrom.y, vectorTo.x - vectorFrom.x) + infelicity;

    var vel = {
        x: Math.cos(radian) * weaponStats.bulletSpeed,
        y: Math.sin(radian) * weaponStats.bulletSpeed
    };
    var pluser = 25;
    var bullet = this.createObject2DAt(Bullet, vectorFrom.x + (vel.x * pluser), vectorFrom.y + (vel.y * pluser));
    bullet.damage = weaponStats.damage;

    bullet.body.ApplyImpulse(
        new Box2D.Common.Math.b2Vec2(vel.x, vel.y),
        bullet.body.GetWorldCenter()
    );

    // self destroy in 10 secs
    var self = this;
    delay(function() {
        self.destroyList.push(bullet);
    }, 10 * 1000);
};


//--------------------------------------------------------------------------------------------------------------
//
//  Handlers
//
//--------------------------------------------------------------------------------------------------------------
Game.prototype.onLiveObjectDie = function(object) {
    this.destroyList.push(object);
};


Game.prototype.globalPostSolveHandler = function(contact, impulse) {
    var objectA = contact.GetFixtureA().GetBody().GetUserData();
    var objectB = contact.GetFixtureB().GetBody().GetUserData();

    if(objectA && objectB){
        if (objectA.isInstanceOf(Bullet)){
            var velocity = objectA.body.GetLinearVelocity();
            var speed = Number(Math.abs(velocity.x).toFixed(4)) + Number(Math.abs(velocity.y).toFixed(4));

            if (speed < 5){
                this.destroyList.push(objectA);
            }
        }

        if (objectA.isInstanceOf(Bullet) && objectB.isInstanceOf(LiveObject)){
            this.destroyList.push(objectA);
            objectB.takeDamage(objectA.damage);
        }

        if ((objectA.isInstanceOf(Zombie) && objectB.isInstanceOf(Player)) ||
            (objectA.isInstanceOf(Player) && objectB.isInstanceOf(Zombie))){
            // определяем кто из них кто
            if (objectA.isInstanceOf(Player)){
                var player = objectA,
                    zombie = objectB;
            } else {
                player = objectB;
                zombie = objectA;
            }

            zombie.attackLiveObjectWithMeleeWeapon(player);
        }
    }
};
