function shadedPaletteTool(editor) {
    "use strict";
    var currentColor, lastPoint, canvas, selectionCanvas, ctx, imageData, shadedPaletteCanvases, selection;

    function updateCanvas() {
        ctx.drawImage(shadedPaletteCanvases[currentColor], 0, 0);
        if (selection !== undefined) {
            if (selection.color === currentColor) {
                ctx.drawImage(selectionCanvas, selection.x * editor.codepage.fontWidth * 8, selection.y * editor.codepage.fontHeight);
            }
        }
    }

    function colorChange(col) {
        var extendedPaletteCtx, imageData, i, bg, y, noblink;
        noblink = editor.getBlinkStatus();
        if (shadedPaletteCanvases[col] === undefined) {
            shadedPaletteCanvases[col] = ElementHelper.create("canvas", {"width": canvas.width, "height": canvas.height});
            extendedPaletteCtx = shadedPaletteCanvases[col].getContext("2d");
            imageData = extendedPaletteCtx.createImageData(editor.codepage.fontWidth, editor.codepage.fontHeight);
            for (bg = 0, y = 0; bg < 8; bg++) {
                if (col !== bg) {
                    imageData.data.set(editor.codepage.bigFont(editor.codepage.DARK_SHADE, col, bg));
                    for (i = 0; i < 8; i++) {
                        extendedPaletteCtx.putImageData(imageData, i * editor.codepage.fontWidth, y);
                    }
                    imageData.data.set(editor.codepage.bigFont(editor.codepage.MEDIUM_SHADE, col, bg));
                    for (i = 8; i < 16; i++) {
                        extendedPaletteCtx.putImageData(imageData, i * editor.codepage.fontWidth, y);
                    }
                    imageData.data.set(editor.codepage.bigFont(editor.codepage.LIGHT_SHADE, col, bg));
                    for (i = 16; i < 24; i++) {
                        extendedPaletteCtx.putImageData(imageData, i * editor.codepage.fontWidth, y);
                    }
                    y += editor.codepage.fontHeight;
                }
            }
            if (col < 8 || noblink) {
                for (bg = 8; bg < 16; bg++) {
                    if (col !== bg) {
                        imageData.data.set(editor.codepage.bigFont(editor.codepage.LIGHT_SHADE, bg, col));
                        for (i = 0; i < 8; i++) {
                            extendedPaletteCtx.putImageData(imageData, i * editor.codepage.fontWidth, y);
                        }
                        imageData.data.set(editor.codepage.bigFont(editor.codepage.MEDIUM_SHADE, bg, col));
                        for (i = 8; i < 16; i++) {
                            extendedPaletteCtx.putImageData(imageData, i * editor.codepage.fontWidth, y);
                        }
                        imageData.data.set(editor.codepage.bigFont(editor.codepage.DARK_SHADE, bg, col));
                        for (i = 16; i < 24; i++) {
                            extendedPaletteCtx.putImageData(imageData, i * editor.codepage.fontWidth, y);
                        }
                        y += editor.codepage.fontHeight;
                    }
                }
            } else {
                extendedPaletteCtx.fillStyle = "black";
                extendedPaletteCtx.fillRect(0, y, shadedPaletteCanvases[col].width, shadedPaletteCanvases[col].height - y);
            }
        }
        currentColor = col;
        updateCanvas();
    }

    function createSelectionCanvas() {
        var retina, canvas, ctx;
        retina = editor.getRetina();
        canvas = ElementHelper.create("canvas", {"width": editor.codepage.fontWidth * 8, "height": editor.codepage.fontHeight});
        ctx = canvas.getContext("2d");
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, retina ? 2 : 1);
        ctx.fillRect(0, canvas.height - (retina ? 2 : 1), canvas.width, retina ? 2 : 1);
        ctx.fillRect(0, 0, retina ? 2 : 1, canvas.height);
        ctx.fillRect(canvas.width - (retina ? 2 : 1), 0, retina ? 2 : 1, canvas.height);
        return canvas;
    }

    canvas = ElementHelper.create("canvas", {"width": editor.codepage.fontWidth * 24, "height": editor.codepage.fontHeight * 15, "style": {"border": "1px solid #444", "cursor": "crosshair"}});
    selectionCanvas = createSelectionCanvas();
    ctx = canvas.getContext("2d");
    imageData = ctx.createImageData(canvas.width, canvas.height);
    shadedPaletteCanvases = new Array(16);

    editor.addColorChangeListener(colorChange, false);

    function extendedPaletteBrush(block) {
        editor.setTextBlock(block, selection.code, selection.fg, selection.bg);
    }

    function sampleTextBlock(coord) {
        if (coord.charCode >= editor.codepage.LIGHT_SHADE && coord.charCode <= editor.codepage.DARK_SHADE) {
            if (coord.foreground < 8) {
                editor.setCurrentColor(coord.foreground);
                selection = {"color": coord.foreground, "x": editor.codepage.DARK_SHADE - coord.charCode, "y": coord.background - ((coord.background > coord.foreground) ? 1 : 0), "fg": coord.foreground, "bg": coord.background, "code": coord.charCode};
            } else {
                editor.setCurrentColor(coord.background);
                selection = {"color": coord.background, "x": coord.charCode - editor.codepage.LIGHT_SHADE, "y": coord.foreground - ((coord.foreground > coord.background) ? 1 : 0), "fg": coord.foreground, "bg": coord.background, "code": coord.charCode};
            }
            updateCanvas();
        }
    }

    function canvasDown(coord) {
        if (coord.ctrlKey) {
            sampleTextBlock(coord);
        } else if (selection !== undefined) {
            if (coord.shiftKey && lastPoint) {
                editor.startOfDrawing(editor.UNDO_CHUNK);
                editor.blockLine(lastPoint, coord, extendedPaletteBrush);
            } else {
                editor.startOfDrawing(editor.UNDO_FREEHAND);
                extendedPaletteBrush(coord);
            }
            lastPoint = coord;
        }
    }

    function canvasDrag(coord) {
        if (selection !== undefined) {
            editor.blockLine(lastPoint, coord, extendedPaletteBrush);
            lastPoint = coord;
        }
    }

    function onload() {
        colorChange(editor.getCurrentColor());
    }

    function getShading(value) {
        switch (value) {
        case 0:
            return editor.codepage.DARK_SHADE;
        case 1:
            return editor.codepage.MEDIUM_SHADE;
        case 2:
            return editor.codepage.LIGHT_SHADE;
        default:
            return undefined;
        }
    }

    function selectFromEvent(evt) {
        var retina, pos, x, y, otherCol;
        retina = editor.getRetina();
        pos = evt.currentTarget.getBoundingClientRect();
        x = Math.floor((evt.clientX - pos.left) / (editor.codepage.fontWidth * 8 / (retina ? 2 : 1)));
        y = Math.floor((evt.clientY - pos.top) / (editor.codepage.fontHeight / (retina ? 2 : 1)));
        otherCol = (y < currentColor) ? y : y + 1;
        if (otherCol < 8) {
            selection = {"color": currentColor, "x": x, "y": y, "fg": currentColor, "bg": otherCol, "code": getShading((otherCol < 8) ? x : (2 - x))};
            updateCanvas();
        } else if (editor.getBlinkStatus() || currentColor < 8) {
            selection = {"color": currentColor, "x": x, "y": y, "fg": otherCol, "bg": currentColor, "code": getShading((otherCol < 8) ? x : (2 - x))};
            updateCanvas();
        }
    }

    function mousedown(evt) {
        evt.preventDefault();
        selectFromEvent(evt);
    }

    function mousemove(evt) {
        var mouseButton;
        evt.preventDefault();
        mouseButton = (evt.buttons !== undefined) ? evt.buttons : evt.which;
        if (mouseButton) {
            evt.preventDefault();
            selectFromEvent(evt);
        }
    }

    function iceColorChange() {
        var i;
        for (i = 8; i < 16; i++) {
            delete shadedPaletteCanvases[i];
        }
        if (currentColor >= 8) {
            if (selection !== undefined) {
                if (selection.bg >= 8) {
                    selection = undefined;
                }
            }
            colorChange(currentColor);
        }
    }

    canvas.addEventListener("mousedown", mousedown, false);
    canvas.addEventListener("mousemove", mousemove, false);
    editor.addBlinkModeChangeListener(iceColorChange);

    function init() {
        editor.addMouseDownListener(canvasDown);
        editor.addMouseDragListener(canvasDrag);
        return true;
    }

    function remove() {
        editor.removeMouseDownListener(canvasDown);
        editor.removeMouseDragListener(canvasDrag);
    }

    function getState() {
        if (selection !== undefined) {
            return [selection.color, selection.x, selection.y, selection.fg, selection.bg, selection.code];
        }
        return [];
    }

    function setState(bytes) {
        selection = {"color": bytes[0], "x": bytes[1], "y": bytes[2], "fg": bytes[3], "bg": bytes[4], "code": bytes[5]};
        updateCanvas();
    }

    function toString() {
        return "Shaded Palette";
    }

    return {
        "onload": onload,
        "init": init,
        "remove": remove,
        "getState": getState,
        "setState": setState,
        "toString": toString,
        "canvas": canvas,
        "uid": "shaded-palette"
    };
}

AnsiEditController.addTool(shadedPaletteTool, "tools-left", 32);