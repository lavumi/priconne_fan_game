// let canvas;
// let gl;
let ScreenSize = [1024 , 768];


function GameMain() {

    // let socket = io();
    //#region 렌더링 변수
    let lastFrameTime = Date.now() / 1000;

    let bgColor = [0, 0, 0, 1];

    let spineManager;


    let diff = [
        [500, 500],
        [100, 250, 100, 250, 500],
        [100, 500],
        [300, 500, 300, 500],
        [250, 500]

    ];

    let nextObjPos = [500, 500];
    //#endregion

    //#region inGame val
    let characterID = 122331;
    let classID = 43;


    let speedFactor = 1;
    let obstaclePos = [];

    let bgPositions = [
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        []
    ];
    let baseBgSize = [ 1024/256,700/256];

    let score = 0;
    let HP = 3;

    let scrollSpeed = 50;
    let closeBGSpeed = 400;

    let STATE = {
        GAME_LOBBY: 0,
        GAME_ENTRY: 1,
        GAME_COUNTDOWN: 2,
        GAME_START: 3,

        GAME_OVER: 5,
        HIGH_SCORE: 6,
        GAME_RESTART: 7
    }

    let rankText = ['1st', '2nd', '3rd', '4th', '5th'];
    let currentState = null;

    //#endregion
    let keyMap = {};
    function init() {
        canvas = document.getElementById("canvas");
        let config = {alpha: false};
        gl = canvas.getContext("webgl", config) || canvas.getContext("experimental-webgl", config);
        if (!gl) {
            alert('WebGL is unavailable.');
            return;
        }


        initInput();

        spineManager = new SpineManager();
        spineManager.init();

        FontSystem.loadFont();

        TextureUtil.loadTexture(function () {
            spineManager.load(characterID, classID, function () {
                initGame();

            });
        })


        FontSystem.setString("score", "Score : " + score);
        FontSystem.setPosition("score", [300, -768/2]);


        // FontSystem.setString("Rank0", "");
        // FontSystem.setString("Rank1", "");
        // FontSystem.setString("Rank2", "");
        // FontSystem.setString("Rank3", "");
        // FontSystem.setString("Rank4", "");
        // FontSystem.setPosition("Rank0", [-950, -230]);
        // FontSystem.setPosition("Rank1", [-950, -290]);
        // FontSystem.setPosition("Rank2", [-950, -350]);
        // FontSystem.setPosition("Rank3", [-950, -410]);
        // FontSystem.setPosition("Rank4", [-950, -470]);

        FontSystem.setString("CountDown", "3");
        FontSystem.setPosition("CountDown", [0, 30]);

        FontSystem.setString("Restart", "Press Any Key To Start");
        FontSystem.setPosition("Restart", [0, 0]);

        FontSystem.setString("Ranktxt", "");
        FontSystem.setPosition("Ranktxt", [-30, 140]);

        FontSystem.setString("MyNAME", "");
        FontSystem.setPosition("MyNAME", [-95, 20]);
    }


    function initInput() {

        document.addEventListener('keydown', _handleKeyDownEvent, false);

        document.addEventListener('keyup',_handleKeyUpEvent , false);
    }


    function getAlphabetFromInput(input) {
        if (input.indexOf('Key') !== -1) {
            return input.replace('Key', "");
        } else {
            return null;
        }
    }

    let resetObstacle = function (i) {
        let nextPos = 0;

        for (let k = 0; k < obstaclePos.length; k++) {
            if (nextPos < obstaclePos[k][0])
                nextPos = obstaclePos[k][0];
        }


        let nextLength;
        if (nextObjPos.length === 1) {
            let rnd = Math.floor(Math.random() * 4);
            nextObjPos = nextObjPos.concat(diff[rnd]);
            nextLength = nextObjPos.shift();
        } else {
            nextLength = nextObjPos.shift();
        }

        obstaclePos[i][0] = nextPos + nextLength;

    }

    function initGame() {
        spineManager.setDearIdle();
        requestAnimationFrame(update);

        spineManager.setPosition(0);
        score = 0;
        HP = 3;
        currentState = STATE.GAME_LOBBY;

        obstaclePos.length = 0;
        bgPositions = [[], [], [], [], [], [], [], []];
        for (let i = 0; i < 3; i++) {
            for( let j = 0; j < bgPositions.length; j++ ) {
                bgPositions[j].push([i * 1024 - 512 , -768/2 + 69]);
            }
        }
        for (let i = 0; i < 10; i++) {
            obstaclePos.push([i * 512 + 1024, -768/2 + 70]);

        }


        FontSystem.setVisible("score", true);
        FontSystem.setVisible("CountDown", false);

        FontSystem.setVisible("Ranktxt", false);
        FontSystem.setVisible("MyNAME", false);
    }

    function startGame() {
        currentState = STATE.GAME_ENTRY;
        FontSystem.setVisible("Restart", false);
    }

    function update() {


        let now = Date.now() / 1000;
        let delta = now - lastFrameTime;
        lastFrameTime = now;
        delta *= speedFactor;
        let movement_delta = delta * spineManager.getSpeed();

        if (currentState === STATE.GAME_OVER
            || currentState === STATE.GAME_LOBBY
            || currentState === STATE.GAME_COUNTDOWN
            || currentState === STATE.HIGH_SCORE
        ) {
            movement_delta = 0;
        }


        if (currentState === STATE.GAME_ENTRY) {
            let pos = spineManager.getPosition();
            pos -= movement_delta * 800;
            if (pos <= 0 - ScreenSize[0] / 2) {
                pos = 0 - ScreenSize[0] / 2;
                currentState = STATE.GAME_COUNTDOWN;
                countDown();
            }
            spineManager.setPosition(pos);
        }

        for( let i = 0; i < bgPositions.length; i++ ) {
            for( let j = 0; j < bgPositions[i].length; j++ ) {
                bgPositions[i][j][0] -= movement_delta * i * scrollSpeed;
                if (bgPositions[i][j][0] < -ScreenSize[0] /2 * 3 )
                    bgPositions[i][j][0] += ScreenSize[0] * 2;
            }
        }


        for (let i = 0; i < obstaclePos.length; i++) {
            obstaclePos[i][0] -= movement_delta * closeBGSpeed;
            if (obstaclePos[i][0] > 100 - ScreenSize[0] / 2 && obstaclePos[i][0] < 270 - ScreenSize[0] / 2) {
                if (spineManager.damage()) {
                    resetObstacle(i);
                    HP--;
                    if (HP === 0) {
                        gameFinish();
                    }
                }
            } else if (obstaclePos[i][0] < -ScreenSize[0] / 2 - 128) {
                resetObstacle(i);
                score += 1;

            }
        }
        FontSystem.setString("score", "Score : " + score);

        let hptext = "";
        for (let i = 0; i < HP; i++) {
            hptext += '@';
        }
        FontSystem.setString("HP", hptext);


        render(delta);
        requestAnimationFrame(update);

    }

    function gameFinish() {
        spineManager.die();
        FontSystem.setVisible("Restart", true);
        currentState = STATE.GAME_OVER;
        sendScore(score);
    }

    function countDown() {
        setTimeout(function () {
            FontSystem.setVisible("CountDown", false);
        }, 4000);

        setTimeout(function () {
            FontSystem.setString("CountDown", "Start");
            spineManager.run();
            currentState = STATE.GAME_START;
            FontSystem.setVisible("score", true);
            FontSystem.setVisible("HP", true);
        }, 3000);

        setTimeout(function () {
            FontSystem.setString("CountDown", "1");
        }, 2000);

        setTimeout(function () {
            FontSystem.setString("CountDown", "2");
        }, 1000);

        FontSystem.setVisible("CountDown", true);
        FontSystem.setString("CountDown", "3");
        spineManager.setIdle();
    }

    function render(delta) {

        gl.clearColor(bgColor[0], bgColor[1], bgColor[2], 0.2);
        gl.clear(gl.COLOR_BUFFER_BIT);

        resize();

        SpriteShader.bind();
        SpriteShader.setTexture("0.png")
        SpriteShader.setAttr([-512, -768/2 + 69],baseBgSize);
        SpriteShader.draw();

        for( let k = 0; k < 8; k++ ) {
            SpriteShader.setTexture((k+1) + ".png")
            for( let i = 0; i < 3; i++ ) {
                SpriteShader.setAttr(bgPositions[k][i] ,baseBgSize);
                SpriteShader.draw();
            }
        }


        SpriteShader.setTexture("obstacle.png");
        for (let i = 0; i < obstaclePos.length; i++) {
            SpriteShader.setAttr(obstaclePos[i]);
            SpriteShader.draw();
        }


        if (currentState === STATE.HIGH_SCORE) {
            drawUI();
        }

        FontSystem.draw();


        spineManager.render(delta, false);

    }

    function drawUI() {

        SpriteShader.setTexture("optionUI.png");
        SpriteShader.setAttr([-256, -256]);
        SpriteShader.draw();

        FontSystem.setVisible("Ranktxt", true);
        FontSystem.setVisible("MyNAME", true);
    }

    function resize() {

        let w = ScreenSize[0];
        let h = ScreenSize[1];

        let scaleX = window.innerWidth * devicePixelRatio / w;
        let scaleY = window.innerHeight * devicePixelRatio / h;
        let scale = Math.min(scaleX, scaleY);
        if (scale > 1)
            scale = 1;


        w = Math.floor(w * scale / 10) * 10;
        h = Math.floor(h * scale / 10) * 10;

        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }


        spineManager.resize(scale);

        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function updateRank(data) {

        for (let i = 0; i < 5; i++) {
            if (i >= data.length)
                break;
            FontSystem.setString("Rank" + i, data[i].name + " " + data[i].score);
        }
    }

    let inputName = "";

    function updateUI(text) {

        if (text === null)
            return;
        inputName += text;
        if (inputName.length === 1 || inputName.length === 3)
            inputName += " ";
        else if (inputName.length === 5) {
            let realName = inputName.replace(/\s/gi, "");
            // socket.emit("set_score", {name: realName, score: score});
            FontSystem.setVisible("Ranktxt", false);
            FontSystem.setVisible("MyNAME", false);
        }

        FontSystem.setString("MyNAME", inputName);
    }

    function sendScore(score) {
        // socket.emit("checkRank", score);
        currentState = STATE.GAME_RESTART;
    }


    function _handleKeyDownEvent(event){

        if (currentState !== STATE.GAME_START)
            return;

        if (keyMap[event.code] === true) return;

        // if(event.code === 'ArrowRight' ){
        //     runChar( false);
        // }
        // else if (event.code === 'ArrowLeft'){
        //     runChar( true);
        // }
        //if (event.code === 'KeyA') {
        //sendScore(score);
        //spineManager.die();
        //}
        // else if (event.code === 'KeyS'){
        //     attack2Char();
        // }

        // else if (event.code === 'KeyQ'){
        //     dieChar( );
        // }
        // else if (event.code === 'KeyW'){
        //     damageedChar();
        // }

        // else if (event.code === 'KeyZ'){
        //     useSkill( 0);
        // }
        // else if (event.code === 'KeyX'){
        //     useSkill( 1);
        // }
        // else if (event.code === 'KeyC'){
        //     useSkill( 2);
        // }


        if (event.code === 'Space') {
            event.preventDefault();
            spineManager.jump();
        }

        keyMap[event.code] = true;
    }

    function _handleKeyUpEvent(event) {
        if (currentState === STATE.HIGH_SCORE) {
            updateUI(getAlphabetFromInput(event.code));
            return;
        }


        if (currentState === STATE.GAME_RESTART) {
            initGame();
        } else if (currentState === STATE.GAME_LOBBY) {
            startGame();
        }

        keyMap[event.code] = false;

    }

    function _mDown(){
        _handleKeyDownEvent({
            code : 'Space',
            preventDefault : ()=>{}
        });
        keyMap['Space'] = false;
    }
    function _mUp(){
        _handleKeyUpEvent({
            code : 'Space',
            preventDefault : ()=>{}
        });
    }

    // socket.on("update_rank", function (data) {
    //     updateRank(data);
    //     currentState = STATE.GAME_RESTART;
    // });

    // socket.on("returnRank", function (data) {
    //     if (data === -1) {
    //         currentState = STATE.GAME_RESTART;
    //     } else {
    //         inputName = "";
    //         FontSystem.setString("Ranktxt", rankText[data]);
    //         FontSystem.setString("MyNAME", inputName);
    //         currentState = STATE.HIGH_SCORE;
    //     }
    // });

    return {
        init: init,
        inputMobileDown : _mDown,
        inputMobileUp : _mUp
    }
    //endregion
}


let main = new GameMain();
main.init();




//for mobile
document.getElementById("mobile-button").addEventListener("touchstart", main.inputMobileDown );
document.getElementById("mobile-button").addEventListener("touchend", main.inputMobileUp );
