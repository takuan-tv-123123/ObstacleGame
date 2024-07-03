const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

const DEFAULT_MULTIPLIER = 1;
let obstacleSpeedMultiplier = DEFAULT_MULTIPLIER;

const player = {
    x: canvas.width / 2,
    y: canvas.height - 30,
    width: 50,
    height: 50,
    color: 'blue',
    speed: 5,
    dx: 0,
    dy: 0
};

const obstacles = [
    {
        name: 'normalObstacle',
        color: 'red',
        speed: 3 * obstacleSpeedMultiplier,
        size: 50,
        probability: 0.3 // 30%の確率で生成される
    },
    {
        name: 'fastObstacle',
        color: 'green',
        speed: 7 * obstacleSpeedMultiplier,
        size: 30,
        probability: 0.2 // 20%の確率で生成される
    },
    {
        name: 'slowObstacle',
        color: 'gray',
        speed: 1 * obstacleSpeedMultiplier,
        size: 80,
        probability: 0.2 // 20%の確率で生成される
    },
    {
        name: 'bulletObstacle',
        color: 'black',
        speed: 15 * obstacleSpeedMultiplier,
        radius: 3,
        probability: 0.2 // 20%の確率で生成される
    },
    {
        name: 'trackingEnemy',
        color: 'purple',
        speed: 1.5 * obstacleSpeedMultiplier,
        size: 40,
        probability: 0.1, // 10%の確率で生成される
        duration: 5000 // 10秒間存在する
    }
];

const abilities = [
    {
        id: "invincible",
        name: "無敵",
        description: "10秒間周囲の障害物を消すことができる。",
        duration: 10,
        action: () => activateInvincibleMode()
    },
    {
        id: "slowdown",
        name: "スローダウン",
        description: "30秒間障害物のスピードを遅くすることができる。",
        duration: 30,
        multiplier: 0.2,
        action: () => activateSlowdownMode()
    }
];

/* Ability Template

{
    id: "ENTER THE ID",
    name: "ENTER THE JAPANESE NAME",
    description: "ENTER THE DESCRIPTION",
    duration: DURATION,
    action: () => DO_THIS_FUNCTION()
}

*/

let minObstacleFrequency = 10;
let obstacleFrequency = 100; // フレームごと

let interval = 10000;

let frameCount = 0;
let startTime = Date.now(); // ゲーム開始時刻
let levelUpTime = Date.now(); // レベルアップタイマー
let currentLevel = 1; // 現在のレベル

let abilityActive = false;
let abilityUsed = false;
let abilityEndTime = 0;

let selectedAbility = abilities[0];

let gameState = 'menu'; // ゲームの状態 ('menu' または 'playing')

const statusMessages = []; // ステータスメッセージの配列

function drawStatusMessages() {
    const lineHeight = 20; // メッセージごとの行間隔
    const margin = 10; // canvasの端からのマージン

    ctx.fillStyle = 'black';
    ctx.font = '16px Arial';

    // メッセージを上から順に描画
    for (let i = 0; i < statusMessages.length; i++) {
        const message = statusMessages[i].message;
        const y = canvas.height - margin - (statusMessages.length - i) * lineHeight;

        ctx.fillText(message, margin, y);
    }
}

function addStatusMessage(message) {
    // 新しいメッセージを配列の先頭に追加
    statusMessages.unshift({ message });

    // 5秒後にメッセージを削除するタイマーを設定
    setTimeout(() => {
        statusMessages.pop(); // 配列の末尾のメッセージを削除
    }, 5000);
}

function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    if (abilityActive) {
        switch(selectedAbility.id)
        {
            case "invincible":
                drawInvincibleCircle();
                break;
            case "slowdown":
                break;
        }   
    }
}

function drawObstacles() {
    obstacles.forEach(obstacle => {
        ctx.fillStyle = obstacle.color;
        if (obstacle.radius) {
            ctx.beginPath();
            ctx.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.size, obstacle.size);
        }
    });
}

function drawElapsedTime() {
    const currentTime = Date.now();
    const elapsedTime = ((currentTime - startTime) / 1000).toFixed(1); // 秒単位に変換
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`経過時間: ${elapsedTime}秒`, 10, 30);
}

function drawCurrentLevel() {
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`レベル: ${obstacleFrequency <= minObstacleFrequency ? "MAX" : currentLevel}`, 10, 60);
}

function drawInvincibleCircle() {
    const radius = 100;
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)'; // 青色の半透明円
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawMenu() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.font = '40px Arial';
    ctx.fillText('メインメニュー', canvas.width / 2 - 120, canvas.height / 2 - 20);
    ctx.font = '20px Arial';
    ctx.fillText('Press Enter to Start', canvas.width / 2 - 100, canvas.height / 2 + 20);
}

function movePlayer() {
    player.x += player.dx;
    player.y += player.dy;

    // 境界チェック
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
}

function moveObstacles() {
    obstacles.forEach(obstacle => {
        if (obstacle.name === 'trackingEnemy') {
            const dx = player.x - obstacle.x;
            const dy = player.y - obstacle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            obstacle.dx = (dx / distance) * obstacle.speed;
            obstacle.dy = (dy / distance) * obstacle.speed;
        }

        obstacle.x += obstacle.dx;
        obstacle.y += obstacle.dy;
    });

    // 画面外の障害物を削除
    obstacles.forEach((obstacle, index) => {
        if (obstacle.radius) {
            // 円形の障害物の画面外判定
            if (
                obstacle.x + obstacle.radius < 0 ||
                obstacle.x - obstacle.radius > canvas.width ||
                obstacle.y + obstacle.radius < 0 ||
                obstacle.y - obstacle.radius > canvas.height
            ) {
                obstacles.splice(index, 1);
            }
        } else {
            // 四角形の障害物の画面外判定
            if (
                obstacle.x > canvas.width ||
                obstacle.x + obstacle.size < 0 ||
                obstacle.y > canvas.height ||
                obstacle.y + obstacle.size < 0
            ) {
                obstacles.splice(index, 1);
            }
        }
    });
}

function createObstacle() {
    const randomNumber = Math.random();
    let cumulativeProbability = 0;

    for (let i = 0; i < obstacles.length; i++) {
        cumulativeProbability += obstacles[i].probability;

        if (randomNumber <= cumulativeProbability) {
            const obstacleType = obstacles[i];
            console.log(obstacleType)
            let x, y, dx, dy;

            if (obstacleType.radius) {
                const radius = obstacleType.radius;
                const speed = obstacleType.speed * obstacleSpeedMultiplier;
                const direction = Math.random() * Math.PI * 2; // ランダムな方向

                // 軌道に沿って一定の遅延を持って生成
                setTimeout(() => {
                    x = canvas.width / 2 + Math.cos(direction) * (canvas.width / 2 + radius);
                    y = canvas.height / 2 + Math.sin(direction) * (canvas.height / 2 + radius);
                    dx = -Math.cos(direction) * speed;
                    dy = -Math.sin(direction) * speed;

                    obstacles.push({ ...obstacleType, x, y, dx, dy });
                    
                }, 3000); // 3秒後に生成
            } else {
                const size = obstacleType.size;
                const speed = obstacleType.speed * obstacleSpeedMultiplier;
                const direction = Math.floor(Math.random() * 4); // 0: 上, 1: 右, 2: 下, 3: 左

                switch (direction) {
                    case 0: // 上から
                        x = Math.random() * (canvas.width - size);
                        y = -size;
                        dx = 0;
                        dy = speed;
                        break;
                    case 1: // 右から
                        x = canvas.width;
                        y = Math.random() * (canvas.height - size);
                        dx = -speed;
                        dy = 0;
                        break;
                    case 2: // 下から
                        x = Math.random() * (canvas.width - size);
                        y = canvas.height;
                        dx = 0;
                        dy = -speed;
                        break;
                    case 3: // 左から
                        x = -size;
                        y = Math.random() * (canvas.height - size);
                        dx = speed;
                        dy = 0;
                        break;
                }

                const newObstacle = { ...obstacleType, x, y, dx, dy };
                obstacles.push(newObstacle);

                // 追尾型の敵の場合、10秒後に消えるタイマーを設定
                if (obstacleType.name === 'trackingEnemy') {
                    setTimeout(() => {
                        const index = obstacles.findIndex(ob => ob === newObstacle);
                        if (index !== -1) obstacles.splice(index, 1);
                    }, obstacleType.duration);
                }
            }

            return; // 生成したら終了
        }
    }
}


function detectCollision() {
    obstacles.forEach(obstacle => {
        if (obstacle.radius) {
            const distance = Math.sqrt(
                Math.pow(player.x - obstacle.x, 2) + Math.pow(player.y - obstacle.y, 2)
            );
            if (distance < player.width / 2 + obstacle.radius) {
                document.location.reload();
            }
        } else {
            if (
                player.x < obstacle.x + obstacle.size &&
                player.x + player.width > obstacle.x &&
                player.y < obstacle.y + obstacle.size &&
                player.y + player.height > obstacle.y
            ) {
                document.location.reload();
            }
        }
    });
}

function AbilityUpdate()
{
    switch(selectedAbility.id)
    {
        case "invincible":
            removeSurroundingObstacles();
            break;
        case "slowdown":
            console.log(obstacleSpeedMultiplier)
            break;
    }
}

function OnAbilityEnd()
{
    switch (selectedAbility.id)
    {
        case "invincible":
            addStatusMessage("無敵モードが無効になりました。");
            break;
        case "slowdown":
            addStatusMessage("スローダウンが無効になりました。");
            obstacleSpeedMultiplier = DEFAULT_MULTIPLIER;
            break;
    }
}

function update() {
    movePlayer();
    moveObstacles();
    detectCollision();

    // 新しい障害物を生成
    if (frameCount % obstacleFrequency === 0) {
        createObstacle();
    }

    // 無敵モードがアクティブな場合、周囲の障害物を削除
    if (abilityActive) {
        if (Date.now() >= abilityEndTime) {
            abilityActive = false;
            OnAbilityEnd()
        }

        AbilityUpdate()
    }

    frameCount++;

    const currentTime = Date.now();
    if (currentTime - levelUpTime >= interval) { // 10秒ごとに
        levelUp();
        levelUpTime = currentTime; // レベルアップタイマーリセット
    }
}

function levelUp() {
    obstacleFrequency = Math.max(minObstacleFrequency, obstacleFrequency - 5); // obstacleFrequencyを減少させ、最小値を1に設定
    currentLevel++; // レベルを1増加
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'menu') {
        drawMenu();
    } else if (gameState === 'playing') {
        drawPlayer();
        drawObstacles();
        drawElapsedTime();
        drawCurrentLevel(); // 現在のレベルを描画
        drawStatusMessages();
    }
}

function loop() {
    if (gameState === 'playing') {
        update();
    }
    draw();
    requestAnimationFrame(loop);
}

function keyDown(e) {
    if (gameState === 'menu') {
        if (e.key === 'Enter') {
            gameState = 'playing';
            startTime = Date.now(); // ゲーム開始時刻をリセット
            document.getElementById('ability_selector').disabled = true;
        }
    } else if (gameState === 'playing') {
        if (e.key === 'ArrowRight' || e.key === 'Right') {
            player.dx = player.speed;
        } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
            player.dx = -player.speed;
        } else if (e.key === 'ArrowUp' || e.key === 'Up') {
            player.dy = -player.speed;
        } else if (e.key === 'ArrowDown' || e.key === 'Down') {
            player.dy = player.speed;
        } else if ((e.key === 'u' || e.key === 'U') && !abilityUsed) {
            selectedAbility.action();
        } else if (e.key === 'x' || e.key === "X") {
            console.log("緊急回避！")
            document.body.innerHTML = '';
            document.title = "ClassRoom"
            window.location.href = "https://classroom.google.com/h";
        }
    }
}

function keyUp(e) {
    if (gameState === 'playing') {
        if (
            e.key === 'ArrowRight' ||
            e.key === 'Right' ||
            e.key === 'ArrowLeft' ||
            e.key === 'Left' ||
            e.key === 'ArrowUp' ||
            e.key === 'Up' ||
            e.key === 'ArrowDown' ||
            e.key === 'Down'
        ) {
            player.dx = 0;
            player.dy = 0;
        }
    }
}

function activateInvincibleMode() {
    abilityActive = true;
    abilityUsed = true;
    abilityEndTime = Date.now() + abilities[0].duration * 1000; // 10秒間の無敵

    addStatusMessage("無敵モード ON!")
}

function activateSlowdownMode() {
    abilityActive = true;
    abilityUsed = true;
    obstacleSpeedMultiplier = abilities[1].multiplier;
    abilityEndTime = Date.now() + abilities[1].duration * 1000; // 30秒間の無敵

    obstacles.forEach(obstacle => function() {
        obstacle.speed *= obstacleSpeedMultiplier;
    });

    addStatusMessage("スローダウン ON!")
}

function removeSurroundingObstacles() {
    const radius = 100;
    obstacles.forEach((obstacle, index) => {
        if (obstacle.radius) {
            const distance = Math.sqrt(
                Math.pow(player.x + player.width / 2 - obstacle.x, 2) + Math.pow(player.y + player.height / 2 - obstacle.y, 2)
            );
            if (distance < radius + obstacle.radius) {
                obstacles.splice(index, 1);
            }
        } else {
            const distanceX = Math.abs(player.x + player.width / 2 - (obstacle.x + obstacle.size / 2));
            const distanceY = Math.abs(player.y + player.height / 2 - (obstacle.y + obstacle.size / 2));
            if (distanceX < radius + obstacle.size / 2 && distanceY < radius + obstacle.size / 2) {
                obstacles.splice(index, 1);
            }
        }
    });
}

document.addEventListener('keydown', keyDown);
document.addEventListener('keyup', keyUp);

// ページロード時に実行する関数
function populateAbilityOptions() {
    const abilitySelector = document.getElementById('ability_selector');
    const descriptionLabel = document.getElementById('description');

    abilities.forEach(ability => {
        const option = document.createElement('option');
        option.value = ability.name;
        option.text = ability.name;
        abilitySelector.appendChild(option);
    });

    // 初期選択肢の説明を設定
    descriptionLabel.innerHTML = abilities[0].description;

    // 選択変更時に説明を更新
    abilitySelector.addEventListener('change', () => {
        const changedAbility = abilities.find(ability => ability.name === abilitySelector.value);
        descriptionLabel.innerHTML = changedAbility.description;
        selectedAbility = changedAbility;
    });
}

// ページロード時に関数を呼び出し
window.onload = populateAbilityOptions;

loop();