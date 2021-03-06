modules.define(
    'GameOptions', [], function(provide) {
    var options = {};
    options.WIDTH = 1024;
    options.HEIGHT = 768;
    options.box2DMultiplier = 100;
    options.MAP_PRESETS_FILENAMES = [
        "simple_desert.json",
        "simple_ruins.json",
        "simple_tunnels.json",
        "simple_labyrinth.json"
    ];

    provide(options);
});

modules.define(
    'Game',
    ['GameOptions', 'SceneMap', 'Sector', 'Zombie', 'ZombieFast', 'ZombieDamage', 'ZombieJump', 'ZombieLongJump', 'ZombieVeryFast'],
    function(provide, GameOptions, SceneMap, Sector, Zombie, ZombieFast, ZombieDamage, ZombieJump, ZombieLongJump, ZombieVeryFast) {


    function Game() {
        // HANDLERS
        this.sectorBuildedHandler = function() {
            this.gameInterface = new GameInterface(game);
        }.bind(this);

        this.sectorClearedHandler = function(event) {
            var sector = event.currentTarget;

            sector.removeEventListener(Sector.SECTOR_CLEARED, this.sectorClearedHandler);
            this.currentDifficultyLevel += 0.3;

            this.changeActiveScene(this.scenesList[0]);
            sector.destroy();
            this.scenesList.pop();
        }.bind(this);

        this.playerEncounteredEnemiesHandler = function(event) {
            var sector = this.createSector();
            this.changeActiveScene(sector);
            sector.start();
        };
    }

    Game.prototype.constructor = Game;

    Game.prototype.scenesList = [];
    Game.prototype.mapPresets = {};
    Game.prototype.currentDifficultyLevel = 1;

    Game.prototype.init = function() {
        this.loadAssets();
    };


    Game.prototype.loadAssets = function() {
        this.loadJSON();

        var assetsToLoader = [
            "img/zombieSprite.json",
            "img/zombieLightBlueSprite.json",
            "img/zombieRedSprite.json",
            "img/zombieLightGreenSprite.json",
            "img/zombieYellowSprite.json",
            "img/zombiePurpleSprite.json",
            "img/blue-man.png",
            "img/small-brick.png",
            "img/map_bg.jpg",
            "img/sector.png",
            "img/brick.png",
            "img/bullet.png"
        ];

        // create a new loader
        var loader = new PIXI.AssetLoader(assetsToLoader);
        var self = this;
        loader.onComplete = function(){self.onAssetsLoaded();};
        loader.load();
    };


    Game.prototype.loadJSON = function(){
        // TODO: Нужно подождать пока все загружиться
        for (var i = 0; i < GameOptions.MAP_PRESETS_FILENAMES.length; i++) {
            $.getJSON("assets/map_presets/" + GameOptions.MAP_PRESETS_FILENAMES[i], function(data) {
                this.mapPresets[data.name] = data;
            }.bind(this));
        }
    };


    Game.prototype.onAssetsLoaded = function() {
        this.build();
    };


    Game.prototype.build = function() {
        this.loadSound();
        this.createAnimation();
        // let pixi choose WebGL or canvas
        var renderer = PIXI.autoDetectRenderer(GameOptions.WIDTH, GameOptions.HEIGHT);

        this.pixiStage = new PIXI.Stage(0x000000, true);

        // attach render to page
        document.body.appendChild(renderer.view);
        this.renderer = renderer;

        //TODO: убрать в другое место!! FPS
        this.stats = new Stats();
        $(".viewport").append(this.stats.domElement);
        this.stats.domElement.style.position = "absolute";

        this.createSceneMap();

        this.mainLoop();
    };


    Game.prototype.createSceneMap = function() {
        var sceneMap = new SceneMap();
        sceneMap.addEventListener(
            SceneMap.PLAYER_ENCOUNTERED_ENEMIES,
            this.playerEncounteredEnemiesHandler.bind(this)
        );

        sceneMap.init(this.pixiStage);

        this.pixiStage.addChild(sceneMap.sceneStage);

        this.activeScene = sceneMap;

        this.scenesList.push(sceneMap);
    };


    Game.prototype.loadSound = function() {
        if (!createjs.Sound.initializeDefaultPlugins()) {return;}

        var audioPath = "assets/";
        var manifest = [
            {id:"shoot", src:audioPath+"shoot.mp3"},
            {id:"shoot_assaut_rifle", src:audioPath+"shoot_assaut_rifle.mp3"},
            {id:"shoot_sniper_rifle", src:audioPath+"shoot_sniper_rifle.mp3"},
            {id:"player_hit", src:audioPath+"player_hit.mp3"},
            {id:"player_die", src:audioPath+"player_die.mp3"},
            {id:"zombie_die", src:audioPath+"zombie_die.mp3"}
        ];

        createjs.Sound.addEventListener("loadComplete", function(){});
        createjs.Sound.registerManifest(manifest);

        createjs.Sound.setVolume(localStorage.getItem("gameMasterVolume"));
    };


    Game.prototype.createAnimation = function() {
        // create an array to store the textures
        var zombiesTexturesData = [
            {
                prefix: "zombie",
                obj: Zombie
            },
            {
                prefix: "zombieLightBlue",
                obj: ZombieFast
            },
            {
                prefix: "zombieRed",
                obj: ZombieDamage
            },
            {
                prefix: "zombieLightGreen",
                obj: ZombieJump
            },
            {
                prefix: "zombieYellow",
                obj: ZombieLongJump
            },
            {
                prefix: "zombiePurple",
                obj: ZombieVeryFast
            }
        ];

        zombiesTexturesData.forEach(function(ztd) {
            var zombieTextures = [];
            for (var i=0; i < 25; i++)
            {
                var texture = PIXI.Texture.fromFrame(ztd.prefix + "_" + (i) + ".png");
                zombieTextures.push(texture);
            }
            ztd.obj.TEXTURE = zombieTextures;
        });
    };


    Game.prototype.mainLoop = function() {
        var self = this;

        function loop(){
            // TODO Cчитываем кнопки пользователя, возможно сделать силами pixi

            // Считаем таймер для делеев и симуляци
            // TODO Пройтись по всем активным стейджам и запустить их лупы
            self.activeScene && self.activeScene.loop();

            // Рендерим
            self.renderer.render(self.pixiStage);

            self.stats.update();
            requestAnimFrame(loop);
        }

        loop();
    };


    Game.prototype.createSector = function() {
        var mapPreset = this.getRandomMapPreset();
        var sector = new Sector();
        sector.addEventListener(Sector.SECTOR_BUILDED, this.sectorBuildedHandler);
        sector.addEventListener(Sector.SECTOR_CLEARED, this.sectorClearedHandler);
        sector.init(mapPreset, this.currentDifficultyLevel);

        this.pixiStage.addChild(sector.sceneStage);

        this.scenesList.push(sector);

        return sector;
    };


    Game.prototype.getRandomMapPreset = function() {
        return this.mapPresets[_.sample(_.keys(this.mapPresets))];
    };


    Game.prototype.changeActiveScene = function(newScene) {
        var oldScene = this.activeScene;
        this.activeScene = newScene;
        this.activeScene.active();
        oldScene.disactive();
    };


    provide(Game);
});

