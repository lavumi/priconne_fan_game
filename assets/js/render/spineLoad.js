let SpineManager = function () {
    const RESOURCE_DIR = "assets/spine/";


    let shader;
    let batcher;
    let mvp = new spine.webgl.Matrix4();
    let skeletonRenderer;
    let debugRenderer;
    let debugShader;
    let shapes;
    let spineCharacter = {};
    let activeSkeleton = "";

    let movement = 1;


    //spineData
    let animationQueue = [];



    let additionAnimations = ['DEAR', 'NO_WEAPON', 'POSING', 'RACE', 'RUN_JUMP', 'SMILE'];

    let loading = false;
    let loadingSkeleton;
    let generalBattleSkeletonData = {};
    let generalAdditionAnimations = {};
    let currentTexture;
    let currentClassAnimData = {
        type: 0,
        data: {}
    };
    let currentCharaAnimData = {
        id: 0,
        data: {}
    };
    let currentClass = '1';




    let loadingFinishCallback = null;

    function getClass(i) {
        return (i < 10 ? '0' : '') + i;
    }


    function sliceCyspAnimation(buf) {
        let view = new DataView(buf), count = view.getInt32(12, true);
        return {
            count: count,
            data: buf.slice((count + 1) * 32)
        };
    }

    function initSpineGL() {
        shader = spine.webgl.Shader.newTwoColoredTextured(gl);
        batcher = new spine.webgl.PolygonBatcher(gl);
        mvp.ortho2d(0, 0, canvas.width - 1, canvas.height - 1);
        skeletonRenderer = new spine.webgl.SkeletonRenderer(gl);
        debugRenderer = new spine.webgl.SkeletonDebugRenderer(gl);
        debugRenderer.drawRegionAttachments = true;
        debugRenderer.drawBoundingBoxes = true;
        debugRenderer.drawMeshHull = true;
        debugRenderer.drawMeshTriangles = true;
        debugRenderer.drawPaths = true;
        debugShader = spine.webgl.Shader.newColored(gl);
        shapes = new spine.webgl.ShapeRenderer(gl);
    }


    function loadData(url, cb, loadType, progress) {
        // console.log(url);
        let xhr = new XMLHttpRequest;
        xhr.open('GET', url, true);
        if (loadType) xhr.responseType = loadType;
        if (progress) xhr.onprogress = progress;
        xhr.onload = function () {
            if (xhr.status === 200)
                cb(true, xhr.response);
            else
                cb(false);
        }
        xhr.onerror = function () {
            cb(false);
        }
        xhr.send();
    }



    function loadSpine(unit_id, class_id, finishCallback ) {
        loadingFinishCallback = finishCallback;
        if (loading) return;
        loading = true;
        if (activeSkeleton === unit_id && currentClass === classList.value) return;
        currentClass = class_id;
        // let baseUnitId = unit_id | 0;
        // baseUnitId -= baseUnitId % 100 - 1;
        loadingSkeleton = { id: unit_id | 0, baseId: '000000' };
        //	if (loadingSkeleton.info.hasSpecialBase) loadingSkeleton.baseId = baseUnitId, currentClass = baseUnitId;
        let baseId = loadingSkeleton.baseId;

        if (!generalBattleSkeletonData[baseId])
            loadData(RESOURCE_DIR + baseId + '_CHARA_BASE.cysp', function (success, data) {
                if (!success || data === null) return loading = false;
                generalBattleSkeletonData[baseId] = data;
                loadAdditionAnimation();
            }, 'arraybuffer');
        else loadAdditionAnimation();
    }
    function loadAdditionAnimation() {
        let doneCount = 0, abort = false;
        let baseId = loadingSkeleton.baseId;
        generalAdditionAnimations[baseId] = generalAdditionAnimations[baseId] || {};
        additionAnimations.forEach(function (i) {
            if (generalAdditionAnimations[baseId][i]) return doneCount++;
            loadData(RESOURCE_DIR + baseId + '_' + i + '.cysp', function (success, data) {
                if (!success || data == null) return abort = true;

                if (abort) return;
                generalAdditionAnimations[baseId][i] = sliceCyspAnimation(data);
                if (++doneCount === additionAnimations.length) loadClassAnimation();
            }, 'arraybuffer');
        });
        if (doneCount === additionAnimations.length) return loadClassAnimation();
    }
    function loadClassAnimation() {
        if (currentClassAnimData.type === currentClass)
            loadCharaSkillAnimation();
        else
            loadData(RESOURCE_DIR + getClass(currentClass) + '_COMMON_BATTLE.cysp', function (success, data) {
                if (!success || data === null) return loading = false;
                currentClassAnimData = {
                    type: currentClass,
                    data: sliceCyspAnimation(data)
                }
                loadCharaSkillAnimation();
            }, 'arraybuffer');
    }
    function loadCharaSkillAnimation() {
        let baseUnitId = loadingSkeleton.id;
        baseUnitId -= baseUnitId % 100 - 1;
        if (currentCharaAnimData.id === baseUnitId)
            loadTexture();
        else
            loadData(RESOURCE_DIR + baseUnitId + '_BATTLE.cysp', function (success, data) {
                if (!success || data === null) return loading = false;
                currentCharaAnimData = {
                    id: baseUnitId,
                    data: sliceCyspAnimation(data)
                }
                loadTexture();
            }, 'arraybuffer');
    }
    function loadTexture() {
        loadData(RESOURCE_DIR + loadingSkeleton.id + '.atlas', function (success, atlasText) {
            if (!success) return loading = false;//
            loadData(RESOURCE_DIR + loadingSkeleton.id + '.png', function (success, blob) {
                if (!success) return loading = false;
                let img = new Image();
                img.onload = function () {

                    let created = !!spineCharacter.skeleton;
                    if (created) {
                        spineCharacter.state.clearTracks();
                        spineCharacter.state.clearListeners();
                        gl.deleteTexture(currentTexture.texture)
                    }

                    let imgTexture = new spine.webgl.GLTexture(gl, img);
                    URL.revokeObjectURL(img.src);
                    let atlas = new spine.TextureAtlas(atlasText, function () {
                        return imgTexture;
                    });
                    currentTexture = imgTexture;
                    let atlasLoader = new spine.AtlasAttachmentLoader(atlas);

                    let baseId = loadingSkeleton.baseId;
                    let additionAnimations = Object.values(generalAdditionAnimations[baseId]);

                    let animationCount = 0;
                    let classAnimCount = currentClassAnimData.data.count;
                    animationCount += classAnimCount;
                    let unitAnimCount = currentCharaAnimData.data.count;
                    animationCount += unitAnimCount;
                    additionAnimations.forEach(function (i) {
                        animationCount += i.count;
                    })

                    //assume always no more than 128 animations
                    let newBuffSize = generalBattleSkeletonData[baseId].byteLength - 64 + 1 +
                        currentClassAnimData.data.data.byteLength +
                        currentCharaAnimData.data.data.byteLength;
                    additionAnimations.forEach(function (i) {
                        newBuffSize += i.data.byteLength;
                    })
                    let newBuff = new Uint8Array(newBuffSize);
                    let offset = 0;
                    newBuff.set(new Uint8Array(generalBattleSkeletonData[baseId].slice(64)), 0);
                    offset += generalBattleSkeletonData[baseId].byteLength - 64;
                    newBuff[offset] = animationCount;
                    offset++;
                    newBuff.set(new Uint8Array(currentClassAnimData.data.data), offset);
                    offset += currentClassAnimData.data.data.byteLength;
                    newBuff.set(new Uint8Array(currentCharaAnimData.data.data), offset);
                    offset += currentCharaAnimData.data.data.byteLength;
                    additionAnimations.forEach(function (i) {
                        newBuff.set(new Uint8Array(i.data), offset);
                        offset += i.data.byteLength;
                    })

                    let skeletonBinary = new spine.SkeletonBinary(atlasLoader);
                    let skeletonData = skeletonBinary.readSkeletonData(newBuff.buffer);
                    let skeleton = new spine.Skeleton(skeletonData);
                    skeleton.setSkinByName('default');
                    let bounds = calculateBounds(skeleton);

                    animationStateData = new spine.AnimationStateData(skeleton.data);
                    let animationState = new spine.AnimationState(animationStateData);
                    // console.log( animationStateData );
                    //animationState.setAnimation(0, getClass(currentClass) + '_idle', true);
                    animationState.addListener({
                        /*
                        start: function (track) {
                            //console.log("Animation on track " + track.animation.name + " started" + "     " + Date.now());
                        },

                        interrupt: function (track) {
                            console.log("Animation on track " + track.trackIndex + " interrupted");
                        },
                        end: function (track) {
                            console.log("Animation on track " + track.trackIndex + " ended");
                        },
                        disposed: function (track) {
                            console.log("Animation on track " + track.trackIndex + " disposed");
                        },*/
                        complete: function tick() {
                            //console.log("Animation on track " + track.animation.name + " ended" + "     " + Date.now());
                            if (animationQueue.length) {
                                let nextAnim = animationQueue.shift();
                                // console.log( 'start ' + nextAnim );
                                if (nextAnim === 'stop') return;
                                if (nextAnim === 'hold') return setTimeout(tick, 1e3);
                                nextAnim = setAnimName(nextAnim);
                                if( nextAnim === getClass(currentClass) + '_run'){
                                    movement = 1;
                                }
                                animationState.setAnimation(0, nextAnim, !animationQueue.length);
                            }
                        },
                        /*event: function (track, event) {
                            console.log("Event on track " + track.trackIndex + ": " + JSON.stringify(event));
                        }*/
                    });

                    spineCharacter = { skeleton: skeleton, state: animationState, bounds: bounds, premultipliedAlpha: true }
                    loading = false;
                    //(window.updateUI || setupUI)();
                    if (!created) {
                        canvas.style.width = '99%';

                        loadingFinishCallback && loadingFinishCallback();
                        loadingFinishCallback = null;
                        setTimeout(function () {
                            canvas.style.width = '';
                        }, 0)
                    }
                    activeSkeleton = loadingSkeleton.id;
                }
                img.src = URL.createObjectURL(blob);
            }, 'blob', function (e) {
                // let perc = e.loaded / e.total * 40 + 60;
            });
        })
    }
    function calculateBounds(skeleton) {
        skeleton.setToSetupPose();
        skeleton.updateWorldTransform();
        let offset = new spine.Vector2();
        let size = new spine.Vector2();
        skeleton.getBounds(offset, size, []);
        offset.y = 0
        return { offset: offset, size: size };
    }
    function setAnimName(animName) {
        let returnName;
        if (animName.substr(0, 6) === '000000') returnName = animName;
        else if (animName.substr(0, 1) !== '1') returnName = getClass(currentClassAnimData.type) + '_' + animName;
        else returnName = animName;
        return returnName
    }

    let charPos = 0;


    function spineRender(delta, showDebug) {
        spineCharacter.skeleton.x = charPos;
        spineCharacter.skeleton.y = -550;
        // Apply the animation state based on the delta time.
        let state = spineCharacter.state;
        let skeleton = spineCharacter.skeleton;
        let premultipliedAlpha = spineCharacter.premultipliedAlpha;
        state.update(delta);
        state.apply(skeleton);
        movementSkeleton(skeleton, movement);
        skeleton.updateWorldTransform();

        // Bind the shader and set the texture and model-view-projection matrix.
        shader.bind();
        shader.setUniformi(spine.webgl.Shader.SAMPLER, 0);
        shader.setUniform4x4f(spine.webgl.Shader.MVP_MATRIX, mvp.values);

        // Start the batch and tell the SkeletonRenderer to render the active skeleton.
        batcher.begin(shader);
        skeletonRenderer.premultipliedAlpha = premultipliedAlpha;
        skeletonRenderer.draw(batcher, skeleton);
        batcher.end();

        shader.unbind();

        if (showDebug) {
            debugShader.bind();
            debugShader.setUniform4x4f(spine.webgl.Shader.MVP_MATRIX, mvp.values);
            debugRenderer.premultipliedAlpha = premultipliedAlpha;
            shapes.begin(debugShader);
            debugRenderer.draw(shapes, skeleton);
            shapes.end();
            debugShader.unbind();
        }
    }

    function movementSkeleton(targetSkeleton, moveX) {
        if (moveX < 0) {
            targetSkeleton.flipX = true;
        }
        else if (moveX > 0) {
            targetSkeleton.flipX = false;
        }
    }

    function resize( scale ){

        let centerX = 0;
        let centerY = 0;
        let width = canvas.width / scale * 2 ;
        let height = canvas.height / scale * 2;

        mvp.ortho2d(centerX - width / 2, centerY - height / 2, width, height);
    }




    //에니메이션 실행 부분


    function setIdle(){
        spineCharacter.state.setAnimation(0, getClass(currentClass) + '_idle', true);
    }

    function setDearIdle(){
        // spineCharacter.state.setAnimation(0, '000000_dear_idol', true);
        // spineCharacter.state.setAnimation(0, '000000_dear_idol', true);
        spineCharacter.state.setAnimation(0, getClass(currentClass) + '_idle', true);
        movement = 0.5;
    }

    function runChar(isLeft ){
        if(isLeft === true)
            movement = -1;
        else
            movement = 1;

        // let run = {
        //     animName : 'run',
        //     isLoop : true,
        //     timeScale : 1
        // };
        spineCharacter.state.setAnimation(0, getClass(currentClass) + '_run', true);
       // runAnimation([run]);
    }
    function stopChar(){
        movement = 0;

        let idle = {
            animName : 'standby',
            isLoop : true,
            timeScale : 1
        };
        runAnimation([idle]);
    }

    function attackChar (){
        movement = 0;

        let idle = {
            animName : 'idle',
            isLoop : true,
            timeScale : 1
        };
        let attack_skipQuest = {
            animName : 'attack_skipQuest',
            isLoop : false,
            timeScale : 1
        };

        runAnimation([attack_skipQuest, idle]);
    }

    function attack2Char (){
        movement = 0;
        let idle = {
            animName : 'idle',
            isLoop : true,
            timeScale : 1
        };
        let attack = {
            animName : 'attack',
            isLoop : false,
            timeScale : 2
        };
        runAnimation([attack, idle]);
    }

    function damageedChar (){

        let idle = {
            animName : 'run',
            isLoop : true,
            timeScale : 1
        };
        let damage = {
            animName : 'damage',
            isLoop : false,
            timeScale : 1
        };
        if (runAnimation([damage, idle])){
            movement = 0;
            return true;
        }
        else {
            return false;
        }

    }

    function jumpChar (){
        let idle = {
            animName : 'run',
            isLoop : true,
            timeScale : 1
        };
        let damage = {
            animName : '000000_run_highJump',
            isLoop : false,
            timeScale : 0.5
        };
        runAnimation([damage, idle]);
    }

    function dieChar(){
        movement = 0;
        let stop = {
            animName : 'stop',
            isLoop : false,
            timeScale : 1
        };
        let die = {
            animName : 'die',
            isLoop : false,
            timeScale : 1
        };
        animationQueue.length = 0;
        runAnimation([die, stop]);
    }

    function useSkill(index){
        let characterSkillDataID = Math.floor(characterID / 100) * 100 + 1;

        let skill = {
            animName : characterSkillDataID + '_skill' + index,
            isLoop : false,
            timeScale : 1.5
        };
        let idle = {
            animName : 'idle',
            isLoop : true,
            timeScale : 1
        };

        runAnimation([skill, idle] );
    }



    function runAnimation( animArray){

        if( animationQueue.length !== 0)
            return false ;

        let firstActionObj =  animArray.shift();
        let firstAction = firstActionObj.animName;

        firstAction = setAnimName(firstAction);

        // console.log(spineCharacter.state)

        let AnimEntry = spineCharacter.state.setAnimation(0, firstAction, firstActionObj.isLoop);
        AnimEntry.timeScale = firstActionObj.timeScale;

        animArray.forEach( function(i){
            animationQueue.push( i.animName);
        })
        return true;
    }

    function getSpeed(){
        return movement;
    }

    function setPosition( pos ){
        charPos = pos;
    }

    function getPosition(){
        return charPos;
    }
    return {
        init : initSpineGL,
        load : loadSpine,
        resize : resize,
        render    : spineRender,
        setPosition : setPosition,
        getPosition : getPosition,

        setDearIdle : setDearIdle,
        setIdle : setIdle,
        run : runChar,
        jump : jumpChar,
        damage : damageedChar,
        attackChar : attackChar,
        getSpeed : getSpeed,

        die : dieChar
    }
}
