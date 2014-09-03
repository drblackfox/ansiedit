function customBrushTool(editor, toolbar) {
    "use strict";
    var canvas, ctx, stampImageData, stampCanvas, stampX, stampY, lastPoint;

    function createCanvas() {
        canvas = ElementHelper.create("canvas", {"width": editor.getColumns() * editor.codepage.fontWidth, "height": editor.getRows() * editor.codepage.fontHeight, "style": {"opacity": "0.8"}});
        ctx = canvas.getContext("2d");
    }

    function clearStamp() {
        if (stampCanvas) {
            ctx.clearRect((stampX - Math.floor(stampImageData.width / 2)) * editor.codepage.fontWidth, (stampY - Math.floor(stampImageData.height / 2)) * editor.codepage.fontHeight, stampCanvas.width, stampCanvas.height);
        }
    }

    function redrawStamp(textX, textY) {
        clearStamp();
        if (stampCanvas) {
            ctx.drawImage(stampCanvas, (textX - Math.floor(stampImageData.width / 2)) * editor.codepage.fontWidth, (textY - Math.floor(stampImageData.height / 2)) * editor.codepage.fontHeight);
        }
        stampX = textX;
        stampY = textY;
    }

    function useStamp(block, ignoreTransparency) {
        editor.putImageData(stampImageData, block.textX - Math.floor(stampImageData.width / 2), block.textY - Math.floor(stampImageData.height / 2), ignoreTransparency);
    }

    function canvasMove(coord) {
        redrawStamp(coord.textX, coord.textY);
    }

    function canvasDown(coord) {
        if (stampCanvas) {
            editor.startOfDrawing(editor.UNDO_CHUNK);
            if (coord.shiftKey && lastPoint) {
                editor.blockLine(lastPoint, coord, function (block) {
                    useStamp(block, !coord.altKey);
                });
            } else {
                useStamp(coord, !coord.altKey);
            }
            lastPoint = coord;
        }
    }

    function canvasDrag(coord) {
        if (lastPoint) {
            editor.blockLine(lastPoint, coord, function (block) {
                useStamp(block, !coord.altKey);
            });
            lastPoint = coord;
        }
    }

    function canvasOut() {
        clearStamp();
        stampX = undefined;
        stampY = undefined;
    }

    function changeBrush(imageData) {
        clearStamp();
        stampImageData = imageData;
        if (stampImageData) {
            stampCanvas = editor.renderImageData(stampImageData, true);
            toolbar.giveFocus("custom-brush");
        } else {
            stampCanvas = undefined;
        }
    }

    function flipBrushX() {
        var newStampImageData, x, y, block, index, newIndex;
        if (stampImageData) {
            newStampImageData = {"width": stampImageData.width, "height": stampImageData.height, "data": new Uint8Array(stampImageData.data.length)};
            for (y = 0; y < stampImageData.height; ++y) {
                for (x = 0; x < stampImageData.width; ++x) {
                    index = (y * stampImageData.width + x) * 3;
                    block = stampImageData.data.subarray(index, index + 3);
                    block[0] = editor.codepage.getFlippedTextX(block[0]);
                    newIndex = (y * stampImageData.width + (stampImageData.width - (x + 1))) * 3;
                    newStampImageData.data.set(block, newIndex);
                }
            }
            toolbar.giveFocus("custom-brush");
            stampImageData = newStampImageData;
            stampCanvas = editor.renderImageData(stampImageData, true);
            if (stampX && stampY) {
                redrawStamp(stampX, stampY);
            }
            editor.fireCustomEvent("custom-brush", {"operation": "changed", "imageData": stampImageData});
            toolbar.flashGreen("flip-brush-x");
        } else {
            toolbar.flashRed("flip-brush-x");
        }
    }

    function flipBrushY() {
        var newStampImageData, x, y, block, index, newIndex;
        if (stampImageData) {
            newStampImageData = {"width": stampImageData.width, "height": stampImageData.height, "data": new Uint8Array(stampImageData.data.length)};
            for (x = 0; x < stampImageData.width; ++x) {
                for (y = 0; y < stampImageData.height; ++y) {
                    index = (y * stampImageData.width + x) * 3;
                    block = stampImageData.data.subarray(index, index + 3);
                    block[0] = editor.codepage.getFlippedTextY(block[0]);
                    newIndex = ((stampImageData.height - (y + 1)) * stampImageData.width + x) * 3;
                    newStampImageData.data.set(block, newIndex);
                }
            }
            toolbar.giveFocus("custom-brush");
            stampImageData = newStampImageData;
            stampCanvas = editor.renderImageData(stampImageData, true);
            if (stampX && stampY) {
                redrawStamp(stampX, stampY);
            }
            editor.fireCustomEvent("custom-brush", {"operation": "changed", "imageData": stampImageData});
            toolbar.flashGreen("flip-brush-y");
        } else {
            toolbar.flashRed("flip-brush-y");
        }
    }

    editor.addCustomEventListener("custom-brush", function (evt) {
        switch (evt.operation) {
        case "load":
            changeBrush(evt.imageData);
            break;
        case "flipx":
            flipBrushX();
            break;
        case "flipy":
            flipBrushY();
            break;
        default:
        }
    });

    function blinkModeChange(noblink) {
        var i;
        if (!noblink && stampImageData !== undefined) {
            for (i = 2; i < stampImageData.data.length; i += 3) {
                if (stampImageData.data[i] >= 8) {
                    stampImageData.data[i] -= 8;
                }
            }
            stampCanvas = editor.renderImageData(stampImageData, true);
            if (stampX && stampY) {
                redrawStamp(stampX, stampY);
            }
            editor.fireCustomEvent("custom-brush", {"operation": "changed", "imageData": stampImageData});
        }
    }

    createCanvas();

    editor.addSetImageListener(createCanvas);
    editor.addBlinkModeChangeListener(blinkModeChange);

    function init() {
        editor.addMouseMoveListener(canvasMove);
        editor.addMouseDownListener(canvasDown);
        editor.addMouseDragListener(canvasDrag);
        editor.addMouseOutListener(canvasOut);
        editor.addOverlay(canvas, "custom-brush", function () {
            return canvas;
        }, 1);
        return true;
    }

    function getState() {
        var output, i;
        if (stampImageData !== undefined) {
            output = [];
            output.push(stampImageData.width & 0xff);
            output.push(stampImageData.width >> 8);
            output.push(stampImageData.height & 0xff);
            output.push(stampImageData.height >> 8);
            for (i = 0; i < stampImageData.data.length; i += 1) {
                output.push(stampImageData.data[i]);
            }
            return output;
        }
        return [];
    }

    function setState(bytes) {
        stampImageData = {
            "width": bytes[0] + (bytes[1] << 8),
            "height": bytes[2] + (bytes[3] << 8),
            "data": bytes.subarray(4, bytes.length)
        };
        editor.fireCustomEvent("custom-brush", {"operation": "changed", "imageData": stampImageData});
        stampCanvas = editor.renderImageData(stampImageData, true);
    }

    function remove() {
        editor.removeMouseMoveListener(canvasMove);
        editor.removeMouseDragListener(canvasDrag);
        editor.removeMouseDownListener(canvasDown);
        editor.removeMouseOutListener(canvasOut);
        editor.removeOverlay("custom-brush");
    }

    function toString() {
        return "Custom Brush";
    }

    return {
        "init": init,
        "getState": getState,
        "setState": setState,
        "remove": remove,
        "toString": toString,
        "uid": "custom-brush"
    };
}

AnsiEditController.addTool(customBrushTool, "tools-right", 112);