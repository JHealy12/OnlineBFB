var myId=0;

//var land;

var shadow;
var ship;
var turret;
var player;
var shipList;
var explosions;
var map;
var Score = 0;
var scoreText;

var logo;


var cursors;
var weapon;
var bullets;
var fireRate = 100;
var nextFire = 0;

var ready = false;
var eurecaServer;
//this function will handle client communication with the server
var eurecaClientSetup = function() {
	//create an instance of eureca.io client
	var eurecaClient = new Eureca.Client();
	
	eurecaClient.ready(function (proxy) {		
		eurecaServer = proxy;
	});
	
	
	//methods defined under "exports" namespace become available in the server side
	
	eurecaClient.exports.setId = function(id) 
	{
		//create() is moved here to make sure nothing is created before uniq id assignation
		myId = id;
		create();
		eurecaServer.handshake();
		ready = true;
	}	
	
	eurecaClient.exports.kill = function(id)
	{	
		if (shipList[id]) {
			shipList[id].kill();
			console.log('killing ', id, shipList[id]);
		}
	}	
	
	eurecaClient.exports.spawnEnemy = function(i, x, y)
	{
		
		if (i == myId) return; //this is me
		
		console.log('SPAWN');
		var shp = new Ship(i, game, ship);
		shipList[i] = shp;
	}
	
	eurecaClient.exports.updateState = function(id, state)
	{
		if (shipList[id])  {
			shipList[id].cursor = state;
			shipList[id].ship.x = state.x;
			shipList[id].ship.y = state.y;
			shipList[id].ship.angle = state.angle;
			shipList[id].turret.rotation = state.rot;
			shipList[id].update();
		}
	}
}


Ship = function (index, game, player) {
	this.cursor = {
		left:false,
		right:false,
		up:false,
		fire:false		
	}

	this.input = {
		left:false,
		right:false,
		up:false,
		fire:false
	}

    var x = 0;
    var y = 0;

    this.game = game;
    this.health = 30;
    this.player = player;
    this.bullets = game.add.group();
    this.bullets.enableBody = true;
    this.bullets.physicsBodyType = Phaser.Physics.ARCADE;
    this.bullets.createMultiple(20, 'bullet', 0, false);
    this.bullets.setAll('anchor.x', 0.5);
    this.bullets.setAll('anchor.y', 0.5);
    this.bullets.setAll('outOfBoundsKill', true);
    this.bullets.setAll('checkWorldBounds', true);	
	
	
	this.currentSpeed =0;
    this.fireRate = 500;
    this.nextFire = 0;
    this.alive = true;

    this.shadow = game.add.sprite(0.5, 0.5, 'enemy', '');
    this.ship = game.add.sprite(0.5, 0.5, 'enemy', 'turret');
    this.turret = game.add.sprite(0.5, 0.5, 'enemy', 'turret');

    this.shadow.anchor.set(0.5);
    this.ship.anchor.set(0.5);
    this.turret.anchor.set(0.3, 0.5);

    this.ship.id = index;
    game.physics.enable(this.ship, Phaser.Physics.ARCADE);
    this.ship.body.immovable = false;
    this.ship.body.collideWorldBounds = true;
    this.ship.body.bounce.setTo(0, 0);

    this.ship.angle = 0;

    game.physics.arcade.velocityFromRotation(this.ship.rotation, 0, this.ship.body.velocity);

};

Ship.prototype.update = function() {
	
	game.physics.arcade.collide(ship,layer); //player collides with tiles
	
	var inputChanged = (
		this.cursor.left != this.input.left ||
		this.cursor.right != this.input.right ||
		this.cursor.up != this.input.up ||
		this.cursor.fire != this.input.fire
	);
	
	
	if (inputChanged)
	{
		//Handle input change here
		//send new values to the server		
		if (this.ship.id == myId)
		{
			// send latest valid state to the server
			this.input.x = this.ship.x;
			this.input.y = this.ship.y;
			this.input.angle = this.ship.angle;
			this.input.rot = this.turret.rotation;
			
			
			eurecaServer.handleKeys(this.input);
			
		}
	}

	//cursor value is now updated by eurecaClient.exports.updateState method
	
	
    if (this.cursor.left)
    {
        this.ship.angle -= 1;
    }
    else if (this.cursor.right)
    {
        this.ship.angle += 1;
    }	
    if (this.cursor.up)
    {
        //  The speed we'll travel at
        this.currentSpeed = 300;
    }
    else
    {
        if (this.currentSpeed > 0)
        {
            this.currentSpeed -= 4;
        }
    }
    if (this.cursor.fire)
    {	
		this.fire({x:this.cursor.tx, y:this.cursor.ty});
    }
	
	
	
    if (this.currentSpeed > 0)
    {
        game.physics.arcade.velocityFromRotation(this.ship.rotation, this.currentSpeed, this.ship.body.velocity);
    }	
	else
	{
		game.physics.arcade.velocityFromRotation(this.ship.rotation, 0, this.ship.body.velocity);
	}
	
	
	
	
    this.shadow.x = this.ship.x;
    this.shadow.y = this.ship.y;
    this.shadow.rotation = this.ship.rotation;

    this.turret.x = this.ship.x;
    this.turret.y = this.ship.y;
};


Ship.prototype.fire = function(target) {
		if (!this.alive) return;
        if (this.game.time.now > this.nextFire && this.bullets.countDead() > 0)
        {
            this.nextFire = this.game.time.now + this.fireRate;
            var bullet = this.bullets.getFirstDead();
            bullet.reset(this.turret.x, this.turret.y);

			bullet.rotation = this.game.physics.arcade.moveToObject(bullet, target, 500);
        }
}


Ship.prototype.kill = function() {
	this.alive = false;
	this.ship.kill();
	this.turret.kill();
	this.shadow.kill();
}

var game = new Phaser.Game(800, 600, Phaser.AUTO, 'phaser-example', { preload: preload, create: eurecaClientSetup, update: update, render: render });

function preload () {

    //game.load.atlas('ship', 'assets/enemy-ship.png', 'assets/ships.json');
    game.load.atlas('enemy', 'assets/ship.png', 'assets/ships.json');
    game.load.image('logo', 'assets/logo.png');
    game.load.image('bullet', 'assets/bullet.png');
    game.load.image('earth', 'assets/scorched_earth.png');
	game.load.tilemap('map1','Assets/level1_V2.csv');
    game.load.spritesheet('kaboom', 'assets/explosion.png', 64, 64, 23);
	//load tileset
	game.load.image('Tileset','Assets/Tileset.png'); //tileset image
}




function create () {

    //  Resize our game world to be a 2000 x 2000 square
    game.world.setBounds(-1000, -1000, 2000, 2000);
	game.stage.disableVisibilityChange  = true;
	
//map
        map = game.add.tilemap('map1', 32, 32);
        map.addTilesetImage('Tileset');
        layer = map.createLayer(0);
        layer.resizeWorld();
		
			//map tile collisions
        map.setCollisionBetween(0, 17);
		map.setCollisionBetween(19, 45);

		 
    
    shipList = {};
	
	player = new Ship(myId, game, ship);
	shipList[myId] = player;
	ship = player.ship;
	turret = player.turret;
	ship.x=0;
	ship.y=0;
	bullets = player.bullets;
	shadow = player.shadow;	

    //  Explosion pool
    explosions = game.add.group();

    for (var i = 0; i < 10; i++)
    {
        var explosionAnimation = explosions.create(0, 0, 'kaboom', [0], false);
        explosionAnimation.anchor.setTo(0.5, 0.5);
        explosionAnimation.animations.add('kaboom');
    }

    ship.bringToTop();
    turret.bringToTop();
		
    logo = game.add.sprite(150, 150, 'logo');
    logo.fixedToCamera = true;

    game.input.onDown.add(removeLogo, this);

    game.camera.follow(ship);
    game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300);
    game.camera.focusOnXY(0, 0);

    cursors = game.input.keyboard.createCursorKeys();
	
	setTimeout(removeLogo, 1000);
	
}

function removeLogo () {
    game.input.onDown.remove(removeLogo, this);
    logo.kill();
}

function update () {
	//do not update if client not ready
	if (!ready) return;
	
	player.input.left = cursors.left.isDown;
	player.input.right = cursors.right.isDown;
	player.input.up = cursors.up.isDown;
	player.input.fire = game.input.activePointer.isDown;
	player.input.tx = game.input.x+ game.camera.x;
	player.input.ty = game.input.y+ game.camera.y;
	
	
	
	turret.rotation = game.physics.arcade.angleToPointer(turret);	
   // land.tilePosition.x = -game.camera.x;
   // land.tilePosition.y = -game.camera.y;

    	
	
    for (var i in shipList)
    {
		if (!shipList[i]) continue;
		var curBullets = shipList[i].bullets;
		var curShip = shipList[i].ship;
		for (var j in shipList)
		{
			if (!shipList[j]) continue;
			if (j!=i) 
			{
			
				var targetShip = shipList[j].ship;
				
				game.physics.arcade.overlap(curBullets, targetShip, bulletHitPlayer, null, this);
			
			}
			if (shipList[j].alive)
			{
				shipList[j].update();
			}			
		}
    }
}

function bulletHitPlayer (ship, bullet) {
	
	var startship2x = 150;
	var startship2y = 10;
	var explosionAnimation = explosions.create(0, 0, 'kaboom', [0], false);
        explosionAnimation.anchor.setTo(0.5, 0.5, ship);
        explosionAnimation.animations.add('kaboom');
    bullet.kill();
	
	ship.reset(startship2x, startship2y); //reset player2 to starting location
			
}

function render () {}

