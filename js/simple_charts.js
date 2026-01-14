/**
 * SimpleCharts.js v2.0 (Frozen-State)
 * A visually strictly charting library.
 * 
 * CORE PRINCIPLE:
 * The canvas Dimensions are fixed by HTML attributes (width/height).
 * The library NEVER reads the DOM layout (getBoundingClientRect) to determine size.
 * This prevents flexbox jitter/subpixel expansion.
 */

const SimpleCharts = {
    /**
     * Draw a Doughnut Chart
     */
    doughnut: function (canvasId, data, colors, labels, centerVal, centerLabel) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        // 1. INITIAL SETUP (Only once)
        if (!canvas.isInitialized) {
            // Freeze Dimensions
            const logicalWidth = parseInt(canvas.getAttribute("width")) || 200;
            const logicalHeight = parseInt(canvas.getAttribute("height")) || 200;
            const dpr = window.devicePixelRatio || 1;

            // CSS Lock
            canvas.style.setProperty('width', logicalWidth + "px", 'important');
            canvas.style.setProperty('height', logicalHeight + "px", 'important');
            canvas.style.setProperty('max-width', logicalWidth + "px", 'important');
            canvas.style.setProperty('max-height', logicalHeight + "px", 'important');

            // Buffer Size
            canvas.width = logicalWidth * dpr;
            canvas.height = logicalHeight * dpr;

            // Context
            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);

            // Geometry
            const centerX = logicalWidth / 2;
            const centerY = logicalHeight / 2;
            const radius = (Math.min(logicalWidth, logicalHeight) / 2) * 0.80;
            const innerRadius = radius * 0.65;

            // State Storage
            canvas.chartState = {
                data: [], colors: [], labels: [], centerVal: 0, centerLabel: '',
                segments: [], hoverIndex: -1
            };

            // --- DRAW FUNCTION ---
            canvas.redraw = () => {
                const state = canvas.chartState;
                const total = state.data.reduce((a, b) => a + b, 0);

                ctx.clearRect(0, 0, logicalWidth, logicalHeight);

                let startAngle = -0.5 * Math.PI;
                state.segments = []; // Reset segments

                // EMPTY STATE
                if (total === 0) {
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI, true);
                    ctx.fillStyle = '#f1f5f9';
                    ctx.fill();
                    drawCenterText("No Data", "Scanned");
                    return;
                }

                // SEGMENTS
                state.data.forEach((value, i) => {
                    if (value === 0) return;

                    const sliceAngle = (value / total) * 2 * Math.PI;
                    const endAngle = startAngle + sliceAngle;

                    state.segments.push({
                        start: startAngle, end: endAngle,
                        val: value, label: state.labels ? state.labels[i] : ''
                    });

                    // Draw Segment
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
                    ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
                    ctx.closePath();
                    ctx.fillStyle = state.colors[i % state.colors.length];
                    ctx.fill();

                    // Border
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    startAngle = endAngle;
                });

                // CENTER TEXT
                if (state.hoverIndex !== -1 && state.segments[state.hoverIndex]) {
                    const seg = state.segments[state.hoverIndex];
                    const pct = Math.round((seg.val / total) * 100) + "%";
                    drawCenterText(pct, seg.label);
                } else {
                    drawCenterText(state.centerVal || total, state.centerLabel || "Threats");
                }
            };

            const drawCenterText = (main, sub) => {
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#1e293b';
                ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.fillText(String(main), centerX, centerY - 6);
                ctx.fillStyle = '#64748b';
                ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.fillText(sub.toUpperCase(), centerX, centerY + 14);
            };

            // --- LISTENERS ---
            canvas.addEventListener('mousemove', (e) => {
                const rect = canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) * (logicalWidth / rect.width);
                const y = (e.clientY - rect.top) * (logicalHeight / rect.height);
                const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

                let found = -1;
                // Hitbox check
                if (dist <= radius && dist >= innerRadius) {
                    let angle = Math.atan2(y - centerY, x - centerX);
                    if (angle < -0.5 * Math.PI) angle += 2 * Math.PI;

                    canvas.chartState.segments.forEach((seg, i) => {
                        if (angle >= seg.start && angle < seg.end) found = i;
                    });
                }

                if (canvas.chartState.hoverIndex !== found) {
                    canvas.chartState.hoverIndex = found;
                    canvas.style.cursor = found !== -1 ? 'pointer' : 'default';
                    canvas.redraw();
                }
            });

            canvas.addEventListener('mouseleave', () => {
                if (canvas.chartState.hoverIndex !== -1) {
                    canvas.chartState.hoverIndex = -1;
                    canvas.redraw();
                }
            });

            canvas.isInitialized = true;
        }

        // 2. UPDATE STATE & DRAW
        canvas.chartState.data = data;
        canvas.chartState.colors = colors;
        canvas.chartState.labels = labels;
        canvas.chartState.centerVal = centerVal;
        canvas.chartState.centerLabel = centerLabel;
        canvas.redraw();
    },

    /**
     * Render Line Chart
     */
    line: function (canvasId, data, color) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        // 1. FREEZE DIMENSIONS
        const logicalWidth = parseInt(canvas.getAttribute("width")) || 300;
        const logicalHeight = parseInt(canvas.getAttribute("height")) || 100;
        const dpr = window.devicePixelRatio || 1;

        canvas.style.width = logicalWidth + "px";
        canvas.style.height = logicalHeight + "px";
        canvas.width = logicalWidth * dpr;
        canvas.height = logicalHeight * dpr;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // Draw Loop
        const padding = 10;
        const drawW = logicalWidth - (padding * 2);
        const drawH = logicalHeight - (padding * 2);

        ctx.clearRect(0, 0, logicalWidth, logicalHeight);

        if (data.length < 2) return;

        const max = Math.max(...data, 10);
        const min = 0;

        const getX = (i) => padding + (i / (data.length - 1)) * drawW;
        const getY = (v) => logicalHeight - padding - ((v - min) / (max - min)) * drawH;

        // Path
        ctx.beginPath();
        data.forEach((v, i) => {
            if (i === 0) ctx.moveTo(getX(i), getY(v));
            else ctx.lineTo(getX(i), getY(v));
        });

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Dots
        data.forEach((v, i) => {
            ctx.beginPath();
            ctx.arc(getX(i), getY(v), 3, 0, 2 * Math.PI);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.stroke();
        });
    }
};
