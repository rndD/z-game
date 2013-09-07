function Game() {
    this.tileSize = 20;
};

Game.prototype.constructor = Game;

Game.prototype.init = function(renderer) {
    this.withInTile = Game.WIDTH / Game.TILE_SIZE;
    this.heightInTile = Game.HEIGHT / Game.TILE_SIZE;

    this.renderer = renderer;

    this.stage = new PIXI.Stage(0xEEFFFF, true);
    this.stage.hitArea = new PIXI.Rectangle(0, 0, Game.WIDTH, Game.HEIGHT);
    //TODO: перенести бг
    this.background = PIXI.Sprite.fromImage("./img/bg.jpg");
    this.stage.addChild(this.background);
    this.background.setInteractive(true);

    this.world = new Box2D.Dynamics.b2World(new Box2D.Common.Math.b2Vec2(0, 0),  true);
    this.objects2D = [];

    //TODO: убрать в другое место
    const container = document.createElement("div");
    document.body.appendChild(container);
    this.stats = new Stats();
    container.appendChild(this.stats.domElement);
    this.stats.domElement.style.position = "absolute";






//    var b2Listener = Box2D.Dynamics.b2ContactListener;
//    var listener = new b2Listener;
//    listener.PostSolve = function(contact, impulse) {
////        console.log("PostSolve");
//    }
//    this.world.SetContactListener(listener);
};


Game.prototype.createObject2DAt = function(objectClass, x, y, texture, isStatic, isAnimated) {
    var object2D = new objectClass();
    object2D.init(this.world, x, y, texture, isStatic, isAnimated);
    this.registerObject2D(object2D);
    return object2D;
};


Game.prototype.createPlayerAt = function(x, y) {
    var player = this.createObject2DAt(Player, x, y);
    this.registerPlayer(player);
    return player;
};


Game.prototype.registerObject2D = function(obj) {
    this.objects2D.push(obj)
    obj.game = this;
    // TODO: не скармливать внутрь
    this.stage.addChild(obj.view);
};


Game.prototype.registerPlayer = function(player) {
    this.player = player;
    // TODO говно же background
    this.player.defineMouseEvents(this.background);

    var self = this;
    this.player.onShoot = function(x, y){
        self.playerShootHandler(x, y);
    };
};


Game.prototype.globalTimer = function() {
    // Палит всякие обновления делев
};


Game.prototype.reRender = function() {
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
        // Cчитываем кнопки пользователя

        // Считаем таймер для делеев и симуляци

        // Тикает все тикающие объекты
        self.tickObjects2D();
        // Эмулейтим колижины TODO поставить не 1/60 а реальное время
        self.world.Step(1 / 60,  3,  3);
        self.world.ClearForces();

        // Резолвим эвенты от колижинов и другие подсчеты
        self.reRender();

        //TODO посмотреть нужно ли это засовывать сюда или можно один раз вызвать
        requestAnimFrame(loop);
        self.stats.update();
    }

    loop();
};


// Handlers
Game.prototype.playerShootHandler = function(x, y){
    var bullet = this.createObject2DAt(Bullet, this.player.getX(), this.player.getY());
    bullet.body.ApplyImpulse(
        new Box2D.Common.Math.b2Vec2(0.5, 0.5),
        bullet.body.GetWorldCenter()
    );

};

// Static property
Game.TILE_SIZE = 40;
Game.WIDTH = 1024;
Game.HEIGHT = 768;
