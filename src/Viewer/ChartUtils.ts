export type LabelContent = [string, string | number, string?, (string | number)?, string?, number?][];

export function getColorForValue(value: number, min: number, max: number): string {
    const normalizedValue = (value - min) / (max - min);
    const hue = normalizedValue * 120; // 0 (red) to 120 (green)
    return `hsl(${hue}, 100%, 50%)`;
}

export function createLabelCanvas(content: LabelContent, width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.clearRect(0, 0, width, height);
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Find the maximum width of the keys for alignment
    const keyWidth = Math.max(...content.map(([key]) => ctx.measureText(key + ':').width));

    let y = 5;
    content.forEach(([key, value, color, compValue, compColor, diffPercent]) => {
        ctx.fillStyle = 'black';
        ctx.fillText(key, 5, y);

        ctx.fillStyle = color || 'black';
        ctx.fillText(value.toString(), keyWidth + 10, y);

        if (compValue !== undefined) {
            ctx.fillStyle = compColor || 'black';
            ctx.fillText(`vs ${compValue.toString()}`, keyWidth + 100, y);
        }

        if (diffPercent !== undefined) {
            ctx.fillStyle = getColorForValue(diffPercent, -100, 100);
            ctx.fillText(diffPercent.toFixed(0) + '%', keyWidth + 200, y);
        }

        y += 15;
    });

    return canvas;
}