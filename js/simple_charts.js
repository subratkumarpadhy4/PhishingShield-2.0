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

        // 1. FREEZE DIMENSIONS
        // Read explicitly from HTML attributes (e.g. width="160")
        const logicalWidth = parseInt(canvas.getAttribute("width")) || 200;
        const logicalHeight = parseInt(canvas.getAttribute("height")) || 200;
        const dpr = window.devicePixelRatio || 1;

        // Force CSS to match logical size exactly (prevents layout stretching)
        canvas.style.setProperty('width', logicalWidth + "px", 'important');
        canvas.style.setProperty('height', logicalHeight + "px", 'important');
        // Prevent max-width: 100% issues common in frameworks
        canvas.style.setProperty('max-width', logicalWidth + "px", 'important');
        canvas.style.setProperty('max-height', logicalHeight + "px", 'important');

        // Set high-res buffer
        canvas.width = logicalWidth * dpr;
        canvas.height = logicalHeight * dpr;

        // Get Context and Scale ONCE
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // Pre-calculate geometry (Static) - Pie Chart Style
        const centerX = logicalWidth / 2;
        const centerY = logicalHeight / 2;
        const radius = (Math.min(logicalWidth, logicalHeight) / 2) * 0.80; // 80% of canvas for clean spacing
        const innerRadius = radius * 0.65; // 65% ensures a "Rigid Ring" look
        const total = data.reduce((a, b) => a + b, 0);

        // Clone for event listener clean-swap
        const newCanvas = canvas.cloneNode(true);
        canvas.parentNode.replaceChild(newCanvas, canvas);

        // Re-contextualize the clone (since we replaced the element)
        const ctx2 = newCanvas.getContext('2d');
        ctx2.scale(dpr, dpr);

        // --- DRAWING FUNCTION ---
        // Absolutely no logic that changes size/radius
        const draw = (hoverIndex = -1) => {
            ctx2.clearRect(0, 0, logicalWidth, logicalHeight);

            let startAngle = -0.5 * Math.PI;

            // BACKGROUND CIRCLE (Empty State) - Now a Ring
            if (total === 0) {
                ctx2.beginPath();
                ctx2.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                ctx2.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI, true); // Cutout
                ctx2.fillStyle = '#f1f5f9';
                ctx2.fill();

                // Static Text
                drawCenterText("No Data", "Scanned");
                return [];
            }

            // PIE CHART SEGMENTS - Filled slices (Ring)
            const segments = [];
            data.forEach((value, i) => {
                if (value === 0) {
                    startAngle += (value / total) * 2 * Math.PI;
                    return;
                }

                const sliceAngle = (value / total) * 2 * Math.PI;
                const endAngle = startAngle + sliceAngle;

                segments.push({
                    start: startAngle,
                    end: endAngle,
                    color: colors[i],
                    val: value,
                    label: labels ? labels[i] : ''
                });

                // Draw filled ring segment
                ctx2.beginPath();
                ctx2.arc(centerX, centerY, radius, startAngle, endAngle); // Outer Arc
                ctx2.arc(centerX, centerY, innerRadius, endAngle, startAngle, true); // Inner Arc (Reverse)
                ctx2.closePath();
                ctx2.fillStyle = colors[i % colors.length];
                ctx2.fill();

                // Add subtle border between segments
                ctx2.strokeStyle = '#ffffff';
                ctx2.lineWidth = 2;
                ctx2.stroke();

                startAngle = endAngle;
            });

            // CENTER TEXT
            if (hoverIndex !== -1) {
                const seg = segments[hoverIndex];
                const pct = Math.round((seg.val / total) * 100) + "%";
                drawCenterText(pct, seg.label);
            } else {
                drawCenterText(centerVal || total, centerLabel || "Threats");
            }

            return segments;
        };

        const drawCenterText = (mainText, subText) => {
            ctx2.textAlign = 'center';
            ctx2.textBaseline = 'middle';

            // Clean, simple text
            ctx2.fillStyle = '#1e293b';
            ctx2.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx2.fillText(String(mainText), centerX, centerY - 6);

            ctx2.fillStyle = '#64748b';
            ctx2.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx2.fillText(subText.toUpperCase(), centerX, centerY + 14);
        };

        // --- EVENTS ---
        let segments = draw(); // Initial Draw

        newCanvas.addEventListener('mousemove', (e) => {
            const rect = newCanvas.getBoundingClientRect();
            // Map mouse coordinates to Canvas Logical Space
            const x = (e.clientX - rect.left) * (logicalWidth / rect.width);
            const y = (e.clientY - rect.top) * (logicalHeight / rect.height);

            // Distance for pie slice detection
            const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

            let found = -1;
            // Hitbox - check if inside pie circle (and outside hole)
            if (dist <= radius && dist >= innerRadius) {
                let angle = Math.atan2(y - centerY, x - centerX);
                if (angle < -0.5 * Math.PI) angle += 2 * Math.PI;

                segments.forEach((seg, i) => {
                    if (angle >= seg.start && angle < seg.end) {
                        found = i;
                    }
                });
            }

            // Update Interface (Cursor & Text ONLY)
            newCanvas.style.cursor = found !== -1 ? 'pointer' : 'default';
            const lastHover = parseInt(newCanvas.dataset.hover || "-1");
            if (lastHover !== found) {
                newCanvas.dataset.hover = found;
                draw(found); // Redraw with new text
            }
        });

        newCanvas.addEventListener('mouseleave', () => {
            newCanvas.dataset.hover = "-1";
            draw(-1);
        });
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
