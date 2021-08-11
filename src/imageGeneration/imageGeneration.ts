import Canvas from "canvas";

namespace ImageGeneration {
    Canvas.registerFont(process.cwd() + "/assets/font/arial-unicode-ms.ttf", { family: "myFont" });

    export async function showXp(options: ImageGenerationShowXpData): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            let canvas = Canvas.createCanvas(1110, 540);
            let ctx = canvas.getContext("2d");

            ctx.font = "90px myFont";

            const { width: textWidth } = ctx.measureText(`${options.username}`);

            canvas.width = 1110 + (textWidth - 531 > 0 ? textWidth - 531 : 0);

            ctx.fillStyle = "#23272A";
            ctx.textBaseline = "hanging";

            roundedRect(ctx, 0, 0, 1110 + (textWidth - 531 > 0 ? textWidth - 531 : 0), 540, 30);

            await drawCircle();

            drawText();

            resolve(canvas.toBuffer("image/png"));

            async function drawCircle() {
                return new Promise<void>((resolve, reject) => {
                    ctx.fillStyle = "white";
                    ctx.strokeStyle = "blue";
                    ctx.lineWidth = 15;
                    ctx.beginPath();
                    ctx.arc(252, 234, 201, Math.PI * 1.5, Math.PI * (1.5 + options.lvlPassRatio * 2), false);
                    ctx.stroke();
                    ctx.closePath();
                    ctx.beginPath();
                    ctx.arc(252, 234, 192, 0, Math.PI * 2, true);
                    ctx.fill();
                    ctx.save();
                    ctx.clip();
                    ctx.closePath();

                    const PP = new Canvas.Image();
                    PP.src = options.PPUrl;
                    PP.onload = () => {
                        ctx.drawImage(PP, 60, 42, 384, 384);
                        ctx.restore();
                        resolve();
                    };
                });
            }

            function drawText() {
                ctx.font = "36px myFont";
                ctx.fillText(`Xp: ${options.xp} / ${options.nextLvlXp}`, 138, 459);

                ctx.font = "90px myFont";
                ctx.fillText(`${options.username}`, 531, 99);

                ctx.font = "60px myFont";
                ctx.fillText(`Rank: #${options.rank}  Lvl ${options.level}`, 531, 336);
            }
        });
    }

    export function lvlPass(options: {}) {}
}

function roundedRect(ctx: Canvas.NodeCanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x, y + radius);
    ctx.lineTo(x, y + height - radius);
    ctx.arcTo(x, y + height, x + radius, y + height, radius);
    ctx.lineTo(x + width - radius, y + height);
    ctx.arcTo(x + width, y + height, x + width, y + height - radius, radius);
    ctx.lineTo(x + width, y + radius);
    ctx.arcTo(x + width, y, x + width - radius, y, radius);
    ctx.lineTo(x + radius, y);
    ctx.arcTo(x, y, x, y + radius, radius);
    ctx.fill();
}

export default ImageGeneration;
